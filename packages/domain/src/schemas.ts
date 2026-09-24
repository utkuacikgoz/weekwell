/**
 * Canonical Weekwell schemas (master brief: "Shared technical contracts").
 *
 * This is the single source for these types. Mobile and any server code import
 * from here; do not redefine slightly different versions elsewhere.
 *
 * Money is always integer cents (USD) so totals are deterministic.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Retailers
// ---------------------------------------------------------------------------

export const RETAILERS = ['trader_joes', 'walmart'] as const;
export const RetailerSchema = z.enum(RETAILERS);
export type Retailer = z.infer<typeof RetailerSchema>;

export const RETAILER_LABEL: Record<Retailer, string> = {
  trader_joes: 'Trader Joe’s',
  walmart: 'Walmart',
};

// ---------------------------------------------------------------------------
// Truth labels (master brief: "Product truth policy", D-010)
// ---------------------------------------------------------------------------

export const ClaimKindSchema = z.enum(['verified', 'estimated', 'editorial']);
export type ClaimKind = z.infer<typeof ClaimKindSchema>;

export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export type Estimate<T> = {
  value: T;
  kind: ClaimKind;
  observedAt?: string;
  source?: string;
  confidence?: Confidence;
  note?: string;
};

/**
 * A verified claim must say where and when it came from. An estimate must say
 * when it was observed or how it was calculated. Anything else is rejected.
 */
export function estimateSchema<T extends z.ZodType>(value: T) {
  return z
    .object({
      value,
      kind: ClaimKindSchema,
      observedAt: z.iso.datetime({ offset: true }).optional(),
      source: z.string().min(1).max(120).optional(),
      confidence: ConfidenceSchema.optional(),
      note: z.string().min(1).max(240).optional(),
    })
    .strict()
    .superRefine((e, ctx) => {
      if (e.kind === 'verified' && (!e.observedAt || !e.source)) {
        ctx.addIssue({ code: 'custom', message: 'verified claims need observedAt and source' });
      }
      if (e.kind === 'estimated' && !e.observedAt && !e.note) {
        ctx.addIssue({ code: 'custom', message: 'estimates need observedAt or a method note' });
      }
    });
}

// ---------------------------------------------------------------------------
// Preferences (D-004)
// ---------------------------------------------------------------------------

export const PROTEIN_GOALS = ['high_protein', 'low_effort', 'low_carb', 'family_friendly'] as const;
export const ProteinGoalSchema = z.enum(PROTEIN_GOALS);
export type ProteinGoal = z.infer<typeof ProteinGoalSchema>;

export const MaxMinutesSchema = z.union([z.literal(20), z.literal(30), z.literal('batch')]);
export type MaxMinutes = z.infer<typeof MaxMinutesSchema>;

export const HouseholdSizeSchema = z.union([z.literal(1), z.literal(2), z.literal('3_4')]);
export type HouseholdSize = z.infer<typeof HouseholdSizeSchema>;

/** Weekly budget bounds in whole dollars. See decision log D-020. */
export const BUDGET_MIN = 30;
export const BUDGET_MAX = 400;
export const BUDGET_STEP = 5;
export const BUDGET_DEFAULT = 80;

/** Preset exclusions offered in onboarding. Custom exclusions are free text. */
export const PRESET_EXCLUSIONS = ['dairy', 'gluten', 'nuts'] as const;
export type PresetExclusion = (typeof PRESET_EXCLUSIONS)[number];

export const MAX_CUSTOM_EXCLUSIONS = 10;
export const MAX_EXCLUSION_LENGTH = 40;

/** Exclusion terms are plain words only: letters, spaces, hyphens, apostrophes. */
export const ExclusionSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(MAX_EXCLUSION_LENGTH)
  .regex(/^[a-z][a-z '\-]*$/u, 'Use letters only, like “mushrooms”.');

export const UserPreferencesSchema = z
  .object({
    retailer: RetailerSchema,
    weeklyBudget: z.number().int().min(BUDGET_MIN).max(BUDGET_MAX),
    proteinGoal: ProteinGoalSchema,
    maxMinutes: MaxMinutesSchema,
    householdSize: HouseholdSizeSchema,
    exclusions: z.array(ExclusionSchema).max(PRESET_EXCLUSIONS.length + MAX_CUSTOM_EXCLUSIONS),
  })
  .strict();
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export function servingsFor(householdSize: HouseholdSize): number {
  return householdSize === '3_4' ? 4 : householdSize;
}

// ---------------------------------------------------------------------------
// Ingredients and meals
// ---------------------------------------------------------------------------

export const ALLERGENS = [
  'dairy',
  'gluten',
  'tree_nuts',
  'peanuts',
  'soy',
  'egg',
  'fish',
  'shellfish',
  'sesame',
] as const;
export const AllergenSchema = z.enum(ALLERGENS);
export type Allergen = z.infer<typeof AllergenSchema>;

/** Canonical units. Every ingredient is priced and consolidated in one of these. */
export const CanonicalUnitSchema = z.enum(['g', 'ml', 'each']);
export type CanonicalUnit = z.infer<typeof CanonicalUnitSchema>;

/** Units a model or recipe may use; converted to canonical before consolidation. */
export const InputUnitSchema = z.enum(['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'each']);
export type InputUnit = z.infer<typeof InputUnitSchema>;

export const STORE_SECTIONS = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'refrigerated',
  'bakery',
  'pantry',
  'frozen',
] as const;
export const StoreSectionSchema = z.enum(STORE_SECTIONS);
export type StoreSection = z.infer<typeof StoreSectionSchema>;

export const STORE_SECTION_LABEL: Record<StoreSection, string> = {
  produce: 'Produce',
  meat_seafood: 'Meat & seafood',
  dairy_eggs: 'Dairy & eggs',
  refrigerated: 'Refrigerated',
  bakery: 'Bread & tortillas',
  pantry: 'Pantry',
  frozen: 'Frozen',
};

export const IdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/u);

export const IngredientSchema = z
  .object({
    id: IdSchema,
    name: z.string().min(1).max(60),
    section: StoreSectionSchema,
    unit: CanonicalUnitSchema,
    allergens: z.array(AllergenSchema),
    /** Grams of protein per canonical unit. Used for deterministic protein estimates. */
    proteinPerUnit: z.number().min(0).max(1_000),
    /** Pantry staples (salt, oil) are listed but not priced. */
    staple: z.boolean().default(false),
    /** Extra words that should match a custom exclusion (e.g. "shrimp" for prawns). */
    aliases: z.array(z.string()).default([]),
  })
  .strict();
export type Ingredient = z.infer<typeof IngredientSchema>;

export const IngredientQuantitySchema = z
  .object({
    ingredientId: IdSchema,
    amount: z.number().positive().max(100_000),
    unit: CanonicalUnitSchema,
  })
  .strict();
export type IngredientQuantity = z.infer<typeof IngredientQuantitySchema>;

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
export const DaySchema = z.enum(DAYS);
export type Day = z.infer<typeof DaySchema>;

export const DAY_LABEL: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
};
export const DAY_SHORT: Record<Day, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
};

export const MealSlotSchema = z.enum(['dinner', 'lunch']);
export type MealSlot = z.infer<typeof MealSlotSchema>;

/**
 * A meal in a plan. Dinners cover one day. A lunch block is cooked once and
 * covers several workdays ("work lunches").
 */
export const MealSchema = z
  .object({
    id: IdSchema,
    recipeId: IdSchema,
    slot: MealSlotSchema,
    day: DaySchema,
    coversDays: z.array(DaySchema).min(1).max(5),
    name: z.string().min(1).max(90),
    ingredients: z.array(IngredientQuantitySchema).min(1).max(30),
    steps: z.array(z.string().min(1).max(400)).min(1).max(15),
    activeMinutes: z.number().int().positive().max(240),
    totalMinutes: z.number().int().positive().max(480),
    servings: z.number().int().positive().max(40),
    /** Protein per serving, grams. */
    protein: estimateSchema(z.number().nonnegative().max(300)),
    allergens: z.array(AllergenSchema),
    reusedIngredientIds: z.array(IdSchema),
  })
  .strict()
  .refine((m) => m.activeMinutes <= m.totalMinutes, 'activeMinutes cannot exceed totalMinutes');
export type Meal = z.infer<typeof MealSchema>;

// ---------------------------------------------------------------------------
// Prices (mobile brief: "Retailer and pricing architecture")
// ---------------------------------------------------------------------------

/**
 * How widely a price applies. `sample` means test data that was never checked
 * at a store; the UI must say so (D-021).
 */
export const LocationScopeSchema = z.enum(['store', 'regional', 'national', 'sample']);
export type LocationScope = z.infer<typeof LocationScopeSchema>;

/** Sanity bound for a single package price. Anything outside is rejected as bad data. */
export const MAX_PACKAGE_PRICE_CENTS = 20_000;

export const PriceQuoteSchema = z
  .object({
    retailer: RetailerSchema,
    ingredientId: IdSchema,
    productName: z.string().min(1).max(80),
    packageSize: z.string().min(1).max(40),
    /** Package contents in the ingredient's canonical unit. */
    packageAmount: z.number().positive(),
    /** Price of one package, cents. */
    unitPrice: estimateSchema(z.number().int().positive().max(MAX_PACKAGE_PRICE_CENTS)),
    /** Packages needed to cover the week's amount. */
    quantityNeeded: z.number().int().positive().max(50),
    /** unitPrice × quantityNeeded, cents. */
    totalContribution: estimateSchema(z.number().int().positive()),
    currency: z.literal('USD'),
    locationScope: LocationScopeSchema,
  })
  .strict()
  .superRefine((q, ctx) => {
    // The brief lists observed-at, confidence, and source as required price fields.
    if (!q.unitPrice.observedAt) ctx.addIssue({ code: 'custom', message: 'price needs observedAt' });
    if (!q.unitPrice.source) ctx.addIssue({ code: 'custom', message: 'price needs source' });
    if (!q.unitPrice.confidence) ctx.addIssue({ code: 'custom', message: 'price needs confidence' });
    if (q.totalContribution.value !== q.unitPrice.value * q.quantityNeeded) {
      ctx.addIssue({ code: 'custom', message: 'totalContribution must equal unitPrice × quantityNeeded' });
    }
    if (q.totalContribution.kind !== q.unitPrice.kind) {
      ctx.addIssue({ code: 'custom', message: 'totalContribution kind must match unitPrice kind' });
    }
  });
export type PriceQuote = z.infer<typeof PriceQuoteSchema>;

// ---------------------------------------------------------------------------
// Grocery list
// ---------------------------------------------------------------------------

export const GroceryItemSchema = z
  .object({
    /** Stable across swaps: equal to the ingredient id. */
    id: IdSchema,
    ingredientId: IdSchema,
    name: z.string(),
    section: StoreSectionSchema,
    amount: z.number().positive(),
    unit: CanonicalUnitSchema,
    staple: z.boolean(),
    mealIds: z.array(IdSchema).min(1),
  })
  .strict();
export type GroceryItem = z.infer<typeof GroceryItemSchema>;

export type MealGroceryLink = { mealId: string; groceryItemId: string };

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const PlanSchema = z
  .object({
    id: IdSchema,
    ownerId: IdSchema,
    createdAt: z.iso.datetime({ offset: true }),
    preferences: UserPreferencesSchema,
    dinners: z.array(MealSchema).length(5),
    lunches: z.array(MealSchema).min(1).max(3),
    generation: z
      .object({
        source: z.enum(['fixture', 'model']),
        promptVersion: z.string().max(40),
        seed: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const days = p.dinners.map((d) => d.day);
    if (new Set(days).size !== 5) ctx.addIssue({ code: 'custom', message: 'dinners must cover five distinct days' });
    if (p.dinners.some((d) => d.slot !== 'dinner')) ctx.addIssue({ code: 'custom', message: 'dinners must have slot dinner' });
    if (p.lunches.some((l) => l.slot !== 'lunch')) ctx.addIssue({ code: 'custom', message: 'lunches must have slot lunch' });
    const ids = [...p.dinners, ...p.lunches].map((m) => m.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'meal ids must be unique' });
  });
export type Plan = z.infer<typeof PlanSchema>;

// ---------------------------------------------------------------------------
// Generation jobs
// ---------------------------------------------------------------------------

export const GENERATION_JOB_STATES = ['queued', 'running', 'succeeded', 'failed', 'timed_out'] as const;
export const GenerationJobStateSchema = z.enum(GENERATION_JOB_STATES);
export type GenerationJobState = z.infer<typeof GenerationJobStateSchema>;

export const GenerationErrorCodeSchema = z.enum([
  'invalid_output',
  'timeout',
  'exclusion_conflict',
  'rate_limited',
  'provider_error',
  'unauthorized',
  'subscription_required',
]);
export type GenerationErrorCode = z.infer<typeof GenerationErrorCodeSchema>;

export type GenerationJob = {
  id: string;
  ownerId: string;
  idempotencyKey: string;
  /** Random, contains no personal data. */
  traceId: string;
  state: GenerationJobState;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  planId?: string;
  errorCode?: GenerationErrorCode;
};
