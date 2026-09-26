import { describe, expect, it } from 'vitest';
import { FixtureRetailerProvider, buildGroceryList, getRecipe, mealCostShares, priceGroceryList, swapOptions } from '../src';
import { NOW, allMeals, planFor } from './helpers';

describe('meal cost shares (PR5)', () => {
  it('splits the priced total across meals, summing exactly to it', async () => {
    const plan = planFor();
    const meals = allMeals(plan);
    const items = buildGroceryList(meals);
    const res = await priceGroceryList(new FixtureRetailerProvider('trader_joes', 'sample'), items, { now: NOW });
    expect(res.total.status).toBe('available');
    const shares = mealCostShares(meals, items, res.items)!;
    expect(shares).not.toBeNull();
    const sum = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(res.total.status === 'available' ? res.total.totalCents : -1);
    for (const m of meals) expect(shares.get(m.id)).toBeGreaterThan(0);
  });

  it('shows no shares when any item has no price (no total, no shares)', async () => {
    const plan = planFor();
    const meals = allMeals(plan);
    const items = buildGroceryList(meals);
    const res = await priceGroceryList(new FixtureRetailerProvider('trader_joes', 'partial'), items, { now: NOW });
    expect(res.total.status).toBe('withheld');
    expect(mealCostShares(meals, items, res.items)).toBeNull();
  });

  it('cheaper swap options only cost less, cheapest first', () => {
    const plan = planFor();
    const target = plan.dinners[0]!;
    const opts = swapOptions(plan, target.id, 3, 'cheaper');
    for (const o of opts) expect(o.costDeltaCents).toBeLessThan(0);
    for (let i = 1; i < opts.length; i++) expect(opts[i]!.costDeltaCents).toBeGreaterThanOrEqual(opts[i - 1]!.costDeltaCents);
    expect(opts.every((o) => o.recipe.slot === getRecipe(target.recipeId).slot)).toBe(true);
  });
});
