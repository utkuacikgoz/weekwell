/**
 * Test scenarios for QA and design-review captures. Never exposed in release
 * builds: only read in development or from a web preview URL
 * (e.g. `?prices=stale&generation=timeout&fontScale=1.5`).
 */
import { Platform } from 'react-native';
import { FIXTURE_PRICE_SCENARIOS, type FixturePriceScenario } from '@weekwell/domain';

export type GenerationScenario = 'ok' | 'invalid_output' | 'timeout';
export type RestoreScenario = 'ok' | 'error';
export type EntitlementScenario = 'none' | 'trial' | 'active' | 'expired';
export type Scenarios = { prices: FixturePriceScenario; generation: GenerationScenario; restore: RestoreScenario; fontScale: number; priceDelayMs: number; today?: number; entitlement?: EntitlementScenario };

export const DEFAULT_SCENARIOS: Scenarios = { prices: 'sample', generation: 'ok', restore: 'ok', fontScale: 1, priceDelayMs: 0 };

export function scenariosFromUrl(): Partial<Scenarios> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<Scenarios> = {};
  const prices = q.get('prices');
  if (prices && (FIXTURE_PRICE_SCENARIOS as readonly string[]).includes(prices)) out.prices = prices as FixturePriceScenario;
  const generation = q.get('generation');
  if (generation === 'ok' || generation === 'invalid_output' || generation === 'timeout') out.generation = generation;
  const restore = q.get('restore');
  if (restore === 'ok' || restore === 'error') out.restore = restore;
  const fontScale = Number(q.get('fontScale'));
  if (fontScale >= 1 && fontScale <= 2) out.fontScale = fontScale;
  // Review captures pin the weekday so "Tonight" is stable (0 = Sunday … 6 = Saturday).
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days.indexOf(q.get('today') ?? '');
  if (today >= 0) out.today = today;
  const ent = q.get('entitlement');
  if (ent === 'none' || ent === 'trial' || ent === 'active' || ent === 'expired') out.entitlement = ent;
  const delay = Number(q.get('priceDelay'));
  if (delay > 0 && delay <= 30_000) out.priceDelayMs = delay;
  return out;
}
