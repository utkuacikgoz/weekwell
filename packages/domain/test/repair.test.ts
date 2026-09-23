import { describe, expect, it } from 'vitest';
import {
  FIXTURE_USERS,
  buildGroceryList,
  findReplacement,
  getRecipe,
  previewPreferenceChange,
  proteinPerServing,
  reconcileChecks,
  replaceMeal,
  restoreMeal,
  sampleCostCents,
} from '../src';
import { CTX, allMeals, planFor } from './helpers';

describe('meal swap', () => {
  const plan = planFor();

  it('changes only the intended meal', () => {
    const target = plan.dinners[2]!;
    const replacement = findReplacement(plan, target.id, 'swap');
    expect(replacement).not.toBeNull();
    const { plan: next, previous } = replaceMeal(plan, target.id, replacement!);
    expect(previous.recipeId).toBe(target.recipeId);
    allMeals(next).forEach((m, i) => {
      if (m.id === target.id) expect(m.recipeId).toBe(replacement!.id);
      else expect(m.recipeId).toBe(allMeals(plan)[i]!.recipeId);
    });
    expect(next.dinners[2]!.day).toBe(target.day);
  });

  it('updates the affected groceries and can be undone exactly', () => {
    const target = plan.dinners[0]!;
    const swapped = replaceMeal(plan, target.id, findReplacement(plan, target.id, 'swap')!);
    expect(swapped.diff.added.length + swapped.diff.removed.length + swapped.diff.changed.length).toBeGreaterThan(0);
    const undone = restoreMeal(swapped.plan, swapped.previous);
    expect(undone.plan).toEqual(plan);
  });

  it('cheaper / more protein / faster move in the right direction', () => {
    for (const meal of plan.dinners) {
      const current = getRecipe(meal.recipeId);
      const cost = (id: string) => getRecipe(id).perServing.reduce((s, p) => s + sampleCostCents(plan.preferences.retailer, p.ingredientId, p.amount), 0);
      const cheaper = findReplacement(plan, meal.id, 'cheaper');
      if (cheaper) expect(cost(cheaper.id)).toBeLessThan(cost(current.id));
      const protein = findReplacement(plan, meal.id, 'more_protein');
      if (protein) expect(proteinPerServing(protein.perServing)).toBeGreaterThan(proteinPerServing(current.perServing));
      const faster = findReplacement(plan, meal.id, 'faster');
      if (faster) expect(faster.totalMinutes).toBeLessThan(current.totalMinutes);
    }
  });

  it('never proposes a replacement that breaks exclusions', () => {
    const p = planFor({ ...FIXTURE_USERS.valid!.preferences, exclusions: ['dairy', 'gluten'] });
    for (const meal of allMeals(p)) {
      const r = findReplacement(p, meal.id, 'swap');
      if (r) expect(() => replaceMeal(p, meal.id, r)).not.toThrow();
    }
  });

  it('preserves checks for items that remain and reports changed ones', () => {
    const before = buildGroceryList(allMeals(plan));
    const checked = new Set(before.map((i) => i.id)); // everything checked
    const target = plan.dinners[1]!;
    const swapped = replaceMeal(plan, target.id, findReplacement(plan, target.id, 'swap')!);
    const after = buildGroceryList(allMeals(swapped.plan));
    const r = reconcileChecks(checked, swapped.diff, after);
    expect([...r.checked].every((id) => after.some((i) => i.id === id))).toBe(true);
    expect(r.removedChecked.map((i) => i.id).sort()).toEqual(swapped.diff.removed.map((i) => i.id).sort());
    expect(r.changedChecked.length).toBe(swapped.diff.changed.length);
  });
});

describe('preference changes', () => {
  const plan = planFor();

  it('switching store keeps meals and says how many prices may change', () => {
    const preview = previewPreferenceChange(plan, { ...plan.preferences, retailer: 'walmart' }, CTX);
    expect(preview.mealsChanged).toHaveLength(0);
    expect(preview.pricesAffected).toBeGreaterThan(0);
    expect(preview.summary).toMatch(/^Changing to Walmart may change \d+ prices/u);
  });

  it('adding an exclusion replaces only conflicting meals', () => {
    const conflicting = allMeals(plan).filter((m) => m.allergens.includes('gluten'));
    const preview = previewPreferenceChange(plan, { ...plan.preferences, exclusions: ['gluten'] }, CTX);
    expect(preview.blocked).toBeUndefined();
    expect(preview.mealsChanged.map((m) => m.id).sort()).toEqual(conflicting.map((m) => m.id).sort());
    expect(allMeals(preview.plan).every((m) => !m.allergens.includes('gluten'))).toBe(true);
  });

  it('blocks a change that leaves too few meals and keeps the plan', () => {
    const preview = previewPreferenceChange(plan, { ...plan.preferences, maxMinutes: 20, exclusions: ['dairy', 'gluten', 'nuts', 'fish'] }, CTX);
    expect(preview.blocked).toBeDefined();
    expect(preview.plan).toBe(plan);
  });

  it('household change rescales quantities without changing meals', () => {
    const preview = previewPreferenceChange(plan, { ...plan.preferences, householdSize: 2 }, CTX);
    expect(preview.mealsChanged).toHaveLength(0);
    expect(preview.diff.changed.length).toBeGreaterThan(0);
    expect(preview.plan.dinners.every((d) => d.servings === 2)).toBe(true);
  });
});
