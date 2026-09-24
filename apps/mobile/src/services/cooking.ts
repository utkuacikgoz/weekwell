/** Where cooking mode was left, so an accidental back or app switch can resume it. */
export type CookingSession = { mealId: string; step: number; timerEndsAt: string | null; timerMinutes: number | null; updatedAt: string };

/** "Simmer 15 minutes" → 15; "6–7 minutes" → 7 (the upper bound: the step's own cue still decides). */
export function stepMinutes(step: string): number | null {
  const m = /(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:minutes|minute|min)\b/u.exec(step);
  if (!m) return null;
  const n = Number(m[2] ?? m[1]);
  return n > 0 && n <= 180 ? n : null;
}

/** A cooking session is worth resuming for 12 hours; after that it's yesterday's dinner. */
export const RESUME_WINDOW_MS = 12 * 60 * 60_000;
export function resumable(c: CookingSession | null, mealIds: readonly string[], now = Date.now()): c is CookingSession {
  return !!c && mealIds.includes(c.mealId) && now - Date.parse(c.updatedAt) < RESUME_WINDOW_MS;
}
