/**
 * Plan generation for the first slice: the deterministic fixture planner.
 * The `invalid_output` and `timeout` scenarios run the real bounded-retry
 * validator with a fake model so failure states can be tested end to end.
 */
import {
  generateFixturePlan,
  generateWithRetries,
  validateModelPlan,
  type GenerationErrorCode,
  type Plan,
  type UserPreferences,
} from '@weekwell/domain';
import type { GenerationScenario } from './scenarios';

export type GenerationResult =
  | { ok: true; plan: Plan }
  | { ok: false; code: GenerationErrorCode; message?: string; suggestions?: string[] };

function planId(): string {
  return `plan_${Date.now().toString(36)}`;
}

export async function generatePlan(prefs: UserPreferences, ownerId: string, scenario: GenerationScenario): Promise<GenerationResult> {
  const ctx = { ownerId, planId: planId(), now: new Date() };
  if (scenario !== 'ok') {
    const out = await generateWithRetries(
      () => (scenario === 'timeout' ? new Promise(() => {}) : Promise.resolve('{"dinners": [')),
      (raw) => validateModelPlan(raw, prefs, ctx),
      { maxAttempts: 2, timeoutMs: 1200 },
    );
    if (out.ok) return { ok: true, plan: out.plan };
    return { ok: false, code: out.code === 'timeout' ? 'timeout' : 'invalid_output' };
  }
  // Yield a frame so the progress screen renders before the planner runs.
  await new Promise((r) => setTimeout(r, 16));
  const result = generateFixturePlan(prefs, ctx);
  if (result.ok) return { ok: true, plan: result.plan };
  return { ok: false, code: 'exclusion_conflict', message: result.feasibility.message, suggestions: result.feasibility.suggestions };
}
