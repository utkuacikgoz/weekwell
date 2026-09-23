/**
 * Copy system (A0). Direct, warm, specific. Every label for a preference lives
 * here so onboarding, the week header, and settings use the same words.
 */
import {
  RETAILER_LABEL,
  formatMoney,
  formatRelativeTime,
  formatShortDate,
  type BudgetStatus,
  type HouseholdSize,
  type MaxMinutes,
  type ProteinGoal,
  type Retailer,
  type ShopTotal,
} from '@weekwell/domain';

export const GOAL_COPY: Record<ProteinGoal, { label: string; detail: string }> = {
  high_protein: { label: 'High protein', detail: 'Every meal is built around a protein source.' },
  low_effort: { label: 'Low effort', detail: 'Fewer steps and short hands-on time.' },
  low_carb: { label: 'Low carb', detail: 'Fewer grains, pasta, and starches.' },
  family_friendly: { label: 'Family friendly', detail: 'Familiar dishes that scale for more people.' },
};

export const TIME_COPY: Record<string, { label: string; short: string; detail: string }> = {
  '20': { label: '20 minutes', short: '20 min', detail: 'Each dinner is ready in 20 minutes or less.' },
  '30': { label: '30 minutes', short: '30 min', detail: 'Each dinner is ready in 30 minutes or less.' },
  batch: { label: 'Batch cooking', short: 'Batch', detail: 'Longer cooks that leave leftovers. Some take up to 90 minutes.' },
};
export const timeCopy = (m: MaxMinutes) => TIME_COPY[String(m)] as (typeof TIME_COPY)[string];

export const HOUSEHOLD_COPY: Record<string, { label: string; detail?: string }> = {
  '1': { label: '1 person' },
  '2': { label: '2 people' },
  '3_4': { label: '3–4 people', detail: 'We plan 4 servings per dinner.' },
};
export const householdCopy = (h: HouseholdSize) => HOUSEHOLD_COPY[String(h)] as (typeof HOUSEHOLD_COPY)[string];

export const STORE_COPY: Record<Retailer, { label: string; detail: string }> = {
  trader_joes: { label: RETAILER_LABEL.trader_joes, detail: 'Smaller store, fewer choices, easy weekly shop.' },
  walmart: { label: RETAILER_LABEL.walmart, detail: 'Large store with broad budget options.' },
};

export { FORBIDDEN_PHRASES } from './forbidden';

/** `headline` is the full sentence (for screen readers); `amount` + `qualifier` are the visual split. */
export type PriceHeadline = { headline: string; amount?: string; qualifier: string; detail: string; tone: 'ok' | 'warning'; kindLabel: string };

export function priceHeadline(total: ShopTotal, retailer: Retailer, now: Date): PriceHeadline {
  const store = RETAILER_LABEL[retailer];
  if (total.status === 'withheld') {
    if (total.reason === 'provider_unavailable') {
      return {
        headline: 'Total hidden',
        qualifier: 'Total hidden',
        detail: `We could not verify prices for ${store} right now. Your plan is still available, but totals are hidden until the price check completes.`,
        tone: 'warning',
        kindLabel: 'No price check',
      };
    }
    const n = total.missingItemIds.length;
    return {
      headline: 'Total hidden',
      qualifier: 'Total hidden',
      detail: `We could not price ${n} of ${total.itemCount} items at ${store}, so we are not showing a total. Prices we do have are in the grocery list.`,
      tone: 'warning',
      kindLabel: 'Incomplete prices',
    };
  }
  const amount = formatMoney(total.totalCents, { whole: true });
  if (total.isSample) {
    return {
      headline: `${amount} estimated at ${store}`,
      amount,
      qualifier: `estimated at ${store}`,
      detail: `Sample prices for testing, written ${formatShortDate(total.oldestObservedAt)}. Not checked in a store.`,
      tone: 'warning',
      kindLabel: 'Sample estimate',
    };
  }
  const age = formatRelativeTime(total.oldestObservedAt, now);
  if (total.staleItemIds.length > 0) {
    return {
      headline: `${amount} estimated at ${store}`,
      amount,
      qualifier: `estimated at ${store}`,
      detail: `Checked ${age}. Prices may have changed since then.`,
      tone: 'warning',
      kindLabel: 'Older estimate',
    };
  }
  if (total.kind === 'verified') {
    return { headline: `${amount} at ${store}`, amount, qualifier: `at ${store}`, detail: `Store prices checked ${age}. Prices can change in store.`, tone: 'ok', kindLabel: 'Checked price' };
  }
  return { headline: `${amount} estimated at ${store}`, amount, qualifier: `estimated at ${store}`, detail: `Checked ${age}. Prices can change in store.`, tone: 'ok', kindLabel: 'Estimate' };
}

export function budgetLine(status: BudgetStatus, budget: number): { text: string; tone: 'ok' | 'warning' | 'muted' } {
  if (status.state === 'unknown') return { text: `Budget $${budget}. We’ll compare once prices are available.`, tone: 'muted' };
  if (status.state === 'under') {
    const spare = formatMoney(status.remainingCents, { whole: true });
    return { text: `Fits your $${budget} budget, about ${spare} to spare.`, tone: 'ok' };
  }
  return {
    text: `About ${formatMoney(status.overCents, { whole: true })} over your $${budget} budget. Try “Make it cheaper” on a meal, or change your budget.`,
    tone: 'warning',
  };
}

/** "Dinners 15–30 minutes · about 40g protein each (estimated)" */
export function weekSummary(dinners: readonly { totalMinutes: number; protein: { value: number } }[]): string {
  const mins = dinners.map((d) => d.totalMinutes);
  const avgProtein = Math.round(dinners.reduce((s, d) => s + d.protein.value, 0) / Math.max(1, dinners.length));
  const lo = Math.min(...mins);
  const hi = Math.max(...mins);
  const range = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `Dinners take ${range} minutes · about ${avgProtein}g protein each (estimated)`;
}
