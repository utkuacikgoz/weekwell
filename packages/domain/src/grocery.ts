/**
 * Meal scaling and grocery consolidation. Deterministic: the same meals always
 * produce the same list in the same order.
 */
import { getIngredient } from './catalog/ingredients';
import type { Recipe } from './catalog/recipes';
import { allergensOf } from './exclusions';
import { STORE_SECTIONS, type Day, type GroceryItem, type Meal, type MealGroceryLink } from './schemas';

export const PROTEIN_METHOD_NOTE = 'Calculated from typical ingredient values. Not lab-tested.';

function roundAmount(amount: number, unit: 'g' | 'ml' | 'each'): number {
  if (unit === 'each') return Math.max(0.25, Math.round(amount * 4) / 4);
  return Math.max(1, Math.round(amount));
}

/** Grams of protein per serving, from ingredient averages. */
export function proteinPerServing(perServing: ReadonlyArray<{ ingredientId: string; amount: number }>): number {
  const total = perServing.reduce((sum, p) => sum + p.amount * getIngredient(p.ingredientId).proteinPerUnit, 0);
  return Math.round(total);
}

export type MealPlacement = { id: string; day: Day; coversDays: Day[]; servings: number };

/** Turn a per-serving recipe into a plan meal for the given number of servings. */
export function mealFromRecipe(recipe: Recipe, placement: MealPlacement): Meal {
  const ingredients = recipe.perServing.map((p) => {
    const unit = getIngredient(p.ingredientId).unit;
    return { ingredientId: p.ingredientId, amount: roundAmount(p.amount * placement.servings, unit), unit };
  });
  return {
    id: placement.id,
    recipeId: recipe.id,
    slot: recipe.slot,
    day: placement.day,
    coversDays: placement.coversDays,
    name: recipe.name,
    ingredients,
    steps: recipe.steps,
    activeMinutes: recipe.activeMinutes,
    totalMinutes: recipe.totalMinutes,
    servings: placement.servings,
    protein: {
      value: proteinPerServing(recipe.perServing),
      kind: 'estimated',
      confidence: 'medium',
      note: PROTEIN_METHOD_NOTE,
    },
    allergens: allergensOf(recipe.perServing.map((p) => p.ingredientId)),
    reusedIngredientIds: [],
  };
}

/** Mark ingredients that appear in more than one meal (so one package serves several meals). */
export function withReuse(meals: readonly Meal[]): Meal[] {
  const counts = new Map<string, number>();
  for (const m of meals) {
    for (const id of new Set(m.ingredients.map((i) => i.ingredientId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return meals.map((m) => ({
    ...m,
    reusedIngredientIds: m.ingredients
      .map((i) => i.ingredientId)
      .filter((id) => (counts.get(id) ?? 0) > 1 && !getIngredient(id).staple),
  }));
}

const SECTION_ORDER = new Map(STORE_SECTIONS.map((s, i) => [s, i]));

/**
 * Consolidate ingredients across meals into one list, grouped by store section.
 * Each item keeps the ids of the meals that use it.
 */
export function buildGroceryList(meals: readonly Meal[]): GroceryItem[] {
  const byId = new Map<string, GroceryItem>();
  for (const meal of meals) {
    for (const q of meal.ingredients) {
      const ingredient = getIngredient(q.ingredientId);
      if (q.unit !== ingredient.unit) throw new Error(`Unit mismatch for ${q.ingredientId}: ${q.unit}`);
      const existing = byId.get(q.ingredientId);
      if (existing) {
        existing.amount = roundAmount(existing.amount + q.amount, q.unit);
        if (!existing.mealIds.includes(meal.id)) existing.mealIds.push(meal.id);
      } else {
        byId.set(q.ingredientId, {
          id: q.ingredientId,
          ingredientId: q.ingredientId,
          name: ingredient.name,
          section: ingredient.section,
          amount: q.amount,
          unit: q.unit,
          staple: ingredient.staple,
          mealIds: [meal.id],
        });
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      Number(a.staple) - Number(b.staple) ||
      (SECTION_ORDER.get(a.section) ?? 0) - (SECTION_ORDER.get(b.section) ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

export function groceryLinks(items: readonly GroceryItem[]): MealGroceryLink[] {
  return items.flatMap((i) => i.mealIds.map((mealId) => ({ mealId, groceryItemId: i.id })));
}

export type GroceryDiff = {
  added: GroceryItem[];
  removed: GroceryItem[];
  changed: Array<{ item: GroceryItem; beforeAmount: number }>;
};

export function diffGroceryLists(before: readonly GroceryItem[], after: readonly GroceryItem[]): GroceryDiff {
  const beforeById = new Map(before.map((i) => [i.id, i]));
  const afterById = new Map(after.map((i) => [i.id, i]));
  return {
    added: after.filter((i) => !beforeById.has(i.id)),
    removed: before.filter((i) => !afterById.has(i.id)),
    changed: after
      .filter((i) => {
        const b = beforeById.get(i.id);
        return b !== undefined && b.amount !== i.amount;
      })
      .map((item) => ({ item, beforeAmount: beforeById.get(item.id)?.amount ?? 0 })),
  };
}

/**
 * Keep checks for items that still exist. Report checked items that were
 * removed or whose amount changed so the UI can explain them.
 */
export function reconcileChecks(
  checked: ReadonlySet<string>,
  diff: GroceryDiff,
  after: readonly GroceryItem[],
): { checked: Set<string>; removedChecked: GroceryItem[]; changedChecked: GroceryItem[] } {
  const stillThere = new Set(after.map((i) => i.id));
  return {
    checked: new Set([...checked].filter((id) => stillThere.has(id))),
    removedChecked: diff.removed.filter((i) => checked.has(i.id)),
    changedChecked: diff.changed.filter((c) => checked.has(c.item.id)).map((c) => c.item),
  };
}
