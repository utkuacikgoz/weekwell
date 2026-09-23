/**
 * Subscription and trial state (D-008). The server's clock and records are
 * authoritative; a client timestamp can never extend a trial.
 */
import { z } from 'zod';
import { IdSchema } from './schemas';

export const TRIAL_DAYS = 7;
const DAY_MS = 86_400_000;

export const PRODUCT_IDS = ['weekly', 'monthly', 'yearly'] as const;
export const ProductIdSchema = z.enum(PRODUCT_IDS);
export type ProductId = z.infer<typeof ProductIdSchema>;

export type SubscriptionProduct = { id: ProductId; label: string; priceCents: number; period: 'week' | 'month' | 'year' };

export const SUBSCRIPTION_PRODUCTS: readonly SubscriptionProduct[] = [
  { id: 'weekly', label: 'Weekly', priceCents: 499, period: 'week' },
  { id: 'monthly', label: 'Monthly', priceCents: 999, period: 'month' },
  { id: 'yearly', label: 'Yearly', priceCents: 4999, period: 'year' },
];

export function getProduct(id: ProductId): SubscriptionProduct {
  const product = SUBSCRIPTION_PRODUCTS.find((p) => p.id === id);
  if (!product) throw new Error(`Unknown product ${id}`);
  return product;
}

/**
 * Truthful yearly saving compared with paying monthly for 12 months.
 * $9.99 × 12 = $119.88; $119.88 − $49.99 = $69.89, which is 58% (rounded down).
 */
export function yearlySavingsVsMonthly(): { savedCents: number; percent: number; monthlyYearCents: number } {
  const monthlyYearCents = getProduct('monthly').priceCents * 12;
  const savedCents = monthlyYearCents - getProduct('yearly').priceCents;
  return { savedCents, percent: Math.floor((savedCents / monthlyYearCents) * 100), monthlyYearCents };
}

export const EntitlementRecordSchema = z
  .object({
    ownerId: IdSchema,
    status: z.enum(['none', 'trial', 'active', 'expired']),
    productId: ProductIdSchema.optional(),
    trialStartedAt: z.iso.datetime({ offset: true }).optional(),
    /** End of the trial or of the current paid period. */
    periodEndsAt: z.iso.datetime({ offset: true }).optional(),
    willRenew: z.boolean(),
    /** Set once a trial has ever started; trials are one per account. */
    trialUsed: z.boolean(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type EntitlementRecord = z.infer<typeof EntitlementRecordSchema>;

export function emptyEntitlement(ownerId: string, now: Date): EntitlementRecord {
  return { ownerId, status: 'none', willRenew: false, trialUsed: false, updatedAt: now.toISOString() };
}

/** What the app renders. `loading` and `error` disable purchase actions (Norman: constraints). */
export type EntitlementView =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'none'; trialEligible: boolean }
  | { state: 'trial'; productId: ProductId; endsAt: string; daysLeft: number; willRenew: boolean }
  | { state: 'active'; productId: ProductId; periodEndsAt: string; willRenew: boolean }
  | { state: 'expired'; productId?: ProductId };

export function deriveEntitlement(record: EntitlementRecord, serverNow: Date): EntitlementView {
  const ends = record.periodEndsAt ? Date.parse(record.periodEndsAt) : Number.NaN;
  const now = serverNow.getTime();
  if (record.status === 'none') return { state: 'none', trialEligible: !record.trialUsed };
  if (record.status === 'expired' || Number.isNaN(ends) || !record.productId) {
    return record.productId ? { state: 'expired', productId: record.productId } : { state: 'expired' };
  }
  if (now >= ends) {
    // Past the end without a renewal event: treat as expired until the store says otherwise.
    return { state: 'expired', productId: record.productId };
  }
  if (record.status === 'trial') {
    return {
      state: 'trial',
      productId: record.productId,
      endsAt: record.periodEndsAt as string,
      daysLeft: Math.max(1, Math.ceil((ends - now) / DAY_MS)),
      willRenew: record.willRenew,
    };
  }
  return { state: 'active', productId: record.productId, periodEndsAt: record.periodEndsAt as string, willRenew: record.willRenew };
}

export function isEntitled(view: EntitlementView): boolean {
  return view.state === 'trial' || view.state === 'active';
}

/** Store events, as delivered by verified webhooks or a server-side receipt check. */
export type StoreEvent =
  | { type: 'trial_started'; productId: ProductId; at: string }
  | { type: 'purchased'; productId: ProductId; at: string; periodEndsAt: string }
  | { type: 'renewed'; productId: ProductId; at: string; periodEndsAt: string }
  | { type: 'cancelled'; at: string }
  | { type: 'expired'; at: string }
  | { type: 'restored'; productId: ProductId; at: string; periodEndsAt: string; isTrial: boolean };

export class EntitlementTransitionError extends Error {
  constructor(readonly code: 'trial_already_used' | 'not_subscribed') {
    super(code);
    this.name = 'EntitlementTransitionError';
  }
}

/** Apply a store event. `at` is the server/store time, never the client's. */
export function applyStoreEvent(record: EntitlementRecord, event: StoreEvent): EntitlementRecord {
  const base = { ...record, updatedAt: event.at };
  switch (event.type) {
    case 'trial_started': {
      if (record.trialUsed) throw new EntitlementTransitionError('trial_already_used');
      const endsAt = new Date(Date.parse(event.at) + TRIAL_DAYS * DAY_MS).toISOString();
      return { ...base, status: 'trial', productId: event.productId, trialStartedAt: event.at, periodEndsAt: endsAt, willRenew: true, trialUsed: true };
    }
    case 'purchased':
    case 'renewed':
      return { ...base, status: 'active', productId: event.productId, periodEndsAt: event.periodEndsAt, willRenew: true };
    case 'restored':
      return {
        ...base,
        status: event.isTrial ? 'trial' : 'active',
        productId: event.productId,
        periodEndsAt: event.periodEndsAt,
        willRenew: true,
        trialUsed: record.trialUsed || event.isTrial,
      };
    case 'cancelled':
      if (record.status !== 'trial' && record.status !== 'active') throw new EntitlementTransitionError('not_subscribed');
      // Access continues until the end of the trial or paid period.
      return { ...base, willRenew: false };
    case 'expired':
      return { ...base, status: 'expired', willRenew: false };
  }
}

/**
 * Access policy (D-026, Proposed): after the free week ends without a
 * subscription, the current plan and grocery list stay readable, but making a
 * new week, swapping meals, and rebuilding need a subscription. Enforced by
 * the API and mirrored in the app.
 */
export function canChangePlan(view: EntitlementView): boolean {
  if (view.state === 'expired') return false;
  if (view.state === 'none' && !view.trialEligible) return false;
  return true;
}
