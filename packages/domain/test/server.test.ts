import { describe, expect, it } from 'vitest';
import {
  GenerationJobService,
  MemoryReplayStore,
  NotFoundError,
  OwnerScopedStore,
  idempotencyKey,
  redact,
  signWebhook,
  verifyWebhook,
} from '../src/server';
import { FIXTURE_USERS, type Plan } from '../src';
import { NOW, planFor } from './helpers';

const SECRET = 'test-secret-not-real';
const t = Math.floor(NOW.getTime() / 1000);
const body = JSON.stringify({ id: 'evt_00000001', ownerId: 'user_a', event: { type: 'trial_started', productId: 'monthly', at: NOW.toISOString() } });

describe('webhook verification', () => {
  it('accepts a correctly signed, fresh event once', () => {
    const replay = new MemoryReplayStore();
    const r = verifyWebhook(body, signWebhook(body, SECRET, t), SECRET, replay, NOW);
    expect(r.ok).toBe(true);
  });
  it('rejects a replayed event', () => {
    const replay = new MemoryReplayStore();
    const header = signWebhook(body, SECRET, t);
    expect(verifyWebhook(body, header, SECRET, replay, NOW).ok).toBe(true);
    expect(verifyWebhook(body, header, SECRET, replay, NOW)).toMatchObject({ ok: false, reason: 'replay' });
  });
  it('rejects an invalid signature or tampered body', () => {
    const replay = new MemoryReplayStore();
    expect(verifyWebhook(body, signWebhook(body, 'wrong', t), SECRET, replay, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
    const tampered = body.replace('monthly', 'yearly');
    expect(verifyWebhook(tampered, signWebhook(body, SECRET, t), SECRET, replay, NOW)).toMatchObject({ ok: false, reason: 'bad_signature' });
    expect(verifyWebhook(body, undefined, SECRET, replay, NOW)).toMatchObject({ ok: false, reason: 'malformed_header' });
  });
  it('rejects an old timestamp', () => {
    expect(verifyWebhook(body, signWebhook(body, SECRET, t - 3600), SECRET, new MemoryReplayStore(), NOW)).toMatchObject({ ok: false, reason: 'stale' });
  });
});

describe('owner-scoped storage', () => {
  const store = new OwnerScopedStore<Plan>();
  const planA = { ...planFor(), id: 'plan_a', ownerId: 'user_a' };
  store.put('user_a', planA);

  it('lets the owner read their plan', () => {
    expect(store.get('user_a', 'plan_a').id).toBe('plan_a');
  });
  it('user B cannot read, list, overwrite, or delete user A’s plan', () => {
    expect(() => store.get('user_b', 'plan_a')).toThrow(NotFoundError);
    expect(store.list('user_b')).toEqual([]);
    expect(() => store.put('user_b', { ...planA, ownerId: 'user_b' })).toThrow(NotFoundError);
    expect(() => store.delete('user_b', 'plan_a')).toThrow(NotFoundError);
  });
  it('a request cannot write a row for a different owner id', () => {
    expect(() => store.put('user_b', { ...planA, id: 'plan_x' })).toThrow(NotFoundError);
  });
  it('account deletion removes every row for the owner', () => {
    const s = new OwnerScopedStore<Plan>();
    s.put('user_a', planA);
    s.put('user_a', { ...planA, id: 'plan_a2' });
    s.put('user_c', { ...planA, id: 'plan_c', ownerId: 'user_c' });
    expect(s.deleteAllFor('user_a')).toBe(2);
    expect(s.list('user_a')).toEqual([]);
    expect(s.list('user_c')).toHaveLength(1);
  });
});

describe('generation jobs', () => {
  const prefs = FIXTURE_USERS.valid!.preferences;

  it('20 concurrent identical requests run one generation', async () => {
    let calls = 0;
    const svc = new GenerationJobService(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return { ok: true, plan: planFor(), attempts: 1 };
    });
    const key = idempotencyKey('user_a', prefs, '2026-09-28');
    const jobs = await Promise.all(Array.from({ length: 20 }, () => svc.request('user_a', '1.2.3.4', key, NOW)));
    expect(calls).toBe(1);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(1);
    expect(jobs[0]!.state).toBe('succeeded');
  });

  it('rate limits a user flooding with different requests', async () => {
    const svc = new GenerationJobService(async () => ({ ok: true, plan: planFor(), attempts: 1 }), {
      perUser: { maxPerWindow: 3, windowMs: 60_000 },
      perIp: { maxPerWindow: 100, windowMs: 60_000 },
    });
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await svc.request('user_a', 'ip', `key${i}`, NOW));
    expect(results.filter((j) => j.errorCode === 'rate_limited')).toHaveLength(2);
  });

  it('idempotency key ignores exclusion order but not content', () => {
    expect(idempotencyKey('u', { ...prefs, exclusions: ['a', 'b'] }, 'w')).toBe(idempotencyKey('u', { ...prefs, exclusions: ['b', 'a'] }, 'w'));
    expect(idempotencyKey('u', prefs, 'w')).not.toBe(idempotencyKey('v', prefs, 'w'));
  });

  it('trace ids contain no personal data', async () => {
    const svc = new GenerationJobService(async () => ({ ok: false, code: 'invalid_output', attempts: 3 }));
    const job = await svc.request('user_a', 'ip', 'k', NOW);
    expect(job.traceId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(job.state).toBe('failed');
  });
});

describe('log redaction', () => {
  it('removes email, allergy data, tokens, location, payment ids, and prompts', () => {
    const out = JSON.stringify(
      redact({
        email: 'person@example.com',
        exclusions: ['peanuts'],
        note: 'contact person@example.com with Bearer abcdefghijklmnop',
        headers: { authorization: 'Bearer abc' },
        location: { lat: 1, lng: 2 },
        transactionId: '1000000123',
        prompt: 'system prompt text',
        planId: 'plan_1',
      }),
    );
    expect(out).not.toMatch(/person@example|peanuts|abcdefghijklmnop|1000000123|system prompt text/u);
    expect(out).toMatch(/plan_1/u);
  });
});
