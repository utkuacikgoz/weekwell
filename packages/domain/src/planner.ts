/**
 * Deterministic, fixture-backed plan generation (first implementation slice,
 * item 4). The same preferences always produce the same week.
 *
 * Choice is a deterministic local search over the fixture catalog, scored on:
 * goal fit, ingredient reuse, protein variety, batch preference, and the
 * sample-cost estimate against the budget. Sample cost is used only to choose;
 * displayed prices always come from the price provider.
 */
import { DINNER_RECIPES, LUNCH_RECIPES, type Recipe } from './catalog/recipes';
import { getIngredient } from './catalog/ingredients';
import { exclusionLabel, isPresetExclusion, recipeIsAllowed } from './exclusions';
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

function count(n: number, one: string, many: string): string {
  if (n === 0) return `no ${many}`;
  return `${n} ${n === 1 ? one : many}`;
}

/** "a", "a and b", "a, b and c". */
export function listPhrase(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Beyond this many, name the count of foods left out instead of listing them. */
const MAX_NAMED_EXCLUSIONS = 3;

/** What the person chose, in their words: "Nut-free, Gluten-free and 20 minutes". */
export function constraintPhrase(prefs: Pick<UserPreferences, 'exclusions' | 'maxMinutes'>): string {
  const time = TIME_LABEL[String(prefs.maxMinutes)] ?? '';
  const n = prefs.exclusions.length;
  if (n > MAX_NAMED_EXCLUSIONS) return `${n} foods left out and ${time}`;
  return listPhrase([...prefs.exclusions.map(exclusionLabel), time]);
}

/**
 * "Only 3 dinners fit Nut-free, Gluten-free and 20 minutes."
 * "With 7 foods left out and 20 minutes, only 3 dinners fit."
 */
export function shortfallMessage(prefs: Pick<UserPreferences, 'exclusions' | 'maxMinutes'>, counts: { dinners: number; lunches: number }): string {
  const short: string[] = [];
  if (counts.dinners < DINNERS_PER_WEEK) short.push(count(counts.dinners, 'dinner', 'dinners'));
  if (counts.lunches < LUNCH_BLOCKS.length) short.push(count(counts.lunches, 'lunch', 'lunches'));
  const what = counts.dinners === 0 && counts.lunches === 0 ? 'no meals' : listPhrase(short);
  const subject = what.startsWith('no ') ? what : `only ${what}`;
  const verb = short.length === 1 && what.startsWith('1 ') ? 'fits' : 'fit';
  if (prefs.exclusions.length > MAX_NAMED_EXCLUSIONS) return `With ${constraintPhrase(prefs)}, ${subject} ${verb}.`;
  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} ${verb} ${constraintPhrase(prefs)}.`;
}

/** At most this many fixes are offered, the ones that open up the most meals first. */
const MAX_SUGGESTIONS = 3;

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
      suggestions.push(`Try ${TIME_LABEL[String(m)]}.`);
      break;
    }
  }
  const allowOne = prefs.exclusions
    .map((term, i) => ({ term, i, counts: feasibleCounts({ ...prefs, exclusions: prefs.exclusions.filter((e) => e !== term) }) }))
    .filter((x) => isFeasible(x.counts))
    .sort((a, b) => b.counts.dinners + b.counts.lunches - (a.counts.dinners + a.counts.lunches) || a.i - b.i);
  for (const { term } of allowOne) suggestions.push(isPresetExclusion(term) ? `Turn off ${exclusionLabel(term)}.` : `Allow ${term}.`);
  return {
    ok: false,
    ...counts,
    message: shortfallMessage(prefs, counts),
    suggestions: suggestions.length > 0 ? suggestions.slice(0, MAX_SUGGESTIONS) : ['Turn off a food you’re leaving out, or allow more time.'],
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

type Scaled = { recipe: Recipe; amounts: Map<string, number>; mainProtein: string; style: string };

/** What the meal is built on, first match wins. Used only to keep a week from being five taco nights. */
const STYLE_BASES: ReadonlyArray<[style: string, test: (amount: (id: string) => number) => boolean]> = [
  ['soup', (a) => a('chicken_broth') + a('vegetable_broth') >= 200],
  ['curry', (a) => a('coconut_milk') + a('red_curry_paste') + a('curry_powder') > 0],
  ['tortilla', (a) => a('corn_tortillas') + a('flour_tortillas') > 0],
  ['pasta', (a) => a('pasta') + a('rice_pasta') > 0],
  ['noodles', (a) => a('rice_noodles') > 0],
  ['bread', (a) => a('burger_buns') + a('whole_wheat_bread') + a('whole_wheat_pita') + a('naan') > 0],
  ['rice', (a) => a('jasmine_rice') + a('frozen_brown_rice') + a('cauliflower_rice') > 0],
  ['grain', (a) => a('quinoa') + a('couscous') > 0],
  ['potato', (a) => a('baby_potatoes') + a('sweet_potato') > 0],
];

export function dishStyle(recipe: Recipe): string {
  const amount = (id: string) => recipe.perServing.find((p) => p.ingredientId === id)?.amount ?? 0;
  return STYLE_BASES.find(([, test]) => test(amount))?.[0] ?? 'plate';
}

function scale(recipe: Recipe, servings: number): Scaled {
  const amounts = new Map<string, number>();
  let best = { id: '', grams: -1 };
  for (const p of recipe.perServing) {
    const ingredient = getIngredient(p.ingredientId);
    if (!ingredient.staple) amounts.set(p.ingredientId, (amounts.get(p.ingredientId) ?? 0) + p.amount * servings);
    const protein = p.amount * ingredient.proteinPerUnit;
    if (protein > best.grams) best = { id: p.ingredientId, grams: protein };
  }
  return { recipe, amounts, mainProtein: best.id, style: dishStyle(recipe) };
}

export function sampleWeekCostCents(retailer: UserPreferences['retailer'], parts: ReadonlyArray<{ amounts: ReadonlyMap<string, number> }>): number {
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
  for (const n of mains.values()) if (n > 1) score -= 8 * (n - 1) ** 2;
  // Variety: avoid the same kind of dish (tacos, pasta, rice bowls) night after night.
  const styles = new Map<string, number>();
  for (const d of dinners) styles.set(d.style, (styles.get(d.style) ?? 0) + 1);
  for (const n of styles.values()) if (n > 1) score -= 6 * (n - 1) ** 2;
  // Budget: strong penalty per dollar over.
  const over = sampleWeekCostCents(prefs.retailer, all) - prefs.weeklyBudget * 100;
  if (over > 0) score -= (over / 100) * 5;
  return score;
}

type Choice = { dinners: Recipe[]; lunches: Recipe[] };
type Mode = 'balanced' | 'cheapest';

const MAX_IMPROVEMENT_ROUNDS = 60;

/**
 * Choose the week: a greedy start, then best-improvement local search that
 * replaces one meal at a time (or swaps the two lunch blocks) until nothing
 * scores higher. The catalog is too large for an exhaustive search on a phone;
 * this stays deterministic because candidates are always visited in catalog
 * order and only strictly better moves are taken.
 */
function chooseWeek(prefs: UserPreferences, dinnerPool: Recipe[], lunchPool: Recipe[], mode: Mode = 'balanced', seeds: readonly Choice[] = []): Choice {
  const servings = servingsFor(prefs.householdSize);
  const dinnerOptions = dinnerPool.map((r) => scale(r, servings));
  // Each lunch block is cooked once for its days, so cost and reuse are scored at that size.
  const lunchOptions = LUNCH_BLOCKS.map((b) => lunchPool.map((r) => scale(r, servings * b.coversDays.length)));
  // Cheapest mode ranks by cost first (1 point per cent), then by the normal score.
  const objective = (d: readonly Scaled[], l: readonly Scaled[]): number =>
    mode === 'cheapest' ? -sampleWeekCostCents(prefs.retailer, [...d, ...l]) * 1000 + scoreWeek(prefs, d, l) : scoreWeek(prefs, d, l);

  const lunchAt = (block: number, id: string): Scaled | undefined => lunchOptions[block]?.find((s) => s.recipe.id === id);
  const dinnerById = new Map(dinnerOptions.map((s) => [s.recipe.id, s]));

  const greedy = (): { d: Scaled[]; l: Scaled[] } => {
    const d: Scaled[] = [];
    while (d.length < DINNERS_PER_WEEK) {
      let pick: Scaled | null = null;
      let pickScore = -Infinity;
      for (const c of dinnerOptions) {
        if (d.some((x) => x.recipe.id === c.recipe.id)) continue;
        const v = objective([...d, c], []);
        if (v > pickScore + 1e-9) {
          pick = c;
          pickScore = v;
        }
      }
      if (!pick) throw new Error('No feasible week');
      d.push(pick);
    }
    const l: Scaled[] = [];
    for (let b = 0; b < LUNCH_BLOCKS.length; b++) {
      let pick: Scaled | null = null;
      let pickScore = -Infinity;
      for (const c of lunchOptions[b] ?? []) {
        if (l.some((x) => x.recipe.id === c.recipe.id)) continue;
        const v = objective(d, [...l, c]);
        if (v > pickScore + 1e-9) {
          pick = c;
          pickScore = v;
        }
      }
      if (!pick) throw new Error('No feasible week');
      l.push(pick);
    }
    return { d, l };
  };

  const improve = (start: { d: Scaled[]; l: Scaled[] }) => {
    let { d, l } = start;
    let current = objective(d, l);
    for (let round = 0; round < MAX_IMPROVEMENT_ROUNDS; round++) {
      const used = new Set([...d, ...l].map((s) => s.recipe.id));
      const moves: Array<{ d: Scaled[]; l: Scaled[] }> = [];
      for (let i = 0; i < d.length; i++) {
        for (const c of dinnerOptions) if (!used.has(c.recipe.id)) moves.push({ d: d.map((x, j) => (j === i ? c : x)), l });
      }
      for (let b = 0; b < l.length; b++) {
        for (const c of lunchOptions[b] ?? []) if (!used.has(c.recipe.id)) moves.push({ d, l: l.map((x, j) => (j === b ? c : x)) });
      }
      if (l.length === 2) {
        const [a, b] = [lunchAt(0, l[1]!.recipe.id), lunchAt(1, l[0]!.recipe.id)];
        if (a && b) moves.push({ d, l: [a, b] });
      }
      let best: { d: Scaled[]; l: Scaled[]; v: number } | null = null;
      for (const m of moves) {
        const v = objective(m.d, m.l);
        if (v > current + 1e-9 && (!best || v > best.v + 1e-9)) best = { ...m, v };
      }
      if (!best) break;
      d = best.d;
      l = best.l;
      current = best.v;
    }
    return { d, l, v: current };
  };

  const starts = [greedy()];
  for (const seed of seeds) {
    const d = seed.dinners.map((r) => dinnerById.get(r.id));
    const l = seed.lunches.map((r, b) => lunchAt(b, r.id));
    if (d.every((x): x is Scaled => !!x) && l.every((x): x is Scaled => !!x)) starts.push({ d, l });
  }
  let result: { d: Scaled[]; l: Scaled[]; v: number } | null = null;
  for (const s of starts) {
    const r = improve(s);
    if (!result || r.v > result.v + 1e-9) result = r;
  }
  if (!result) throw new Error('No feasible week');
  return { dinners: result.d.map((s) => s.recipe), lunches: result.l.map((s) => s.recipe) };
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
  const dinners = eligibleRecipes(prefs, 'dinner');
  const lunches = eligibleRecipes(prefs, 'lunch');
  // Start from the balanced week too, so the cheapest week never costs more than it.
  const balanced = chooseWeek(prefs, dinners, lunches);
  const choice = chooseWeek(prefs, dinners, lunches, 'cheapest', [balanced]);
  const plan = assemblePlan(prefs, choice.dinners, choice.lunches, ctx);
  const estimatedCents = sampleWeekCostCents(
    prefs.retailer,
    [...plan.dinners, ...plan.lunches].map((m) => ({ recipe: choice.dinners.concat(choice.lunches).find((r) => r.id === m.recipeId) as Recipe, amounts: new Map(m.ingredients.map((i) => [i.ingredientId, i.amount])), mainProtein: '' })),
  );
  return { ok: true, plan, estimatedCents };
}
