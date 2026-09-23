/**
 * Access policy (D-026, Proposed; the product owner's recommendation from the
 * M1 review): after the free week ends without a subscription, the current
 * plan and grocery list stay readable, but making a new week, swapping meals,
 * and rebuilding need a subscription. Change the policy here only.
 */
import type { EntitlementView } from '@weekwell/domain';

export const ACCESS_POLICY = 'read_only_after_trial' as const;

export function canChangePlan(view: EntitlementView): boolean {
  if (view.state === 'expired') return false;
  // Trial already used and nothing active: same as expired.
  if (view.state === 'none' && !view.trialEligible) return false;
  // Loading or error: don't block cooking and shopping on a slow check.
  return true;
}
