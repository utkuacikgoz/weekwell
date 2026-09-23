import { describe, expect, it } from 'vitest';
import {
  DAYS,
  FIXTURE_USERS,
  checkFeasibility,
  findConflicts,
  generateFixturePlan,
  minutesAllowed,
  type UserPreferences,
} from '../src';
import { CTX, allMeals, planFor } from './helpers';

describe('generateFixturePlan', () => {
  it('builds five dinners Monday to Friday plus two lunch blocks', () => {
    const plan = planFor();
    expect(plan.dinners.map((d) => d.day)).toEqual([...DAYS]);
    expect(plan.lunches).toHaveLength(2);
    expect(plan.lunches.flatMap((l) => l.coversDays)).toEqual([...DAYS]);
    expect(new Set(allMeals(plan).map((m) => m.recipeId)).size).toBe(7);
  });

  it('is deterministic', () => {
    expect(planFor()).toEqual(planFor());
  });

  it('labels protein as an estimate with a method note', () => {
    for (const m of allMeals(planFor())) {
      expect(m.protein.kind).toBe('estimated');
      expect(m.protein.note).toMatch(/Not lab-tested/u);
    }
  });

  it('scales servings to the household', () => {
    const plan = planFor({ ...FIXTURE_USERS.valid!.preferences, householdSize: '3_4' });
    expect(plan.dinners.every((d) => d.servings === 4)).toBe(true);
    expect(plan.lunches[0]!.servings).toBe(12);
    expect(plan.lunches[1]!.servings).toBe(8);
  });

  it('never includes an excluded ingredient, for every preset combination and time', () => {
    const presets = ['dairy', 'gluten', 'nuts', 'fish', 'shellfish', 'egg', 'soy'];
    for (let mask = 0; mask < 1 << presets.length; mask++) {
      const exclusions = presets.filter((_, i) => mask & (1 << i));
      for (const maxMinutes of [20, 30, 'batch'] as const) {
        const prefs: UserPreferences = { ...FIXTURE_USERS.valid!.preferences, exclusions, maxMinutes };
        const result = generateFixturePlan(prefs, CTX);
        if (!result.ok) continue;
        for (const meal of allMeals(result.plan)) {
          expect(findConflicts(meal.ingredients.map((i) => i.ingredientId), exclusions)).toEqual([]);
          expect(meal.totalMinutes).toBeLessThanOrEqual(minutesAllowed(maxMinutes));
        }
      }
    }
  }, 30_000);

  it('honors custom exclusions by ingredient name', () => {
    const plan = planFor({ ...FIXTURE_USERS.valid!.preferences, exclusions: ['chicken', 'spinach'] });
    const ids = allMeals(plan).flatMap((m) => m.ingredients.map((i) => i.ingredientId));
    expect(ids.some((id) => id.includes('chicken'))).toBe(false);
    expect(ids).not.toContain('spinach');
  });

  it('surfaces an allergy conflict before generation, with fixes', () => {
    const prefs = FIXTURE_USERS.allergyConflict!.preferences;
    const feasibility = checkFeasibility(prefs);
    expect(feasibility.ok).toBe(false);
    if (feasibility.ok) return;
    expect(feasibility.message).toMatch(/we can only plan/u);
    expect(feasibility.suggestions.length).toBeGreaterThan(0);
    const result = generateFixturePlan(prefs, CTX);
    expect(result.ok).toBe(false);
  });

  it('handles every exclusion selected without crashing', () => {
    const prefs: UserPreferences = { ...FIXTURE_USERS.valid!.preferences, exclusions: ['dairy', 'gluten', 'nuts', 'fish', 'shellfish', 'egg', 'soy', 'sesame', 'chicken', 'turkey', 'beef'] };
    const result = generateFixturePlan(prefs, CTX);
    expect(result.ok).toBe(false);
  });

  it('prefers batch recipes when batch cooking is chosen', () => {
    const plan = planFor({ ...FIXTURE_USERS.valid!.preferences, maxMinutes: 'batch' });
    expect(plan.dinners.some((d) => d.recipeId.startsWith('d_batch'))).toBe(true);
  });

  it('runs fast enough for a phone (worst case: batch, no exclusions)', () => {
    const start = performance.now();
    planFor({ ...FIXTURE_USERS.valid!.preferences, maxMinutes: 'batch' });
    expect(performance.now() - start).toBeLessThan(1500);
  });
});

describe('generateUnderBudgetPlan', () => {
  it('never costs more than the balanced plan and keeps constraints', async () => {
    const { generateUnderBudgetPlan, buildGroceryList, priceGroceryList, FixtureRetailerProvider } = await import('../src');
    const prefs: UserPreferences = { retailer: 'walmart', weeklyBudget: 40, proteinGoal: 'family_friendly', maxMinutes: 30, householdSize: '3_4', exclusions: ['dairy'] };
    const cheap = generateUnderBudgetPlan(prefs, CTX);
    const normal = generateFixturePlan(prefs, CTX);
    expect(cheap.ok && normal.ok).toBe(true);
    if (!cheap.ok || !normal.ok) return;
    const total = async (p: typeof cheap.plan) => {
      const r = await priceGroceryList(new FixtureRetailerProvider('walmart'), buildGroceryList(allMeals(p)));
      return r.total.status === 'available' ? r.total.totalCents : Infinity;
    };
    const cheapTotal = await total(cheap.plan);
    expect(cheapTotal).toBeLessThanOrEqual(await total(normal.plan));
    expect(cheap.estimatedCents).toBe(cheapTotal);
    for (const m of allMeals(cheap.plan)) expect(findConflicts(m.ingredients.map((i) => i.ingredientId), ['dairy'])).toEqual([]);
  });
});
