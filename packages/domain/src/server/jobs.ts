/**
 * Generation job orchestration (A4): idempotent, rate limited, bounded.
 * Concurrent identical requests share one job and one set of model calls.
 */
import { randomUUID, createHash } from 'node:crypto';
import type { GenerationErrorCode, GenerationJob, Plan, UserPreferences } from '../schemas';

export type RateLimitConfig = { maxPerWindow: number; windowMs: number };

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly config: RateLimitConfig) {}

  /** Returns true if allowed and records the hit. */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.config.windowMs);
    if (recent.length >= this.config.maxPerWindow) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

/** Same owner + same preferences + same week → same job. */
export function idempotencyKey(ownerId: string, prefs: UserPreferences, weekOf: string): string {
  const canonical = JSON.stringify({ ownerId, weekOf, prefs: { ...prefs, exclusions: [...prefs.exclusions].sort() } });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export type Generator = (job: GenerationJob) => Promise<{ ok: true; plan: Plan; attempts: number } | { ok: false; code: GenerationErrorCode; attempts: number }>;

export class GenerationJobService {
  private readonly jobs = new Map<string, GenerationJob>();
  private readonly inflight = new Map<string, Promise<GenerationJob>>();
  private readonly userLimiter: RateLimiter;
  private readonly ipLimiter: RateLimiter;

  constructor(
    private readonly generate: Generator,
    limits: { perUser: RateLimitConfig; perIp: RateLimitConfig } = {
      perUser: { maxPerWindow: 10, windowMs: 3_600_000 },
      perIp: { maxPerWindow: 30, windowMs: 3_600_000 },
    },
    private readonly maxAttempts = 3,
  ) {
    this.userLimiter = new RateLimiter(limits.perUser);
    this.ipLimiter = new RateLimiter(limits.perIp);
  }

  /** Callers must pass an authenticated owner id; unauthenticated requests never reach here. */
  async request(ownerId: string, ip: string, key: string, now = new Date()): Promise<GenerationJob> {
    const scoped = `${ownerId}:${key}`;
    const existing = this.jobs.get(scoped);
    if (existing && existing.state !== 'failed' && existing.state !== 'timed_out') {
      return this.inflight.get(scoped) ?? existing;
    }
    if (!this.userLimiter.take(ownerId, now.getTime()) || !this.ipLimiter.take(ip, now.getTime())) {
      return {
        id: randomUUID(),
        ownerId,
        idempotencyKey: key,
        traceId: randomUUID(),
        state: 'failed',
        attempts: 0,
        maxAttempts: this.maxAttempts,
        createdAt: now.toISOString(),
        errorCode: 'rate_limited',
      };
    }
    const job: GenerationJob = {
      id: randomUUID(),
      ownerId,
      idempotencyKey: key,
      traceId: randomUUID(),
      state: 'running',
      attempts: 0,
      maxAttempts: this.maxAttempts,
      createdAt: now.toISOString(),
    };
    this.jobs.set(scoped, job);
    const run = this.generate(job).then(
      (result) => {
        job.attempts = result.attempts;
        if (result.ok) {
          job.state = 'succeeded';
          job.planId = result.plan.id;
        } else {
          job.state = result.code === 'timeout' ? 'timed_out' : 'failed';
          job.errorCode = result.code;
        }
        this.inflight.delete(scoped);
        return job;
      },
      () => {
        job.state = 'failed';
        job.errorCode = 'provider_error';
        this.inflight.delete(scoped);
        return job;
      },
    );
    this.inflight.set(scoped, run);
    return run;
  }
}
