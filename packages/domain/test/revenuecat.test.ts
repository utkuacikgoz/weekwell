import { describe, expect, it } from 'vitest';
import { emptyEntitlement, productIdFromStore, recordFromSubscriber, STORE_PRODUCT_IDS, viewFromCustomerInfo, type RcCustomerInfo } from '../src';

const NOW = new Date('2026-09-24T12:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();
const info = (e: Partial<RcCustomerInfo['entitlements']['all'][string]> | null): RcCustomerInfo => ({
  entitlements: { all: e ? { pro: { isActive: true, willRenew: true, periodType: 'NORMAL', expirationDate: inDays(30), productIdentifier: STORE_PRODUCT_IDS.monthly, ...e } } : {} },
});

describe('RevenueCat mapping (D-014)', () => {
  it('maps store product ids both ways, including Android base plans', () => {
    expect(productIdFromStore('com.belevate.weekwell.yearly')).toBe('yearly');
    expect(productIdFromStore('com.belevate.weekwell.weekly:weekly-base')).toBe('weekly');
    expect(productIdFromStore('com.other.app.monthly')).toBeUndefined();
    expect(productIdFromStore(null)).toBeUndefined();
  });

  it('SDK: none, trial, active, expired', () => {
    expect(viewFromCustomerInfo(info(null), true, NOW)).toEqual({ state: 'none', trialEligible: true });
    expect(viewFromCustomerInfo(info(null), false, NOW)).toEqual({ state: 'none', trialEligible: false });
    expect(viewFromCustomerInfo(info({ periodType: 'TRIAL', expirationDate: inDays(3) }), false, NOW)).toMatchObject({ state: 'trial', productId: 'monthly', daysLeft: 3 });
    expect(viewFromCustomerInfo(info({ willRenew: false }), false, NOW)).toMatchObject({ state: 'active', willRenew: false });
    expect(viewFromCustomerInfo(info({ isActive: false, expirationDate: inDays(-1) }), false, NOW)).toEqual({ state: 'expired', productId: 'monthly' });
  });

  it('SDK: an unknown product never grants access', () => {
    expect(viewFromCustomerInfo(info({ productIdentifier: 'com.other.app.monthly' }), true, NOW)).toEqual({ state: 'none', trialEligible: true });
  });

  it('REST: trial, then cancelled trial, then expired, and the trial stays used', () => {
    const trial = recordFromSubscriber('u1', {
      subscriber: {
        entitlements: { pro: { expires_date: inDays(7), product_identifier: STORE_PRODUCT_IDS.yearly } },
        subscriptions: { [STORE_PRODUCT_IDS.yearly]: { period_type: 'trial', expires_date: inDays(7), purchase_date: NOW.toISOString(), unsubscribe_detected_at: null } },
      },
    }, null, NOW);
    expect(trial).toMatchObject({ status: 'trial', productId: 'yearly', willRenew: true, trialUsed: true, periodEndsAt: inDays(7) });

    const cancelled = recordFromSubscriber('u1', {
      subscriber: {
        entitlements: { pro: { expires_date: inDays(7), product_identifier: STORE_PRODUCT_IDS.yearly } },
        subscriptions: { [STORE_PRODUCT_IDS.yearly]: { period_type: 'trial', expires_date: inDays(7), unsubscribe_detected_at: NOW.toISOString() } },
      },
    }, trial, NOW);
    expect(cancelled).toMatchObject({ status: 'trial', willRenew: false });

    const later = new Date(NOW.getTime() + 8 * 86_400_000);
    const expired = recordFromSubscriber('u1', {
      subscriber: {
        entitlements: { pro: { expires_date: inDays(7), product_identifier: STORE_PRODUCT_IDS.yearly } },
        subscriptions: { [STORE_PRODUCT_IDS.yearly]: { period_type: 'trial', expires_date: inDays(7) } },
      },
    }, cancelled, later);
    expect(expired).toMatchObject({ status: 'expired', willRenew: false, trialUsed: true });
  });

  it('REST: a paid renewal is active; no entitlement leaves a new user at none', () => {
    const paid = recordFromSubscriber('u2', {
      subscriber: {
        entitlements: { pro: { expires_date: inDays(30), product_identifier: STORE_PRODUCT_IDS.monthly } },
        subscriptions: { [STORE_PRODUCT_IDS.monthly]: { period_type: 'normal', expires_date: inDays(30) } },
      },
    }, emptyEntitlement('u2', NOW), NOW);
    expect(paid).toMatchObject({ status: 'active', productId: 'monthly', willRenew: true, trialUsed: false });
    expect(recordFromSubscriber('u3', { subscriber: {} }, null, NOW)).toMatchObject({ status: 'none', trialUsed: false });
    expect(recordFromSubscriber('u2', { subscriber: {} }, paid, NOW)).toMatchObject({ status: 'expired', willRenew: false });
  });
});
