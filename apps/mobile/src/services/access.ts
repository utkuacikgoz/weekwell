/**
 * Access policy (D-026, Proposed). The rule lives in the domain package so the
 * API enforces exactly what the app shows.
 */
export { canChangePlan } from '@weekwell/domain';
export const ACCESS_POLICY = 'read_only_after_trial' as const;
