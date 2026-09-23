/**
 * Deterministic, fixture-backed plan generation (first implementation slice,
 * item 4). The same preferences always produce the same week.
 *
 * Choice is a small exhaustive search over the fixture catalog, scored on:
 * goal fit, ingredient reuse, protein variety, batch preference, and the
 * sample-cost estimate against the budget. Sample cost is used only to choose;
 * displayed prices always come from the price provider.
 */
import { DINNER_RECIPES, LUNCH_RECIPES, type Recipe } from './catalog/recipes';
import { getIngredient } from './catalog/ingredients';
import { exclusionLabel, recipeIsAllowed } from './exclusions';
import { mealFromRecipe, withReuse } from './grocery';
import { sampleCostCents } from './pricing';
import {
  DAYS,
  PlanSchema,
  servingsFor,
  type Day,
  type MaxMinutes,
  type Meal,
  type Plan,
  type UserPreferences,
} from './schemas';

export const FIXTURE_PROMPT_VERSION = 'fixture-planner-v1';

/** Batch cooking allows longer recipes because they are cooked once for several meals. */
export function minutesAllowed(maxMinutes: MaxMinutes): number {
  return maxMinutes === 'batch' ? 90 : maxMinutes;
}

export function recipeFitsTime(recipe: Recipe, maxMinutes: MaxMinutes): boolean {
  return recipe.totalMinutes <= minutesAllowed(maxMinutes);
}

export function eligibleRecipes(
  prefs: Pick<UserPreferences, 'exclusions' | 'maxMinutes'>,
  slot: 'dinner' | 'lunch',
): Recipe[] {
  const pool = slot === 'dinner' ? DINNER_RECIPES : LUNCH_RECIPES;
  return pool.filter((r) => recipeFitsTime(r, prefs.maxMinutes) && recipeIsAllowed(r, prefs.exclusions));
}

export const DINNERS_PER_WEEK = 5;
export const LUNCH_BLOCKS: ReadonlyArray<{ id: string; coversDays: Day[] }> = [
  { id: 'lunch_a', coversDays: ['mon', 'tue', 'wed'] },
  { id: 'lunch_b', coversDays: ['thu', 'fri'] },
];

export type Feasibility =
  | { ok: true; dinners: number; lunches: number }
  | { ok: false; dinners: number; lunches: number; message: string; suggestions: string[] };

function feasibleCounts(prefs: Pick<UserPreferences, 'exclusions' | 'maxMinutes'>) {
  return { dinners: eligibleRecipes(prefs, 'dinner').length, lunches: eligibleRecipes(prefs, 'lunch').length };
}

function isFeasible(c: { dinners: number; lunches: number }) {
  return c.dinners >= DINNERS_PER_WEEK && c.lunches >= LUNCH_BLOCKS.length;
}

const TIME_LABEL: Record<string, string> = { '20': '20 minutes', '30': '30 minutes', batch: 'batch cooking' };

/**
 * Surface exclusion/time conflicts before generation (Norman: constraints),
 * with the single changes that would fix them.
 */
export function checkFeasibility(prefs: Pick<UserPreferences, 'exclusions' | 'maxMinutes'>): Feasibility {
  const counts = feasibleCounts(prefs);
  if (isFeasible(counts)) return { ok: true, ...counts };

  const suggestions: string[] = [];
  const longer: MaxMinutes[] = prefs.maxMinutes === 20 ? [30, 'batch'] : prefs.maxMinutes === 30 ? ['batch'] : [];
  for (const m of longer) {
    if (isFeasible(feasibleCounts({ ...prefs, maxMinutes: m }))) {
      suggestions.push(`Choose ${TIME_LABEL[String(m)]}.`);
      break;
    }
  }
  for (const term of prefs.exclusions) {
    if (isFeasible(feasibleCounts({ ...prefs, exclusions: prefs.exclusions.filter((e) => e !== term) }))) {
      suggestions.push(`Remove “${exclusionLabel(term)}”.`);
    }
  }
  const parts: string[] = [];
  if (counts.dinners < DINNERS_PER_WEEK) parts.push(`${counts.dinners} of 5 dinners`);
  if (counts.lunches < LUNCH_BLOCKS.length) parts.push(`${counts.lunches} of 2 lunches`);
  return {
    ok: false,
    ...counts,
    message: `With these exclusions and ${TIME_LABEL[String(prefs.maxMinutes)]}, we can only plan ${parts.join(' and ')}.`,
    suggestions: suggestions.length > 0 ? suggestions : ['Remove an exclusion or choose a longer cooking time.'],
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

type Scaled = { recipe: Recipe; amounts: Map<string, number>; mainProtein: string };

function scale(recipe: Recipe, servings: number): Scaled {
  const amounts = new Map<string, number>();
  let best = { id: '', grams: -1 };
  for (const p of recipe.perServing) {
    const ingredient = getIngredient(p.ingredientId);
    if (!ingredient.staple) amounts.set(p.ingredientId, (amounts.get(p.ingredientId) ?? 0) + p.amount * servings);
    const protein = p.amount * ingredient.proteinPerUnit;
    if (protein > best.grams) best = { id: p.ingredientId, grams: protein };
  }
  return { recipe, amounts, mainProtein: best.id };
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i <= items.length - (k - acc.length); i++) {
      acc.push(items[i] as T);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

export function sampleWeekCostCents(retailer: UserPreferences['retailer'], parts: readonly Scaled[]): number {
  const totals = new Map<string, number>();
  for (const part of parts) for (const [id, a] of part.amounts) totals.set(id, (totals.get(id) ?? 0) + a);
  let cents = 0;
  for (const [id, amount] of totals) cents += sampleCostCents(retailer, id, amount);
  return cents;
}

function scoreWeek(prefs: UserPreferences, dinners: readonly Scaled[], lunches: readonly Scaled[]): number {
  const all = [...dinners, ...lunches];
  let score = 0;
  for (const s of all) {
    if (s.recipe.goals.includes(prefs.proteinGoal)) score += 10;
    if (prefs.maxMinutes === 'batch' && s.recipe.batch) score += 6;
    if (prefs.proteinGoal === 'high_protein') {
      score += s.recipe.perServing.reduce((g, p) => g + p.amount * getIngredient(p.ingredientId).proteinPerUnit, 0) / 10;
    }
  }
  // Reuse: ingredients shared across meals mean fewer half-used packages.
  const uses = new Map<string, number>();
  for (const s of all) for (const id of s.amounts.keys()) uses.set(id, (uses.get(id) ?? 0) + 1);
  for (const n of uses.values()) if (n > 1) score += 2 * (n - 1);
  // Variety: avoid the same main protein on several nights.
  const mains = new Map<string, number>();
  for (const d of dinners) mains.set(d.mainProtein, (mains.get(d.mainProtein) ?? 0) + 1);
  for (const n of mains.values()) if (n > 1) score -= 8 * (n - 1);
  // Budget: strong penalty per dollar over.
  const over = sampleWeekCostCents(prefs.retailer, all) - prefs.weeklyBudget * 100;
  if (over > 0) score -= (over / 100) * 5;
  return score;
}

function key(parts: readonly Scaled[]): string {
  return parts.map((p) => p.recipe.id).join('|');
}

type Choice = { dinners: Recipe[]; lunches: Recipe[] };

function chooseWeek(prefs: UserPreferences, dinnerPool: Recipe[], lunchPool: Recipe[], mode: 'balanced' | 'cheapest' = 'balanced'): Choice {
  const servings = servingsFor(prefs.householdSize);
  const dinnersScaled = dinnerPool.map((r) => scale(r, servings));
  const lunchScaled = lunchPool.map((r) => scale(r, servings * 2.5)); // avg of 3- and 2-day blocks, for ranking only
  let best: { score: number; key: string; d: Scaled[]; l: Scaled[] } | null = null;
  const lunchCombos = combinations(lunchScaled, LUNCH_BLOCKS.length);
  for (const d of combinations(dinnersScaled, DINNERS_PER_WEEK)) {
    for (const l of lunchCombos) {
      // Cheapest mode ranks by cost first (1 point per cent), then by the normal score.
      const score = mode === 'cheapest' ? -sampleWeekCostCents(prefs.retailer, [...d, ...l]) * 1000 + scoreWeek(prefs, d, l) : scoreWeek(prefs, d, l);
      const k = `${key(d)}#${key(l)}`;
      // Deterministic tie-break on recipe ids.
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && k < best.key)) {
        best = { score, key: k, d, l };
      }
    }
  }
  if (!best) throw new Error('No feasible week');
  return { dinners: best.d.map((s) => s.recipe), lunches: best.l.map((s) => s.recipe) };
}

/** Longer dinners early in the week, quickest on Thursday and Friday. */
function orderDinners(recipes: readonly Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => b.totalMinutes - a.totalMinutes || a.id.localeCompare(b.id));
}

export function placeDinner(recipe: Recipe, day: Day, prefs: UserPreferences): Meal {
  return mealFromRecipe(recipe, { id: `dinner_${day}`, day, coversDays: [day], servings: servingsFor(prefs.householdSize) });
}

export function placeLunch(recipe: Recipe, blockIndex: number, prefs: UserPreferences): Meal {
  const block = LUNCH_BLOCKS[blockIndex];
  if (!block) throw new Error(`No lunch block ${blockIndex}`);
  return mealFromRecipe(recipe, {
    id: block.id,
    day: block.coversDays[0] as Day,
    coversDays: block.coversDays,
    servings: servingsFor(prefs.householdSize) * block.coversDays.length,
  });
}

export type PlanContext = { ownerId: string; planId: string; now: Date };

export type GenerateResult =
  | { ok: true; plan: Plan }
  | { ok: false; code: 'exclusion_conflict'; feasibility: Extract<Feasibility, { ok: false }> };

export function assemblePlan(prefs: UserPreferences, dinners: readonly Recipe[], lunches: readonly Recipe[], ctx: PlanContext, source: 'fixture' | 'model' = 'fixture', promptVersion = FIXTURE_PROMPT_VERSION): Plan {
  const ordered = orderDinners(dinners);
  const dinnerMeals = DAYS.map((day, i) => placeDinner(ordered[i] as Recipe, day, prefs));
  const lunchMeals = lunches.map((r, i) => placeLunch(r, i, prefs));
  const meals = withReuse([...dinnerMeals, ...lunchMeals]);
  return PlanSchema.parse({
    id: ctx.planId,
    ownerId: ctx.ownerId,
    createdAt: ctx.now.toISOString(),
    preferences: prefs,
    dinners: meals.slice(0, 5),
    lunches: meals.slice(5),
    generation: { source, promptVersion, seed: 0 },
  });
}

export function generateFixturePlan(prefs: UserPreferences, ctx: PlanContext): GenerateResult {
  const feasibility = checkFeasibility(prefs);
  if (!feasibility.ok) return { ok: false, code: 'exclusion_conflict', feasibility };
  const choice = chooseWeek(prefs, eligibleRecipes(prefs, 'dinner'), eligibleRecipes(prefs, 'lunch'));
  return { ok: true, plan: assemblePlan(prefs, choice.dinners, choice.lunches, ctx) };
}

/** Rebuild meals from their recipes for new preferences (e.g. household size), keeping days. */
export function rescalePlan(plan: Plan, prefs: UserPreferences, rebuild: (recipeId: string) => Recipe): Plan {
  const dinners = plan.dinners.map((m) => placeDinner(rebuild(m.recipeId), m.day, prefs));
  const lunches = plan.lunches.map((m, i) => placeLunch(rebuild(m.recipeId), i, prefs));
  const meals = withReuse([...dinners, ...lunches]);
  return PlanSchema.parse({ ...plan, preferences: prefs, dinners: meals.slice(0, 5), lunches: meals.slice(5) });
}

/**
 * "Rebuild under budget": the lowest sample-cost week that still fits the
 * exclusions and time limit. Returns the estimated cost so the UI can say
 * honestly when even the cheapest week is over budget.
 */
export function generateUnderBudgetPlan(prefs: UserPreferences, ctx: PlanContext): GenerateResult & { estimatedCents?: number } {
  const feasibility = checkFeasibility(prefs);
  if (!feasibility.ok) return { ok: false, code: 'exclusion_conflict', feasibility };
  const choice = chooseWeek(prefs, eligibleRecipes(prefs, 'dinner'), eligibleRecipes(prefs, 'lunch'), 'cheapest');
  const plan = assemblePlan(prefs, choice.dinners, choice.lunches, ctx);
  const estimatedCents = sampleWeekCostCents(
    prefs.retailer,
    [...plan.dinners, ...plan.lunches].map((m) => ({ recipe: choice.dinners.concat(choice.lunches).find((r) => r.id === m.recipeId) as Recipe, amounts: new Map(m.ingredients.map((i) => [i.ingredientId, i.amount])), mainProtein: '' })),
  );
  return { ok: true, plan, estimatedCents };
}
