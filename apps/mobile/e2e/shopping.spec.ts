/**
 * Nearest store and shopping-day reminder (D-047). Apple Maps search doesn't
 * run in a browser, so `?nearby=` fakes its answer; everything around it is real.
 */
import { expect, test } from '@playwright/test';
import { audit } from './audit';
import { $, buildWeek, onboard } from './helpers';

test('use my location fills in the nearest store', async ({ page }) => {
  await page.goto('/onboarding?nearby=found');
  await $(page, 'start').click();
  await $(page, 'nearby-find').click();
  await expect($(page, 'nearby-store')).toContainText('Walmart Supercenter on Main St');
  await expect($(page, 'nearby-store')).toContainText('1.2 mi');
  // No store was picked yet, so the sentence takes the nearest chain.
  await expect($(page, 'store-pick')).toContainText('Walmart');
  await expect($(page, 'nearby-directions')).toBeVisible();
});

test('location refused: a clear way forward, nothing blocks setup', async ({ page }) => {
  await page.goto('/onboarding?nearby=denied');
  await $(page, 'start').click();
  await $(page, 'nearby-find').click();
  await expect($(page, 'nearby-note')).toContainText('Location is off for Weekwell');
  await expect($(page, 'store-pick')).toBeVisible();
});

test('without Apple Maps search (web), the option is hidden', async ({ page }) => {
  await page.goto('/onboarding');
  await $(page, 'start').click();
  await expect($(page, 'store-pick')).toBeVisible();
  await expect($(page, 'nearby-find')).toHaveCount(0);
});

test('after the first plan, one sheet asks when you shop; it never comes back', async ({ page }) => {
  await onboard(page);
  await $(page, 'generate').click();
  await expect($(page, 'shopping-sheet')).toBeVisible({ timeout: 15_000 });
  await $(page, 'shopping-day-3').click();
  await $(page, 'shopping-hour-17').click();
  await expect($(page, 'shopping-sheet-save')).toHaveText('Remind me Wednesdays');
  await $(page, 'shopping-sheet-save').click();
  await expect($(page, 'shopping-sheet')).toHaveCount(0);
  await page.reload();
  await expect($(page, 'tonight-card')).toBeVisible();
  await expect($(page, 'shopping-sheet')).toHaveCount(0);
  await page.goto('/preferences');
  await expect($(page, 'pref-row-shopping')).toContainText('Wednesday, 5 PM');
});

test('shopping day screen: lock-screen preview of the real reminder, then it’s on', async ({ page }) => {
  await buildWeek(page, { query: 'nearby=found' });
  await $(page, 'open-grocery').click();
  await $(page, 'grocery-remind').click();
  await $(page, 'shopping-day-0').click();
  await $(page, 'shopping-hour-9').click();
  await $(page, 'nearby-find').click();
  const preview = $(page, 'shopping-preview');
  await expect(preview).toContainText('Sunday');
  await expect(preview).toContainText('9:00');
  // Food first (NT3): Monday's dinner leads, then the list, the store and the total.
  await expect(preview).toContainText(/This week starts with /u);
  await expect(preview).toContainText(/Grab \d+ items at Trader Joe’s \(1\.8 mi\), about \$\d+, and dinner’s sorted till Friday\./u);
  // Same bar as every screen: nothing clipped, 44 pt targets, the action in view.
  await audit(page, 'tmp-shopping', { primary: 'shopping-save' });
  await $(page, 'shopping-save').click();
  await expect($(page, 'grocery-remind')).toHaveCount(0);
  // The grocery list's map strip (GR3): store, distance, drive time, Go.
  await expect($(page, 'store-map')).toContainText('Trader Joe’s on Market St');
  await expect($(page, 'store-map')).toContainText('1.8 mi · about 7 min drive');
  await expect($(page, 'nearby-directions')).toBeVisible();
  await page.goto('/preferences');
  await expect($(page, 'pref-row-shopping')).toContainText('Sunday, 9 AM');
});
