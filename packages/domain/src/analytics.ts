/**
 * Analytics event taxonomy (mobile brief: "Analytics"). Every payload is a
 * strict schema, so allergy values, meal text, emails, and precise locations
 * cannot be attached: unknown keys are rejected, not silently sent.
 */
import { z } from 'zod';
import { ProductIdSchema } from './entitlement';
import { REPAIR_ACTIONS } from './repair';
import {
  DaySchema,
  GenerationErrorCodeSchema,
  MealSlotSchema,
  ProteinGoalSchema,
  RetailerSchema,
  StoreSectionSchema,
  type UserPreferences,
} from './schemas';

const TriggerSchema = z.enum(['plan_header', 'grocery_list', 'settings', 'meal_detail']);
const count = z.number().int().nonnegative().max(1_000);

export const AnalyticsPayloads = {
  onboarding_started: z.object({ source: z.enum(['tiktok', 'friend', 'direct', 'unknown']) }).strict(),
  store_selected: z.object({ retailer: RetailerSchema }).strict(),
  preferences_completed: z
    .object({
      retailer: RetailerSchema,
      goal: ProteinGoalSchema,
      maxMinutes: z.enum(['20', '30', 'batch']),
      householdSize: z.enum(['1', '2', '3_4']),
      budgetBand: z.enum(['under_60', '60_99', '100_149', '150_plus']),
      /** A count only. Never the exclusion values. */
      exclusionCount: count,
    })
    .strict(),
  plan_generation_started: z.object({ retailer: RetailerSchema, goal: ProteinGoalSchema }).strict(),
  plan_generation_succeeded: z
    .object({
      retailer: RetailerSchema,
      goal: ProteinGoalSchema,
      durationMs: z.number().int().nonnegative().max(600_000),
      priceStatus: z.enum(['available', 'withheld']),
      overBudget: z.boolean(),
    })
    .strict(),
  plan_generation_failed: z.object({ errorCode: GenerationErrorCodeSchema }).strict(),
  meal_opened: z.object({ slot: MealSlotSchema, day: DaySchema }).strict(),
  meal_swapped: z.object({ slot: MealSlotSchema, day: DaySchema, action: z.enum(REPAIR_ACTIONS), undone: z.boolean() }).strict(),
  /** Proposed addition (D-024): needed to measure activation step 4. */
  grocery_list_opened: z.object({ itemCount: count }).strict(),
  grocery_item_checked: z.object({ checked: z.boolean(), section: StoreSectionSchema, checkedCount: count, totalCount: count }).strict(),
  grocery_list_shared: z.object({ itemCount: count }).strict(),
  trial_viewed: z.object({ trigger: TriggerSchema }).strict(),
  trial_started: z.object({ productId: ProductIdSchema }).strict(),
  paywall_viewed: z.object({ trigger: TriggerSchema }).strict(),
  subscription_started: z.object({ productId: ProductIdSchema }).strict(),
  subscription_restored: z.object({ result: z.enum(['restored', 'nothing_to_restore', 'failed']) }).strict(),
  subscription_cancelled: z.object({ productId: ProductIdSchema }).strict(),
} as const;

export type AnalyticsEventName = keyof typeof AnalyticsPayloads;
export const ANALYTICS_EVENT_NAMES = Object.keys(AnalyticsPayloads) as AnalyticsEventName[];
export type AnalyticsPayload<N extends AnalyticsEventName> = z.infer<(typeof AnalyticsPayloads)[N]>;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  /** Random per-install id. Not linked to email or account in analytics. */
  anonId: string;
  at: string;
  props: Record<string, unknown>;
};

export type AnalyticsSink = (event: AnalyticsEvent) => void;

const AnonIdSchema = z.string().regex(/^anon_[a-z0-9]{8,40}$/u);

export function createAnalytics(sink: AnalyticsSink, anonId: string, now: () => Date = () => new Date()) {
  if (!AnonIdSchema.safeParse(anonId).success) throw new Error('Invalid anonymous id');
  return {
    /** Returns false (and sends nothing) when the payload does not match the schema. */
    track<N extends AnalyticsEventName>(name: N, props: AnalyticsPayload<N>): boolean {
      const parsed = AnalyticsPayloads[name].safeParse(props);
      if (!parsed.success) return false;
      sink({ name, anonId, at: now().toISOString(), props: parsed.data as Record<string, unknown> });
      return true;
    },
  };
}

export function budgetBand(weeklyBudget: number): AnalyticsPayload<'preferences_completed'>['budgetBand'] {
  if (weeklyBudget < 60) return 'under_60';
  if (weeklyBudget < 100) return '60_99';
  if (weeklyBudget < 150) return '100_149';
  return '150_plus';
}

export function preferencesCompletedProps(prefs: UserPreferences): AnalyticsPayload<'preferences_completed'> {
  return {
    retailer: prefs.retailer,
    goal: prefs.proteinGoal,
    maxMinutes: String(prefs.maxMinutes) as '20' | '30' | 'batch',
    householdSize: String(prefs.householdSize) as '1' | '2' | '3_4',
    budgetBand: budgetBand(prefs.weeklyBudget),
    exclusionCount: prefs.exclusions.length,
  };
}

/**
 * Activation (master brief): completed onboarding, generated a plan, opened a
 * meal, opened the grocery list, and checked at least one item.
 */
export function isActivated(events: readonly Pick<AnalyticsEvent, 'name' | 'props'>[]): boolean {
  const has = (n: AnalyticsEventName) => events.some((e) => e.name === n);
  return (
    has('preferences_completed') &&
    has('plan_generation_succeeded') &&
    has('meal_opened') &&
    has('grocery_list_opened') &&
    events.some((e) => e.name === 'grocery_item_checked' && e.props.checked === true)
  );
}
