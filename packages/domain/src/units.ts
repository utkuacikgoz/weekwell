/**
 * Unit conversion and US-friendly quantity display.
 */
import type { CanonicalUnit, InputUnit } from './schemas';

const TO_GRAMS: Partial<Record<InputUnit, number>> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
const TO_ML: Partial<Record<InputUnit, number>> = { ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 };

/** Convert to the ingredient's canonical unit, or null if the dimensions do not match. */
export function toCanonical(amount: number, unit: InputUnit, canonical: CanonicalUnit): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (canonical === 'g' && TO_GRAMS[unit] !== undefined) return amount * TO_GRAMS[unit];
  if (canonical === 'ml' && TO_ML[unit] !== undefined) return amount * TO_ML[unit];
  if (canonical === 'each' && unit === 'each') return amount;
  return null;
}

const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/** 1.25 → "1¼", 0.5 → "½", 3 → "3". Rounds to the nearest quarter (minimum ¼). */
export function formatQuarter(value: number): string {
  const q = Math.max(0.25, Math.round(value * 4) / 4);
  const whole = Math.floor(q);
  const frac = FRACTIONS[q - whole] ?? '';
  if (whole === 0) return frac;
  return `${whole}${frac}`;
}

function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Recipe-style display: "6 oz", "1.3 lb", "2 tbsp", "1½ cups", "½".
 */
export function formatQuantity(amount: number, unit: CanonicalUnit): string {
  if (unit === 'g') {
    if (amount < 28) return `${Math.round(amount)} g`;
    const oz = amount / 28.3495;
    if (oz < 16) return `${round1(oz)} oz`;
    return `${round1(oz / 16)} lb`;
  }
  if (unit === 'ml') {
    if (amount < 14) return `${formatQuarter(amount / 4.92892)} tsp`;
    if (amount < 59) return `${formatQuarter(amount / 14.7868)} tbsp`;
    const cups = amount / 236.588;
    return `${formatQuarter(cups)} ${cups > 1.125 ? 'cups' : 'cup'}`;
  }
  return formatQuarter(amount);
}

/** Whole items you would pick up in store: 2.25 onions → 3. */
export function purchaseCount(amount: number): number {
  return Math.ceil(amount - 1e-9);
}
