import { describe, expect, it } from 'vitest';
import {
  DINNER_RECIPES,
  INGREDIENTS,
  LUNCH_RECIPES,
  PROTEIN_GOALS,
  RECIPES,
  checkFeasibility,
  dishStyle,
  eligibleRecipes,
  findConflicts,
  generateFixturePlan,
  getRecipe,
  minutesAllowed,
  shortfallMessage,
  swapOptions,
  type HouseholdSize,
  type MaxMinutes,
  type UserPreferences,
} from '../src';
import { SAMPLE_PACKAGES } from '../src/fixtures/prices';
import { CTX, allMeals } from './helpers';

const TIMES: MaxMinutes[] = [20, 30, 'batch'];
const HOUSEHOLDS: HouseholdSize[] = [1, 2, '3_4'];
const PRESETS = ['dairy', 'gluten', 'nuts'] as const;
/** Every subset of the three onboarding presets, including none and all three. */
const PRESET_SUBSETS: string[][] = Array.from({ length: 1 << PRESETS.length }, (_, mask) => PRESETS.filter((_, i) => mask & (1 << i)));
/** Common "no X" choices people add on top of the presets. */
const EXTRA_EXCLUSIONS: string[][] = [['chicken'], ['beef'], ['fish'], ['pork'], ['chicken', 'beef', 'fish', 'pork'], ['meat', 'seafood']];

/** Enough to fill the week and still offer real choices when swapping. */
const MIN_DINNERS = 8;
const MIN_LUNCHES = 4;

const base: UserPreferences = { retailer: 'trader_joes', weeklyBudget: 90, proteinGoal: 'high_protein', maxMinutes: 30, householdSize: 2, exclusions: [] };

function expectValidWeek(prefs: UserPreferences) {
  const result = generateFixturePlan(prefs, CTX);
  expect(result.ok, `${JSON.stringify(prefs)} ${result.ok ? '' : result.feasibility.message}`).toBe(true);
  if (!result.ok) return;
  const meals = allMeals(result.plan);
  expect(new Set(meals.map((m) => m.recipeId)).size).toBe(7);
  for (const meal of meals) {
    expect(findConflicts(meal.ingredients.map((i) => i.ingredientId), prefs.exclusions)).toEqual([]);
    expect(meal.totalMinutes).toBeLessThanOrEqual(minutesAllowed(prefs.maxMinutes));
  }
  return result.plan;
}

describe('recipe catalog', () => {
  it('is large: at least 85 dinners and 30 lunches, with unique ids', () => {
    expect(DINNER_RECIPES.length).toBeGreaterThanOrEqual(85);
    expect(LUNCH_RECIPES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  it('keeps recipes well formed', () => {
    for (const r of RECIPES) {
      expect(r.activeMinutes, r.id).toBeLessThanOrEqual(r.totalMinutes);
      expect(new Set(r.perServing.map((p) => p.ingredientId)).size, r.id).toBe(r.perServing.length);
      expect(r.id.startsWith(r.slot === 'dinner' ? 'd_' : 'l_'), r.id).toBe(true);
      // Batch recipes are named so the week view and tests can find them.
      if (r.slot === 'dinner') expect(r.batch, r.id).toBe(r.id.startsWith('d_batch_'));
    }
  });

  it('prices every non-staple ingredient at both stores, and uses every ingredient', () => {
    const used = new Set(RECIPES.flatMap((r) => r.perServing.map((p) => p.ingredientId)));
    for (const ingredient of INGREDIENTS) {
      expect(used.has(ingredient.id), `${ingredient.id} is unused`).toBe(true);
      for (const retailer of ['trader_joes', 'walmart'] as const) {
        const pkg = SAMPLE_PACKAGES[retailer].get(ingredient.id);
        if (ingredient.staple) {
          expect(pkg, `${ingredient.id} is a staple`).toBeUndefined();
        } else {
          expect(pkg, `${retailer} price for ${ingredient.id}`).toBeDefined();
          expect(pkg!.packageAmount).toBeGreaterThan(0);
          expect(pkg!.priceCents).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has plenty of vegetarian dinners', () => {
    const vegetarian = eligibleRecipes({ exclusions: ['meat', 'seafood'], maxMinutes: 'batch' }, 'dinner');
    expect(vegetarian.length).toBeGreaterThanOrEqual(25);
  });
});

describe('catalog coverage', () => {
  it('every preset combination and cooking time leaves many dinners and lunches', () => {
    for (const exclusions of PRESET_SUBSETS) {
      for (const maxMinutes of TIMES) {
        const f = checkFeasibility({ exclusions, maxMinutes });
        expect(f.ok, `${exclusions.join('+')} @ ${maxMinutes}`).toBe(true);
        expect(f.dinners, `${exclusions.join('+')} @ ${maxMinutes}`).toBeGreaterThanOrEqual(3 * MIN_DINNERS);
        expect(f.lunches, `${exclusions.join('+')} @ ${maxMinutes}`).toBeGreaterThanOrEqual(2 * MIN_LUNCHES);
      }
    }
  });

  it('every goal has at least five matching dinners for every preset combination and time', () => {
    for (const exclusions of PRESET_SUBSETS) {
      for (const maxMinutes of TIMES) {
        const pool = eligibleRecipes({ exclusions, maxMinutes }, 'dinner');
        for (const goal of PROTEIN_GOALS) {
          expect(pool.filter((r) => r.goals.includes(goal)).length, `${goal} ${exclusions.join('+')} @ ${maxMinutes}`).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it('adding "no chicken", "no beef", "no fish", "no pork", or vegetarian still fills the week', () => {
    for (const extra of EXTRA_EXCLUSIONS) {
      for (const presets of PRESET_SUBSETS) {
        for (const maxMinutes of TIMES) {
          const exclusions = [...presets, ...extra];
          const f = checkFeasibility({ exclusions, maxMinutes });
          expect(f.ok, `${exclusions.join('+')} @ ${maxMinutes}`).toBe(true);
          expect(f.dinners, `${exclusions.join('+')} @ ${maxMinutes}`).toBeGreaterThanOrEqual(MIN_DINNERS);
          expect(f.lunches, `${exclusions.join('+')} @ ${maxMinutes}`).toBeGreaterThanOrEqual(MIN_LUNCHES);
        }
      }
    }
  });

  it('plans a valid week for every goal × time × household × preset combination, with swaps for every dinner', () => {
    for (const proteinGoal of PROTEIN_GOALS) {
      for (const maxMinutes of TIMES) {
        for (const householdSize of HOUSEHOLDS) {
          for (const exclusions of PRESET_SUBSETS) {
            const plan = expectValidWeek({ ...base, proteinGoal, maxMinutes, householdSize, exclusions });
            if (!plan) continue;
            for (const dinner of plan.dinners) expect(swapOptions(plan, dinner.id)).toHaveLength(3);
          }
        }
      }
    }
  }, 60_000);

  it('plans a valid week with extra exclusions on top of the presets', () => {
    let i = 0;
    for (const extra of EXTRA_EXCLUSIONS) {
      for (const presets of PRESET_SUBSETS) {
        for (const maxMinutes of TIMES) {
          // Rotate goal and household so every pairing is exercised without a full cross product.
          const proteinGoal = PROTEIN_GOALS[i % PROTEIN_GOALS.length]!;
          const householdSize = HOUSEHOLDS[i % HOUSEHOLDS.length]!;
          i++;
          const plan = expectValidWeek({ ...base, proteinGoal, maxMinutes, householdSize, exclusions: [...presets, ...extra] });
          if (plan) expect(swapOptions(plan, plan.dinners[0]!.id).length).toBeGreaterThan(0);
        }
      }
    }
  }, 60_000);

  it('batch cooking with any preset combination gets batch dinners', () => {
    for (const exclusions of PRESET_SUBSETS) {
      expect(eligibleRecipes({ exclusions, maxMinutes: 'batch' }, 'dinner').filter((r) => r.batch).length).toBeGreaterThanOrEqual(5);
      const plan = expectValidWeek({ ...base, maxMinutes: 'batch', exclusions });
      expect(plan!.dinners.filter((d) => d.recipeId.startsWith('d_batch_')).length).toBeGreaterThanOrEqual(2);
    }
  }, 30_000);

  it('a week serves the same kind of dish (tacos, pasta, curry…) at most twice', () => {
    for (const exclusions of PRESET_SUBSETS) {
      for (const maxMinutes of TIMES) {
        const plan = expectValidWeek({ ...base, exclusions, maxMinutes });
        const styles = plan!.dinners.map((d) => dishStyle(getRecipe(d.recipeId)));
        for (const style of new Set(styles)) expect(styles.filter((s) => s === style).length, styles.join(' | ')).toBeLessThanOrEqual(2);
      }
    }
  }, 30_000);
});

describe('not-enough-meals copy', () => {
  it('names what was chosen and how many meals fit', () => {
    expect(shortfallMessage({ exclusions: ['nuts', 'gluten'], maxMinutes: 20 }, { dinners: 3, lunches: 4 })).toBe('Only 3 dinners fit Nut-free, Gluten-free and 20 minutes.');
    expect(shortfallMessage({ exclusions: ['chicken'], maxMinutes: 30 }, { dinners: 1, lunches: 2 })).toBe('Only 1 dinner fits No chicken and 30 minutes.');
    expect(shortfallMessage({ exclusions: [], maxMinutes: 'batch' }, { dinners: 6, lunches: 1 })).toBe('Only 1 lunch fits batch cooking.');
    expect(shortfallMessage({ exclusions: ['dairy'], maxMinutes: 20 }, { dinners: 2, lunches: 0 })).toBe('Only 2 dinners and no lunches fit Dairy-free and 20 minutes.');
  });

  it('counts long exclusion lists instead of reading them out', () => {
    const prefs = { exclusions: ['dairy', 'gluten', 'nuts', 'egg', 'soy', 'meat', 'seafood'], maxMinutes: 20 as const };
    expect(shortfallMessage(prefs, { dinners: 0, lunches: 0 })).toBe('With 7 foods left out and 20 minutes, no meals fit.');
    const f = checkFeasibility(prefs);
    expect(f.ok).toBe(false);
    if (f.ok) return;
    expect(f.message).toBe('With 7 foods left out and 20 minutes, only 3 dinners fit.');
    expect(f.suggestions).toEqual(['Try 30 minutes.', 'Allow meat.', 'Allow seafood.']);
  });
});
