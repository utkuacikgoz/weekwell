# Store price check (D-011)

This replaces the sample prices with real shelf prices from one store visit per store. Plan on about 45 minutes per store.

## Before the visit

1. `npm run prices:sheet` regenerates the sheet if the recipes have changed. It's already committed:
   - `trader_joes-sheet.csv` and `walmart-sheet.csv`: the sheet you fill in (49 items each). Open it in Google Sheets or Numbers on your phone.
   - `trader_joes-checklist.html` and `walmart-checklist.html`: a printable or phone checklist grouped by aisle.

## At the store

For every row, fill in these columns:
- **`product_name`:** the name printed on the package.
- **`amount` and `unit`:** the package size.
  - Weight items: `oz`, `lb`, `g` or `kg`.
  - Liquids: `fl oz`, `ml` or `l`.
  - Count items: `count`, counted the way the sheet shows. Garlic is counted in **cloves**: a head of about 10 cloves is `10`.
- **`price`:** the shelf price, like `3.49`. Not a sale, member or loyalty price.
- **Loose produce sold by weight:** enter the price for **1 lb**, with amount `1` and unit `lb`.
- **Exact product not sold:** pick the closest one and say why in `notes`.

**Every row is required.** Checked and sample prices are never mixed in one total, so a store with any row missing isn't imported.

## After the visit

Download the sheet as CSV, then run:

```
npm run prices:import -- trader_joes path/to/filled.csv --checked-on 2026-09-28 --location "Trader Joe’s, Court St, Brooklyn NY"
```

- **Errors:** anything missing or malformed is listed, and nothing is written.
- **Warnings:** a price per unit far from the sample (usually a typo in the amount or unit) is flagged. Check it, then run the command again.
- **Result:** on success it writes `packages/domain/src/fixtures/checked-prices.ts`. Commit that file, or send the CSV to Claude to import.

## What people see in the app

| Age of the check | Label | Notes |
|---|---|---|
| Up to 14 days | `$74 · store check` | The About sheet says "Checked by hand at [store] on [date]. Prices differ between stores and change over time." |
| 14 to 45 days | `older est.` | Shows the "Prices last checked N days ago" notice |
| Over 45 days | `sample est.` | Automatically back to the labelled sample prices, so an out-of-date check is never shown as current |

A store check is an **estimate** for that store on that date. It's never shown as a verified or live price.
