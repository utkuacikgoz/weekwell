/**
 * Copy system (A0). Direct, warm, specific. Every label for a preference lives
 * here so onboarding, the week header, and settings use the same words.
 */
import {
  RETAILER_LABEL,
  formatMoney,
  formatRelativeTime,
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
/** Conversational labels for the onboarding question "Who’s eating?". */
export const HOUSEHOLD_CHOICE: Record<string, string> = { '1': 'Just me', '2': 'Two of us', '3_4': '3–4 people' };

export const householdCopy = (h: HouseholdSize) => HOUSEHOLD_COPY[String(h)] as (typeof HOUSEHOLD_COPY)[string];

export const STORE_COPY: Record<Retailer, { label: string; detail: string }> = {
  trader_joes: { label: RETAILER_LABEL.trader_joes, detail: 'Smaller store, fewer choices, easy weekly shop.' },
  walmart: { label: RETAILER_LABEL.walmart, detail: 'Large store with broad budget options.' },
};

export { FORBIDDEN_PHRASES } from './forbidden';

/** "Dinners 15–30 minutes · about 40g protein each (estimated)" */
export function weekSummary(dinners: readonly { totalMinutes: number; protein: { value: number } }[]): string {
  const mins = dinners.map((d) => d.totalMinutes);
  const avgProtein = Math.round(dinners.reduce((s, d) => s + d.protein.value, 0) / Math.max(1, dinners.length));
  const lo = Math.min(...mins);
  const hi = Math.max(...mins);
  const range = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `Dinners take ${range} minutes · about ${avgProtein}g protein each (estimated)`;
}

// ---------------------------------------------------------------------------
// Price status (design audit 2026-09-24): the footer carries one compact chip
// (amount + what kind of number it is); anything that needs attention is an
// inline notice in the content with one next step. "Sample" appears only in
// the chip and the About sheet.
// ---------------------------------------------------------------------------

export type PriceAction = 'about' | 'refresh' | 'rebuild';
export type PriceVariant = 'sample' | 'estimate' | 'verified' | 'stale' | 'unavailable' | 'partial' | 'over_budget';
export type PriceNoticeModel = { title: string; detail: string; action: { kind: Exclude<PriceAction, 'about'>; label: string } };
export type PriceModel = {
  variant: PriceVariant;
  /** "$73", or null when no total is shown. */
  amount: string | null;
  /** What kind of number it is: "sample est.", "store check", "estimate", "checked price", "older est.", "no total". */
  kind: string;
  /** Full sentence for screen readers. */
  summary: string;
  notice: PriceNoticeModel | null;
};

export function priceModel(total: ShopTotal, retailer: Retailer, budget: number, now: Date): PriceModel {
  const store = RETAILER_LABEL[retailer];
  const refresh = { kind: 'refresh' as const, label: 'Try again' };
  if (total.status === 'withheld') {
    if (total.reason === 'provider_unavailable') {
      return {
        variant: 'unavailable',
        amount: null,
        kind: 'no total',
        summary: `No total. Prices for ${store} are unavailable right now.`,
        notice: { title: 'Prices unavailable right now', detail: 'Your plan and grocery list still work without a total.', action: refresh },
      };
    }
    const n = total.missingItemIds.length;
    return {
      variant: 'partial',
      amount: null,
      kind: 'no total',
      summary: `No total. ${n} of ${total.itemCount} items have no price yet.`,
      notice: { title: 'Total unavailable', detail: `${n} of ${total.itemCount} items have no price yet, so we don’t show a total.`, action: refresh },
    };
  }
  const amount = formatMoney(total.totalCents, { whole: true });
  const over = total.totalCents - budget * 100;
  if (total.staleItemIds.length > 0) {
    const age = formatRelativeTime(total.oldestObservedAt, now);
    return {
      variant: 'stale',
      amount,
      kind: 'older est.',
      summary: `${amount} estimated at ${store}, last checked ${age}.`,
      notice: { title: `Prices last checked ${age}`, detail: 'They may have changed since then.', action: { kind: 'refresh', label: 'Check prices again' } },
    };
  }
  const kind = total.isSample ? 'sample est.' : total.kind === 'verified' ? 'checked price' : total.isStoreCheck ? 'store check' : 'estimate';
  const spoken = total.isSample
    ? `${amount} sample estimate at ${store}`
    : total.kind === 'verified'
      ? `${amount} at ${store}, checked price`
      : total.isStoreCheck
        ? `${amount} estimated from a store check at ${store}`
        : `${amount} estimated at ${store}`;
  if (over > 0) {
    // Whole dollars everywhere, so a few cents over reads "less than $1", never "$0".
    const o = over < 100 ? 'less than $1' : formatMoney(over, { whole: true });
    return {
      variant: 'over_budget',
      amount,
      kind,
      summary: `${spoken}. ${o} over your $${budget} target.`,
      notice: {
        title: `Estimated total ${amount} · ${o} over your $${budget} target`,
        detail: 'Rebuild swaps in lower-cost meals and you can undo it. Fewer people, cheaper proteins, or another store also bring it down.',
        action: { kind: 'rebuild', label: `Rebuild under $${budget}` },
      },
    };
  }
  return { variant: total.isSample ? 'sample' : total.kind === 'verified' ? 'verified' : 'estimate', amount, kind, summary: `${spoken}. Within your $${budget} target.`, notice: null };
}
