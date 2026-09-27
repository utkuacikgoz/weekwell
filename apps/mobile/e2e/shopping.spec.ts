/**
 * Nearest store and shopping-day reminder (D-047). Apple Maps search doesn't
 * run in a browser, so `?nearby=` fakes its answer; everything around it is real.
 */
import { expect, test } from '@playwright/test';
import { audit } from './audit';
import { $, buildWeek } from './helpers';

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

test('pick a shopping day: preview shows the real list, then the reminder is on', async ({ page }) => {
  await buildWeek(page, { query: 'nearby=found' });
  await $(page, 'shopping-nudge').click();
  await $(page, 'shopping-day-3').click();
  await $(page, 'shopping-hour-17').click();
  await $(page, 'nearby-find').click();
  await expect($(page, 'shopping-preview')).toContainText('It’s shopping day');
  await expect($(page, 'shopping-preview')).toContainText(/Your Trader Joe’s list is ready: \d+ items to buy/u);
  await expect($(page, 'shopping-preview')).toContainText('Trader Joe’s on Market St is 1.8 mi away.');
  await expect($(page, 'shopping-preview')).toContainText('Wed 5 PM');
  // Same bar as every screen: nothing clipped, 44 pt targets, the action in view.
  await audit(page, 'tmp-shopping', { primary: 'shopping-save' });
  await $(page, 'shopping-save').click();
  await expect($(page, 'tonight-card')).toBeVisible();
  await expect($(page, 'shopping-nudge')).toHaveCount(0);
  await page.goto('/preferences');
  await expect($(page, 'pref-row-shopping')).toContainText('Wednesday, 5 PM');
});
