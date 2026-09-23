import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_EVENT_NAMES,
  EntitlementTransitionError,
  FIXTURE_USERS,
  applyStoreEvent,
  createAnalytics,
  deriveEntitlement,
  emptyEntitlement,
  isActivated,
  isEntitled,
  preferencesCompletedProps,
  yearlySavingsVsMonthly,
  type AnalyticsEvent,
} from '../src';

const T0 = new Date('2026-09-23T12:00:00Z');
const day = (n: number) => new Date(T0.getTime() + n * 86_400_000);

describe('entitlement', () => {
  it('starts with no access and a trial available', () => {
    expect(deriveEntitlement(emptyEntitlement('user_a', T0), T0)).toEqual({ state: 'none', trialEligible: true });
  });

  it('runs a seven-day trial measured in server time', () => {
    const r = applyStoreEvent(emptyEntitlement('user_a', T0), { type: 'trial_started', productId: 'monthly', at: T0.toISOString() });
    expect(deriveEntitlement(r, day(1))).toMatchObject({ state: 'trial', daysLeft: 6 });
    expect(isEntitled(deriveEntitlement(r, day(6.9)))).toBe(true);
    expect(deriveEntitlement(r, day(7))).toMatchObject({ state: 'expired' });
  });

  it('cannot start a second trial', () => {
    const r = applyStoreEvent(emptyEntitlement('user_a', T0), { type: 'trial_started', productId: 'weekly', at: T0.toISOString() });
    const expired = applyStoreEvent(r, { type: 'expired', at: day(8).toISOString() });
    expect(() => applyStoreEvent(expired, { type: 'trial_started', productId: 'weekly', at: day(9).toISOString() })).toThrow(EntitlementTransitionError);
    expect(deriveEntitlement(expired, day(9))).toMatchObject({ state: 'expired' });
  });

  it('a client-side clock change cannot extend the trial (only server time is an input)', () => {
    const r = applyStoreEvent(emptyEntitlement('user_a', T0), { type: 'trial_started', productId: 'monthly', at: T0.toISOString() });
    const tampered = { ...r, trialStartedAt: day(30).toISOString() }; // client-edited start date is ignored
    expect(deriveEntitlement(tampered, day(8)).state).toBe('expired');
  });

  it('cancellation keeps access until the period ends', () => {
    const r = applyStoreEvent(emptyEntitlement('user_a', T0), { type: 'purchased', productId: 'yearly', at: T0.toISOString(), periodEndsAt: day(365).toISOString() });
    const c = applyStoreEvent(r, { type: 'cancelled', at: day(10).toISOString() });
    expect(deriveEntitlement(c, day(11))).toMatchObject({ state: 'active', willRenew: false });
  });

  it('cancel without a subscription is rejected', () => {
    expect(() => applyStoreEvent(emptyEntitlement('user_a', T0), { type: 'cancelled', at: T0.toISOString() })).toThrow();
  });

  it('yearly saving is truthful', () => {
    expect(yearlySavingsVsMonthly()).toEqual({ savedCents: 6989, percent: 58, monthlyYearCents: 11988 });
  });
});

describe('analytics', () => {
  const sent: AnalyticsEvent[] = [];
  const analytics = createAnalytics((e) => sent.push(e), 'anon_abc12345', () => T0);

  it('covers the brief’s taxonomy', () => {
    for (const name of ['onboarding_started', 'store_selected', 'preferences_completed', 'plan_generation_started', 'plan_generation_succeeded', 'plan_generation_failed', 'meal_opened', 'meal_swapped', 'grocery_item_checked', 'grocery_list_shared', 'trial_viewed', 'trial_started', 'paywall_viewed', 'subscription_started', 'subscription_restored', 'subscription_cancelled']) {
      expect(ANALYTICS_EVENT_NAMES).toContain(name);
    }
  });

  it('sends exclusion counts, never exclusion values', () => {
    const props = preferencesCompletedProps({ ...FIXTURE_USERS.valid!.preferences, exclusions: ['peanuts', 'shellfish'] });
    expect(analytics.track('preferences_completed', props)).toBe(true);
    const json = JSON.stringify(sent.at(-1));
    expect(json).not.toMatch(/peanut|shellfish/u);
    expect(sent.at(-1)!.props.exclusionCount).toBe(2);
  });

  it('rejects payloads with extra keys such as allergies, emails, or meal text', () => {
    const before = sent.length;
    // @ts-expect-error extra key is a type error as well as a runtime rejection
    expect(analytics.track('meal_opened', { slot: 'dinner', day: 'mon', mealName: 'Shrimp stir-fry' })).toBe(false);
    // @ts-expect-error
    expect(analytics.track('store_selected', { retailer: 'walmart', email: 'a@b.co' })).toBe(false);
    // @ts-expect-error
    expect(analytics.track('grocery_item_checked', { checked: true, section: 'produce', checkedCount: 1, totalCount: 2, allergy: 'nuts' })).toBe(false);
    expect(sent.length).toBe(before);
  });

  it('requires a random anonymous id', () => {
    expect(() => createAnalytics(() => {}, 'someone@example.com')).toThrow();
  });

  it('computes activation from the funnel', () => {
    const e = (name: AnalyticsEvent['name'], props: Record<string, unknown> = {}) => ({ name, props });
    const funnel = [e('preferences_completed'), e('plan_generation_succeeded'), e('meal_opened'), e('grocery_list_opened')];
    expect(isActivated(funnel)).toBe(false);
    expect(isActivated([...funnel, e('grocery_item_checked', { checked: false })])).toBe(false);
    expect(isActivated([...funnel, e('grocery_item_checked', { checked: true })])).toBe(true);
  });
});

describe('canChangePlan', () => {
  it('is read-only after the free week and open otherwise', async () => {
    const { canChangePlan } = await import('../src');
    expect(canChangePlan({ state: 'none', trialEligible: true })).toBe(true);
    expect(canChangePlan({ state: 'trial', productId: 'monthly', endsAt: '', daysLeft: 3, willRenew: true })).toBe(true);
    expect(canChangePlan({ state: 'active', productId: 'yearly', periodEndsAt: '', willRenew: true })).toBe(true);
    expect(canChangePlan({ state: 'expired' })).toBe(false);
    expect(canChangePlan({ state: 'none', trialEligible: false })).toBe(false);
  });
});
