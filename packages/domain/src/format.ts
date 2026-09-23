/**
 * Display formatting shared by every surface, so wording stays consistent
 * (Norman: consistency). Copy examples come from the mobile brief.
 */
import type { Meal } from './schemas';

/** "$57" for totals, "$6.99" for items. */
export function formatMoney(cents: number, options: { whole?: boolean } = {}): string {
  if (options.whole) return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
  return `$${(cents / 100).toFixed(2)}`;
}

/** "just now", "2 hours ago", "3 days ago". */
export function formatRelativeTime(iso: string, now: Date): string {
  const diff = now.getTime() - Date.parse(iso);
  if (Number.isNaN(diff)) return 'at an unknown time';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "Sep 20" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatMinutes(minutes: number): string {
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** "18 minutes · 42g protein · serves 1" */
export function mealMetaLine(meal: Pick<Meal, 'totalMinutes' | 'protein' | 'servings' | 'slot'>): string {
  const serves = meal.slot === 'lunch' ? `makes ${meal.servings} lunches` : `serves ${meal.servings}`;
  return `${formatMinutes(meal.totalMinutes)} · ${meal.protein.value}g protein · ${serves}`;
}
