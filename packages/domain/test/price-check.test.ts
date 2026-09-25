import { describe, expect, it } from 'vitest';
import { FixtureRetailerProvider, SAMPLE_PRICE_SOURCE, SHEET_COLUMNS, buildGroceryList, importCheck, parseCsv, priceGroceryList, sheetRows, toCsv, type CheckedStore } from '../src';
import { NOW, allMeals, planFor } from './helpers';

/** A fully filled sheet: every item at 1.1× its sample package price, entered in everyday units. */
function filledSheet(retailer: 'trader_joes' | 'walmart'): string {
  const rows = sheetRows(retailer).map((r) => {
    const unit = r.enter_amount_in.startsWith('oz') ? 'oz' : r.enter_amount_in.startsWith('fl oz') ? 'fl oz' : 'count';
    return { ...r, product_name: `Store ${r.item}`, amount: unit === 'count' ? '2' : '12', unit, price: '$3.29' };
  });
  return toCsv(rows, SHEET_COLUMNS);
}

describe('store price check (D-011)', () => {
  it('the blank sheet lists every priced item once, produce first', () => {
    const rows = sheetRows('trader_joes');
    expect(new Set(rows.map((r) => r.ingredient_id)).size).toBe(rows.length);
    expect(rows[0]?.aisle).toBe('produce');
    expect(rows.every((r) => r.look_for && r.enter_amount_in)).toBe(true);
  });

  it('CSV round-trips quotes, commas, and newlines', () => {
    const csv = toCsv([{ a: 'He said "hi", twice', b: 'line\nbreak' }], ['a', 'b']);
    expect(parseCsv(csv)).toEqual([['a', 'b'], ['He said "hi", twice', 'line\nbreak']]);
  });

  it('imports a complete sheet, converting everyday units', () => {
    const res = importCheck(filledSheet('trader_joes'), 'trader_joes', { checkedOn: '2026-09-20', location: 'Trader Joe’s, Court St, Brooklyn NY' }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const chicken = res.store.items.chicken_breast!;
    expect(chicken).toMatchObject({ priceCents: 329, packageSize: '12 oz' });
    expect(chicken.packageAmount).toBeCloseTo(340.2, 1);
  });

  it('refuses a partial sheet, bad units, bad prices, unknown items, and a future date, listing every problem', () => {
    const rows = parseCsv(filledSheet('walmart'));
    const header = rows[0]!;
    const i = (c: string) => header.indexOf(c);
    rows[1]![i('unit')] = 'bananas';
    rows[2]![i('price')] = 'free';
    rows[3]![i('product_name')] = '';
    rows[3]![i('amount')] = '';
    rows[3]![i('price')] = '';
    rows.push([...rows[4]!]);
    rows[rows.length - 1]![i('ingredient_id')] = 'caviar';
    const csv = rows.map((r) => r.map((f) => (/[",\n]/u.test(f) ? `"${f.replace(/"/gu, '""')}"` : f)).join(',')).join('\n');
    const res = importCheck(csv, 'walmart', { checkedOn: '2099-01-01', location: 'Walmart' }, NOW);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    const text = res.errors.join('\n');
    expect(text).toMatch(/future/u);
    expect(text).toMatch(/unit "bananas"/u);
    expect(text).toMatch(/price must look like/u);
    expect(text).toMatch(/caviar/u);
    expect(text).toMatch(/Missing: /u);
  });

  it('warns when a price per unit is far from the sample (likely a typo in the amount)', () => {
    const rows = parseCsv(filledSheet('trader_joes'));
    const header = rows[0]!;
    const row = rows.find((r) => r[header.indexOf('ingredient_id')] === 'salmon')!;
    row[header.indexOf('amount')] = '0.1';
    const csv = rows.map((r) => r.map((f) => (/[",\n]/u.test(f) ? `"${f.replace(/"/gu, '""')}"` : f)).join(',')).join('\n');
    const res = importCheck(csv, 'trader_joes', { checkedOn: '2026-09-20', location: 'TJ Court St' }, NOW);
    expect(res.warnings.join('\n')).toMatch(/salmon costs/u);
  });

  describe('pricing with a store check', () => {
    const items = buildGroceryList(allMeals(planFor()));
    const store = (checkedOn: string): CheckedStore => {
      const res = importCheck(filledSheet('trader_joes'), 'trader_joes', { checkedOn, location: 'Trader Joe’s, Court St, Brooklyn NY' }, new Date('2030-01-01'));
      if (!res.ok) throw new Error(res.errors.join('; '));
      return res.store;
    };
    const at = (iso: string) => () => new Date(iso);

    it('a recent check is used everywhere, labelled as a store check, never as verified', async () => {
      const now = new Date('2026-09-25T12:00:00Z');
      const res = await priceGroceryList(new FixtureRetailerProvider('trader_joes', 'auto', at(now.toISOString()), store('2026-09-20')), items, { now });
      expect(res.total.status).toBe('available');
      if (res.total.status !== 'available') return;
      expect(res.total).toMatchObject({ kind: 'estimated', isSample: false, isStoreCheck: true, source: 'Checked in store: Trader Joe’s, Court St, Brooklyn NY', staleItemIds: [] });
    });

    it('after 14 days it is an older estimate; after 45 days the app goes back to labelled sample prices', async () => {
      const older = new Date('2026-10-20T12:00:00Z');
      const a = await priceGroceryList(new FixtureRetailerProvider('trader_joes', 'auto', at(older.toISOString()), store('2026-09-20')), items, { now: older });
      expect(a.total.status === 'available' && a.total.staleItemIds.length > 0).toBe(true);
      const tooOld = new Date('2026-11-10T12:00:00Z');
      const b = await priceGroceryList(new FixtureRetailerProvider('trader_joes', 'auto', at(tooOld.toISOString()), store('2026-09-20')), items, { now: tooOld });
      expect(b.total).toMatchObject({ status: 'available', isSample: true, isStoreCheck: false, source: SAMPLE_PRICE_SOURCE });
    });

    it('with no check, auto means labelled sample prices', async () => {
      const res = await priceGroceryList(new FixtureRetailerProvider('walmart', 'auto', () => NOW, null), items, { now: NOW });
      expect(res.total).toMatchObject({ status: 'available', isSample: true, isStoreCheck: false });
    });
  });
});
