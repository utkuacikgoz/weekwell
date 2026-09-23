/**
 * Fixture users (A1): valid, allergy-conflict, stale-price, failed-generation,
 * and a low-budget large household. No real personal data.
 */
import type { FixturePriceScenario } from '../pricing';
import type { UserPreferences } from '../schemas';

export type FixtureUser = {
  id: string;
  label: string;
  preferences: UserPreferences;
  priceScenario: FixturePriceScenario;
  generation: 'ok' | 'invalid_output' | 'timeout';
};

export const FIXTURE_USERS: Record<string, FixtureUser> = {
  valid: {
    id: 'user_fixture_valid',
    label: 'Valid: Trader Joe’s, $75, high protein, 30 min, 1 person',
    preferences: { retailer: 'trader_joes', weeklyBudget: 75, proteinGoal: 'high_protein', maxMinutes: 30, householdSize: 1, exclusions: [] },
    priceScenario: 'sample',
    generation: 'ok',
  },
  allergyConflict: {
    id: 'user_fixture_conflict',
    label: 'Allergy conflict: 20 min with dairy, gluten, nuts, fish excluded',
    preferences: { retailer: 'walmart', weeklyBudget: 90, proteinGoal: 'low_carb', maxMinutes: 20, householdSize: 2, exclusions: ['dairy', 'gluten', 'nuts', 'fish'] },
    priceScenario: 'sample',
    generation: 'ok',
  },
  stalePrice: {
    id: 'user_fixture_stale',
    label: 'Stale prices: Walmart estimates last checked 3 days ago',
    preferences: { retailer: 'walmart', weeklyBudget: 80, proteinGoal: 'low_effort', maxMinutes: 30, householdSize: 2, exclusions: ['gluten'] },
    priceScenario: 'stale',
    generation: 'ok',
  },
  failedGeneration: {
    id: 'user_fixture_failed',
    label: 'Failed generation: every model attempt returns invalid output',
    preferences: { retailer: 'trader_joes', weeklyBudget: 75, proteinGoal: 'high_protein', maxMinutes: 30, householdSize: 1, exclusions: [] },
    priceScenario: 'sample',
    generation: 'invalid_output',
  },
  lowBudgetFamily: {
    id: 'user_fixture_family',
    label: 'Over budget: $40 for 3–4 people at Walmart',
    preferences: { retailer: 'walmart', weeklyBudget: 40, proteinGoal: 'family_friendly', maxMinutes: 30, householdSize: '3_4', exclusions: [] },
    priceScenario: 'sample',
    generation: 'ok',
  },
};
