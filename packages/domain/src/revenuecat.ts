/**
 * RevenueCat mapping (D-014). Pure: no SDK or network code, so the app, the
 * API, and the tests share one reading of "is this person subscribed".
 *
 * App Store Connect setup this assumes (docs/release/revenuecat-setup.md):
 * - one auto-renewable subscription group with these three product ids;
 * - a 1-week free introductory offer on each, which is the "free week";
 * - a RevenueCat entitlement `pro` attached to all three.
 */
import { emptyEntitlement, type EntitlementRecord, type EntitlementView, type ProductId } from './entitlement';

export const RC_ENTITLEMENT_ID = 'pro';

export const STORE_PRODUCT_IDS: Record<ProductId, string> = {
  weekly: 'com.belevate.weekwell.weekly',
  monthly: 'com.belevate.weekwell.monthly',
  yearly: 'com.belevate.weekwell.yearly',
};

export function productIdFromStore(storeId: string | null | undefined): ProductId | undefined {
  if (!storeId) return undefined;
  // Android ids can carry a base plan suffix ("product:base-plan").
  const base = storeId.split(':')[0];
  return (Object.keys(STORE_PRODUCT_IDS) as ProductId[]).find((k) => STORE_PRODUCT_IDS[k] === base);
}

// ---------------------------------------------------------------- client SDK
/** The parts of the SDK's CustomerInfo we read (structural, so tests need no SDK). */
export type RcEntitlementInfo = {
  isActive: boolean;
  willRenew: boolean;
  periodType: string;
  expirationDate: string | null;
  productIdentifier: string;
};
export type RcCustomerInfo = { entitlements: { all: Record<string, RcEntitlementInfo | undefined> } };

/**
 * What the app shows, from the SDK. `trialEligible` comes from the SDK's intro
 * eligibility check, since Apple decides who still has a free week. The API
 * still enforces access from its own copy (webhooks plus a REST re-read).
 */
export function viewFromCustomerInfo(info: RcCustomerInfo, trialEligible: boolean, now: Date): EntitlementView {
  const e = info.entitlements.all[RC_ENTITLEMENT_ID];
  const productId = productIdFromStore(e?.productIdentifier);
  if (!e || !productId) return { state: 'none', trialEligible };
  const ends = e.expirationDate ? Date.parse(e.expirationDate) : Number.NaN;
  if (!e.isActive || Number.isNaN(ends) || ends <= now.getTime()) return { state: 'expired', productId };
  if (e.periodType.toUpperCase() === 'TRIAL') {
    return { state: 'trial', productId, endsAt: e.expirationDate as string, daysLeft: Math.max(1, Math.ceil((ends - now.getTime()) / 86_400_000)), willRenew: e.willRenew };
  }
  return { state: 'active', productId, periodEndsAt: e.expirationDate as string, willRenew: e.willRenew };
}

// ---------------------------------------------------------------- server REST
/** The parts of `GET /v1/subscribers/{app_user_id}` we read. */
export type RcSubscriberResponse = {
  subscriber: {
    entitlements?: Record<string, { expires_date: string | null; product_identifier: string; purchase_date?: string } | undefined>;
    subscriptions?: Record<string, { period_type?: string; expires_date?: string | null; unsubscribe_detected_at?: string | null; purchase_date?: string } | undefined>;
  };
};

/**
 * The server's entitlement record, from RevenueCat's REST view of the
 * customer. Webhooks only trigger this re-read: their bodies are not trusted
 * for state, so out-of-order or missed events can't leave a wrong record.
 */
export function recordFromSubscriber(ownerId: string, res: RcSubscriberResponse, previous: EntitlementRecord | null, now: Date): EntitlementRecord {
  const base = previous ?? emptyEntitlement(ownerId, now);
  const subs = res.subscriber.subscriptions ?? {};
  const everTrialed = Object.values(subs).some((s) => s?.period_type === 'trial');
  const trialUsed = base.trialUsed || everTrialed;
  const ent = res.subscriber.entitlements?.[RC_ENTITLEMENT_ID];
  const productId = productIdFromStore(ent?.product_identifier);
  if (!ent || !productId) return { ...base, status: base.status === 'none' ? 'none' : 'expired', trialUsed, willRenew: false, updatedAt: now.toISOString() };
  const sub = subs[ent.product_identifier];
  const endsAt = ent.expires_date ?? sub?.expires_date ?? null;
  const active = endsAt !== null && Date.parse(endsAt) > now.getTime();
  const isTrial = sub?.period_type === 'trial';
  return {
    ownerId,
    status: !active ? 'expired' : isTrial ? 'trial' : 'active',
    productId,
    ...(isTrial && sub?.purchase_date ? { trialStartedAt: sub.purchase_date } : base.trialStartedAt ? { trialStartedAt: base.trialStartedAt } : {}),
    ...(endsAt ? { periodEndsAt: endsAt } : {}),
    willRenew: active && !sub?.unsubscribe_detected_at,
    trialUsed,
    updatedAt: now.toISOString(),
  };
}
