/**
 * Plan repair: swap one meal, make it cheaper, increase protein, reduce
 * cooking time, and preference edits that show exactly what will change.
 * Everything not targeted stays the same.
 */
import { getRecipe, type Recipe } from './catalog/recipes';
import { exclusionLabel, recipeIsAllowed } from './exclusions';
import { buildGroceryList, diffGroceryLists, proteinPerServing, withReuse, type GroceryDiff } from './grocery';
import { eligibleRecipes, generateFixturePlan, placeDinner, placeLunch, recipeFitsTime, rescalePlan, sampleWeekCostCents, type PlanContext } from './planner';
import { sampleCostCents } from './pricing';
import { PlanSchema, RETAILER_LABEL, servingsFor, type Meal, type Plan, type UserPreferences } from './schemas';

export const REPAIR_ACTIONS = ['swap', 'cheaper', 'more_protein', 'faster'] as const;
export type RepairAction = (typeof REPAIR_ACTIONS)[number];

export const REPAIR_ACTION_LABEL: Record<RepairAction, string> = {
  swap: 'Swap this meal',
  cheaper: 'Make it cheaper',
  more_protein: 'Increase protein',
  faster: 'Reduce cooking time',
};

function allMeals(plan: Plan): Meal[] {
  return [...plan.dinners, ...plan.lunches];
}

function recipeCost(recipe: Recipe, prefs: UserPreferences): number {
  const servings = servingsFor(prefs.householdSize);
  return recipe.perServing.reduce((sum, p) => sum + sampleCostCents(prefs.retailer, p.ingredientId, p.amount * servings), 0);
}

function reuseWith(recipe: Recipe, others: readonly Meal[]): number {
  const used = new Set(others.flatMap((m) => m.ingredients.map((i) => i.ingredientId)));
  return recipe.perServing.filter((p) => used.has(p.ingredientId)).length;
}

/**
 * Pick a replacement for one meal, or null when nothing better exists.
 * Candidates respect exclusions and time and are not already in the plan.
 */
export function findReplacement(plan: Plan, mealId: string, action: RepairAction): Recipe | null {
  return rankedReplacements(plan, mealId, action)[0] ?? null;
}

export type SwapOption = {
  recipe: Recipe;
  /** Positive is longer than the current meal. */
  minutesDelta: number;
  /** Sample-price estimate for the whole household; positive costs more. */
  costDeltaCents: number;
  proteinDelta: number;
};

/**
 * The best few swaps for one meal (D-040 SW2: "choose from three"), best first.
 * The first is always what `findReplacement(plan, mealId, action)` would pick.
 * `cheaper` (PR5 "swap, save $6") lists only lower-cost meals, cheapest first.
 */
export function swapOptions(plan: Plan, mealId: string, count = 3, action: 'swap' | 'cheaper' = 'swap'): SwapOption[] {
  const meal = allMeals(plan).find((m) => m.id === mealId);
  if (!meal) return [];
  const current = getRecipe(meal.recipeId);
  const prefs = plan.preferences;
  const cost = recipeCost(current, prefs);
  const protein = proteinPerServing(current.perServing);
  return rankedReplacements(plan, mealId, action)
    .slice(0, count)
    .map((recipe) => ({
      recipe,
      minutesDelta: recipe.totalMinutes - current.totalMinutes,
      costDeltaCents: recipeCost(recipe, prefs) - cost,
      proteinDelta: proteinPerServing(recipe.perServing) - protein,
    }));
}

function rankedReplacements(plan: Plan, mealId: string, action: RepairAction): Recipe[] {
  const meal = allMeals(plan).find((m) => m.id === mealId);
  if (!meal) return [];
  const prefs = plan.preferences;
  const inPlan = new Set(allMeals(plan).map((m) => m.recipeId));
  const current = getRecipe(meal.recipeId);
  const others = allMeals(plan).filter((m) => m.id !== mealId);
  const candidates = eligibleRecipes(prefs, meal.slot).filter((r) => !inPlan.has(r.id));

  const currentProtein = proteinPerServing(current.perServing);
  const currentCost = recipeCost(current, prefs);
  const filtered = candidates.filter((r) => {
    if (action === 'cheaper') return recipeCost(r, prefs) < currentCost;
    if (action === 'more_protein') return proteinPerServing(r.perServing) > currentProtein;
    if (action === 'faster') return r.totalMinutes < current.totalMinutes;
    return true;
  });

  const rank = (r: Recipe): number => {
    switch (action) {
      case 'cheaper':
        return -recipeCost(r, prefs);
      case 'more_protein':
        return proteinPerServing(r.perServing);
      case 'faster':
        return -r.totalMinutes;
      case 'swap':
        return (r.goals.includes(prefs.proteinGoal) ? 10 : 0) + reuseWith(r, others) * 2;
    }
  };
  return [...filtered].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
}

export type ReplaceResult = { plan: Plan; previous: Meal; next: Meal; diff: GroceryDiff };

/** Replace exactly one meal. Other meals are untouched. */
export function replaceMeal(plan: Plan, mealId: string, recipe: Recipe): ReplaceResult {
  const meals = allMeals(plan);
  const index = meals.findIndex((m) => m.id === mealId);
  const previous = meals[index];
  if (!previous) throw new Error(`No meal ${mealId}`);
  if (recipe.slot !== previous.slot) throw new Error('Replacement must be the same kind of meal');
  if (!recipeIsAllowed(recipe, plan.preferences.exclusions)) throw new Error('Replacement conflicts with exclusions');

  const lunchIndex = plan.lunches.findIndex((m) => m.id === mealId);
  const placed = previous.slot === 'dinner' ? placeDinner(recipe, previous.day, plan.preferences) : placeLunch(recipe, lunchIndex, plan.preferences);
  const nextMeals = withReuse(meals.map((m, i) => (i === index ? placed : m)));
  const nextPlan = PlanSchema.parse({ ...plan, dinners: nextMeals.slice(0, 5), lunches: nextMeals.slice(5) });
  const next = nextMeals[index] as Meal;
  return { plan: nextPlan, previous, next, diff: diffGroceryLists(buildGroceryList(meals), buildGroceryList(nextMeals)) };
}

/** Put a previous meal back (undo a swap). */
export function restoreMeal(plan: Plan, previous: Meal): ReplaceResult {
  return replaceMeal(plan, previous.id, getRecipe(previous.recipeId));
}

// ---------------------------------------------------------------------------
// Preference edits
// ---------------------------------------------------------------------------

export type PreferenceChangePreview = {
  plan: Plan;
  mealsChanged: Meal[];
  diff: GroceryDiff;
  pricesAffected: number;
  ingredientsChanged: number;
  summary: string;
  /** Not possible with the new preferences (e.g. exclusions leave too few meals). */
  blocked?: string;
};

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Compute the plan that would result from new preferences, without applying it.
 * Retailer, household, and budget edits keep meals when possible; exclusion and
 * time edits replace only meals that no longer fit; a goal change rebuilds the week.
 */
export function previewPreferenceChange(plan: Plan, next: UserPreferences, ctx: PlanContext): PreferenceChangePreview {
  const prev = plan.preferences;
  const before = buildGroceryList(allMeals(plan));
  let candidate: Plan;

  const lowerBudgetNowOver = next.weeklyBudget < prev.weeklyBudget && overBudget(plan, next);
  if (next.proteinGoal !== prev.proteinGoal || lowerBudgetNowOver) {
    const result = generateFixturePlan(next, { ...ctx, planId: plan.id, ownerId: plan.ownerId });
    if (!result.ok) return blockedPreview(plan, result.feasibility.message);
    candidate = result.plan;
  } else {
    candidate = rescalePlan(plan, next, getRecipe);
    // Replace meals that no longer fit the exclusions or time limit.
    for (const meal of allMeals(candidate)) {
      const recipe = getRecipe(meal.recipeId);
      if (recipeIsAllowed(recipe, next.exclusions) && recipeFitsTime(recipe, next.maxMinutes)) continue;
      const replacement = findReplacement(candidate, meal.id, 'swap');
      if (!replacement) {
        const reason = next.exclusions.length > 0 ? `“${next.exclusions.map(exclusionLabel).join('”, “')}”` : 'this cooking time';
        return blockedPreview(plan, `We don’t have enough meals that fit ${reason}. Your current plan is unchanged.`);
      }
      candidate = replaceMeal(candidate, meal.id, replacement).plan;
    }
  }

  const after = buildGroceryList(allMeals(candidate));
  const diff = diffGroceryLists(before, after);
  const mealsChanged = allMeals(candidate).filter((m, i) => allMeals(plan)[i]?.recipeId !== m.recipeId);
  const ingredientsChanged = diff.added.length + diff.removed.length;
  const pricesAffected =
    next.retailer !== prev.retailer
      ? after.filter((i) => !i.staple).length
      : diff.added.filter((i) => !i.staple).length + diff.changed.filter((c) => !c.item.staple).length;

  const parts: string[] = [];
  if (next.retailer !== prev.retailer) parts.push(`Changing to ${RETAILER_LABEL[next.retailer]} may change ${plural(pricesAffected, 'price')}`);
  if (mealsChanged.length > 0) parts.push(`${plural(mealsChanged.length, 'meal')} will change`);
  if (ingredientsChanged > 0) parts.push(`${plural(ingredientsChanged, 'ingredient')} will change`);
  if (diff.changed.length > 0 && next.householdSize !== prev.householdSize) parts.push(`${plural(diff.changed.length, 'quantity', 'quantities')} will change`);
  const summary = parts.length > 0 ? `${parts.join(', ')}.` : 'Your meals and grocery list stay the same.';
  return { plan: candidate, mealsChanged, diff, pricesAffected, ingredientsChanged, summary };
}

function overBudget(plan: Plan, prefs: UserPreferences): boolean {
  const cost = sampleWeekCostCents(
    prefs.retailer,
    allMeals(plan).map((m) => ({
      recipe: getRecipe(m.recipeId),
      amounts: new Map(m.ingredients.map((i) => [i.ingredientId, i.amount])),
      mainProtein: '',
    })),
  );
  return cost > prefs.weeklyBudget * 100;
}

function blockedPreview(plan: Plan, message: string): PreferenceChangePreview {
  return {
    plan,
    mealsChanged: [],
    diff: { added: [], removed: [], changed: [] },
    pricesAffected: 0,
    ingredientsChanged: 0,
    summary: message,
    blocked: message,
  };
}
