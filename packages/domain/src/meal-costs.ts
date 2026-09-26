/**
 * Each meal's share of the week's estimated grocery total (D-040 PR5, "cost on
 * every dinner"). A grocery item's cost (the whole packages bought) is split
 * across the meals that use it, in proportion to how much each uses. Shares are
 * rounded so they add up exactly to the displayed total.
 *
 * Price truth: shares come only from displayed provider prices. If any
 * non-staple item lacks a price, there is no total, so there are no shares.
 */
import type { ItemPrice } from './pricing';
import type { GroceryItem, Meal } from './schemas';

export function mealCostShares(meals: readonly Meal[], items: readonly GroceryItem[], prices: ReadonlyMap<string, ItemPrice>): Map<string, number> | null {
  const byId = new Map(meals.map((m) => [m.id, m]));
  const exact = new Map<string, number>(meals.map((m) => [m.id, 0]));
  let total = 0;
  for (const item of items) {
    if (item.staple) continue;
    const p = prices.get(item.id);
    if (p?.status !== 'priced') return null;
    const cents = p.quote.totalContribution.value;
    total += cents;
    const users = item.mealIds
      .map((id) => ({ id, amount: byId.get(id)?.ingredients.find((i) => i.ingredientId === item.ingredientId)?.amount ?? 0 }))
      .filter((u) => u.amount > 0);
    const used = users.reduce((s, u) => s + u.amount, 0);
    if (used <= 0) return null;
    for (const u of users) exact.set(u.id, (exact.get(u.id) ?? 0) + (cents * u.amount) / used);
  }
  // Largest remainder, so the rounded shares sum to the total.
  const floors = [...exact].map(([id, v]) => ({ id, cents: Math.floor(v), rest: v - Math.floor(v) }));
  let left = total - floors.reduce((s, f) => s + f.cents, 0);
  [...floors].sort((a, b) => b.rest - a.rest || a.id.localeCompare(b.id)).forEach((f) => {
    if (left > 0) {
      f.cents += 1;
      left -= 1;
    }
  });
  return new Map(floors.map((f) => [f.id, f.cents]));
}
