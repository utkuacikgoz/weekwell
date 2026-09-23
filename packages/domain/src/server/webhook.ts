/**
 * Subscription webhook verification (A6). Server-only.
 *
 * Header format: `t=<unix seconds>,v1=<hex hmac-sha256 of "<t>.<rawBody>">`.
 * Rejects bad signatures, stale timestamps, and replayed event ids.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ProductIdSchema, type StoreEvent } from '../entitlement';
import { IdSchema } from '../schemas';

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface ReplayStore {
  /** Returns false if the id was already seen. Must be atomic in production (e.g. unique index). */
  markSeen(eventId: string, expiresAt: number, now: number): boolean;
}

export class MemoryReplayStore implements ReplayStore {
  private readonly seen = new Map<string, number>();
  markSeen(eventId: string, expiresAt: number, now: number): boolean {
    for (const [id, exp] of this.seen) if (exp < now) this.seen.delete(id);
    if (this.seen.has(eventId)) return false;
    this.seen.set(eventId, expiresAt);
    return true;
  }
}

const WebhookBodySchema = z
  .object({
    id: z.string().min(8).max(100),
    ownerId: IdSchema,
    event: z.discriminatedUnion('type', [
      z.object({ type: z.literal('trial_started'), productId: ProductIdSchema, at: z.iso.datetime() }).strict(),
      z.object({ type: z.literal('purchased'), productId: ProductIdSchema, at: z.iso.datetime(), periodEndsAt: z.iso.datetime() }).strict(),
      z.object({ type: z.literal('renewed'), productId: ProductIdSchema, at: z.iso.datetime(), periodEndsAt: z.iso.datetime() }).strict(),
      z.object({ type: z.literal('cancelled'), at: z.iso.datetime() }).strict(),
      z.object({ type: z.literal('expired'), at: z.iso.datetime() }).strict(),
      z.object({ type: z.literal('restored'), productId: ProductIdSchema, at: z.iso.datetime(), periodEndsAt: z.iso.datetime(), isTrial: z.boolean() }).strict(),
    ]),
  })
  .strict();

export type VerifiedWebhook = { id: string; ownerId: string; event: StoreEvent };

export type WebhookResult =
  | { ok: true; webhook: VerifiedWebhook }
  | { ok: false; status: 400 | 401 | 409; reason: 'malformed_header' | 'bad_signature' | 'stale' | 'replay' | 'bad_body' };

export function signWebhook(rawBody: string, secret: string, timestampSeconds: number): string {
  const mac = createHmac('sha256', secret).update(`${timestampSeconds}.${rawBody}`).digest('hex');
  return `t=${timestampSeconds},v1=${mac}`;
}

export function verifyWebhook(
  rawBody: string,
  header: string | undefined,
  secret: string,
  replay: ReplayStore,
  now: Date = new Date(),
): WebhookResult {
  const match = /^t=(\d{1,12}),v1=([a-f0-9]{64})$/u.exec(header ?? '');
  if (!match) return { ok: false, status: 400, reason: 'malformed_header' };
  const t = Number(match[1]);
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
  const given = Buffer.from(match[2] as string, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, status: 401, reason: 'bad_signature' };
  }
  if (Math.abs(now.getTime() / 1000 - t) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, status: 400, reason: 'stale' };
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, reason: 'bad_body' };
  }
  const parsed = WebhookBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, reason: 'bad_body' };
  if (!replay.markSeen(parsed.data.id, now.getTime() + 2 * WEBHOOK_TOLERANCE_SECONDS * 1000, now.getTime())) {
    return { ok: false, status: 409, reason: 'replay' };
  }
  return { ok: true, webhook: parsed.data as VerifiedWebhook };
}
