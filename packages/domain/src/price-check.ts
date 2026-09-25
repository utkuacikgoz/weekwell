/**
 * Store price check (D-011 option: "check the prices by hand once"). Pure
 * logic for the sheet a person fills in at a real store, and for turning that
 * sheet into checked package prices. The IO lives in scripts/price-check.ts.
 *
 * Rules:
 * - A store is all-or-nothing: every item Weekwell prices at that store must
 *   have a checked price, or the import fails. Checked and sample prices are
 *   never mixed in one total.
 * - Amounts are entered in everyday units (oz, lb, fl oz, count) and converted
 *   to the ingredient's canonical unit here.
 * - A checked price is an estimate for that store on that date
 *   (`kind: 'estimated'`, `locationScope: 'store'`). It isn't live or
 *   verified at checkout.
 */
import { getIngredient } from './catalog/ingredients';
import { SAMPLE_PACKAGES } from './fixtures/prices';
import { MAX_PACKAGE_PRICE_CENTS, type CanonicalUnit, type Retailer } from './schemas';

export type CheckedPackage = { productName: string; packageSize: string; packageAmount: number; priceCents: number };
export type CheckedStore = {
  /** Calendar date of the check, YYYY-MM-DD. */
  checkedOn: string;
  /** Which store, as people would say it: "Trader Joe’s, Court St, Brooklyn NY". */
  location: string;
  items: Record<string, CheckedPackage>;
};

/** After this many days a check is too old to show; the app goes back to labelled sample prices. */
export const STORE_CHECK_FRESH_DAYS = 14;
export const STORE_CHECK_MAX_AGE_DAYS = 45;

export const SHEET_COLUMNS = ['ingredient_id', 'aisle', 'item', 'look_for', 'enter_amount_in', 'product_name', 'amount', 'unit', 'price', 'notes'] as const;

const UNITS: Record<CanonicalUnit, Record<string, number>> = {
  g: { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 },
  ml: { 'fl oz': 29.5735, floz: 29.5735, ml: 1, l: 1000 },
  each: { count: 1, each: 1, ct: 1 },
};
const UNIT_HINT: Record<CanonicalUnit, string> = { g: 'oz, lb, g or kg (weight)', ml: 'fl oz, ml or l (volume)', each: 'count' };

/** The rows of the blank sheet for one store, in store-walk order. */
export function sheetRows(retailer: Retailer): Record<(typeof SHEET_COLUMNS)[number], string>[] {
  const order = ['produce', 'meat_seafood', 'dairy_eggs', 'bakery', 'pantry', 'frozen', 'other'];
  return [...SAMPLE_PACKAGES[retailer].entries()]
    .map(([id, pkg]) => {
      const ing = getIngredient(id);
      return {
        ingredient_id: id,
        aisle: ing.section,
        item: ing.name,
        look_for: `${pkg.productName}, about ${pkg.packageSize}`,
        // Count items are counted in the recipe's unit (garlic in cloves, not heads), so show the sample's conversion.
        enter_amount_in: ing.unit === 'each' ? `count, like the sample: ${pkg.packageSize} = ${pkg.packageAmount}` : UNIT_HINT[ing.unit],
        product_name: '',
        amount: '',
        unit: '',
        price: '',
        notes: '',
      };
    })
    .sort((a, b) => (order.indexOf(a.aisle) === -1 ? 99 : order.indexOf(a.aisle)) - (order.indexOf(b.aisle) === -1 ? 99 : order.indexOf(b.aisle)) || a.item.localeCompare(b.item));
}

/** Minimal RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/u, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export const toCsv = (rows: readonly Record<string, string>[], columns: readonly string[]): string =>
  [columns.join(','), ...rows.map((r) => columns.map((c) => (/[",\n]/u.test(r[c] ?? '') ? `"${(r[c] ?? '').replace(/"/gu, '""')}"` : (r[c] ?? ''))).join(','))].join('\n') + '\n';

export type CheckImport =
  | { ok: true; store: CheckedStore; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

/** Turn a filled-in sheet into a checked store. Every problem is reported, not just the first. */
export function importCheck(csv: string, retailer: Retailer, meta: { checkedOn: string; location: string }, today: Date = new Date()): CheckImport {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(meta.checkedOn) || Number.isNaN(Date.parse(`${meta.checkedOn}T12:00:00Z`))) errors.push(`checked-on date must be YYYY-MM-DD, got "${meta.checkedOn}"`);
  else if (Date.parse(`${meta.checkedOn}T00:00:00Z`) > today.getTime() + 86_400_000) errors.push('checked-on date is in the future');
  const location = meta.location.trim();
  if (location.length < 3 || location.length > 120) errors.push('store location is required (3–120 characters), e.g. "Trader Joe’s, Court St, Brooklyn NY"');

  const rows = parseCsv(csv);
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const missingColumns = ['ingredient_id', 'product_name', 'amount', 'unit', 'price'].filter((need) => col(need) === -1);
  if (missingColumns.length) return { ok: false, errors: [...errors, ...missingColumns.map((c) => `missing column "${c}"`)], warnings };

  const expected = SAMPLE_PACKAGES[retailer];
  const items: Record<string, CheckedPackage> = {};
  rows.forEach((r, i) => {
    const line = i + 2;
    const get = (name: string) => (r[col(name)] ?? '').trim();
    const id = get('ingredient_id');
    if (!expected.has(id)) {
      errors.push(`line ${line}: "${id}" isn’t an item Weekwell prices at this store`);
      return;
    }
    if (items[id]) {
      errors.push(`line ${line}: ${id} appears twice`);
      return;
    }
    const canonical = getIngredient(id).unit;
    const name = get('product_name');
    const amount = Number(get('amount'));
    const unitRaw = get('unit').toLowerCase().replace(/\.$/u, '');
    const factor = UNITS[canonical][unitRaw];
    const priceText = get('price').replace(/[$\s]/gu, '');
    const price = Number(priceText);
    // A blank row is reported once, in the "Missing" list below.
    if (!name && !get('amount') && !get('price')) return;
    if (!name || name.length > 80) errors.push(`line ${line}: ${id} needs the product name as printed (up to 80 characters)`);
    if (!Number.isFinite(amount) || amount <= 0) errors.push(`line ${line}: ${id} amount must be a positive number`);
    if (factor === undefined) errors.push(`line ${line}: ${id} unit "${unitRaw}" should be ${UNIT_HINT[canonical]}`);
    if (!/^\d+(\.\d{1,2})?$/u.test(priceText) || price <= 0 || price * 100 > MAX_PACKAGE_PRICE_CENTS) errors.push(`line ${line}: ${id} price must look like 3.49 (up to $${MAX_PACKAGE_PRICE_CENTS / 100})`);
    if (!name || !(amount > 0) || factor === undefined || !(price > 0) || price * 100 > MAX_PACKAGE_PRICE_CENTS) return;
    const priceCents = Math.round(price * 100);
    const packageAmount = Math.round(amount * factor * 10) / 10;
    const sample = expected.get(id)!;
    const perUnit = priceCents / packageAmount;
    const samplePerUnit = sample.priceCents / sample.packageAmount;
    if (perUnit > samplePerUnit * 3 || perUnit < samplePerUnit / 3) warnings.push(`line ${line}: ${id} costs ${(perUnit / samplePerUnit).toFixed(1)}× the sample price per ${canonical === 'each' ? 'item' : canonical}; check the amount and unit`);
    items[id] = { productName: name, packageSize: `${amount} ${unitRaw === 'each' || unitRaw === 'ct' ? 'count' : unitRaw}`, packageAmount, priceCents };
  });
  const missing = [...expected.keys()].filter((id) => !items[id]);
  if (missing.length) errors.push(`every item needs a price (checked and sample prices are never mixed). Missing: ${missing.join(', ')}`);
  return errors.length ? { ok: false, errors, warnings } : { ok: true, store: { checkedOn: meta.checkedOn, location, items }, warnings };
}
