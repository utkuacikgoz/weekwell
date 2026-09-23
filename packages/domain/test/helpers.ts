import { FIXTURE_USERS, generateFixturePlan, type Plan, type UserPreferences } from '../src';

export const NOW = new Date('2026-09-23T15:00:00.000Z');
export const CTX = { ownerId: 'user_a', planId: 'plan_1', now: NOW };

export function planFor(prefs: UserPreferences = FIXTURE_USERS.valid!.preferences): Plan {
  const result = generateFixturePlan(prefs, CTX);
  if (!result.ok) throw new Error(result.feasibility.message);
  return result.plan;
}

export function allMeals(plan: Plan) {
  return [...plan.dinners, ...plan.lunches];
}
