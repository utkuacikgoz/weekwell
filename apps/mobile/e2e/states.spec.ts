import { expect, test } from '@playwright/test';
import { $, buildWeek, onboard, visibleText } from './helpers';

test('a failed price check never shows a total', async ({ page }) => {
  await buildWeek(page, { query: 'prices=unavailable' });
  await expect($(page, 'price-summary')).toContainText('Total hidden');
  await expect($(page, 'price-summary')).toContainText('We could not verify prices for Trader Joe’s right now');
  expect(await $(page, 'price-headline').innerText()).not.toMatch(/\$\d/u);
  await expect($(page, 'budget-line')).toContainText('once prices are available');
});

test('partial prices withhold the total and mark missing items', async ({ page }) => {
  await buildWeek(page, { query: 'prices=partial' });
  await expect($(page, 'price-summary')).toContainText('Total hidden');
  await $(page, 'open-grocery').click();
  await expect(page.getByText('No price').filter({ visible: true }).first()).toBeVisible();
});

test('stale prices are labelled as older estimates', async ({ page }) => {
  await buildWeek(page, { query: 'prices=stale' });
  await expect($(page, 'price-summary')).toContainText('OLDER ESTIMATE');
  await expect($(page, 'price-summary')).toContainText('Checked 3 days ago');
});

test('a user can inspect pricing caveats in the list', async ({ page }) => {
  await buildWeek(page, { query: 'prices=fresh' });
  await $(page, 'open-grocery').click();
  await expect($(page, 'price-summary')).toContainText('Prices can change in store');
  await expect($(page, 'price-summary')).toContainText('Checked 2 hours ago');
});

test('over budget is stated, not hidden', async ({ page }) => {
  await buildWeek(page, { store: 'walmart', budget: 40, household: '3_4' });
  await expect($(page, 'budget-line')).toContainText('over your $40 budget');
});

test('malformed model output shows a recoverable error', async ({ page }) => {
  await onboard(page, { query: 'generation=invalid_output' });
  await $(page, 'generate').click();
  await expect($(page, 'generation-error')).toContainText('passed our checks', { timeout: 15_000 });
  await expect($(page, 'retry')).toBeVisible();
  await expect($(page, 'edit-choices')).toBeVisible();
});

test('a generation timeout explains what to do', async ({ page }) => {
  await onboard(page, { query: 'generation=timeout' });
  await $(page, 'generate').click();
  await expect($(page, 'generation-error')).toContainText('took too long', { timeout: 15_000 });
});

test('paywall: nothing preselected, exact prices, truthful yearly saving', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'open-trial').click();
  await expect($(page, 'start-trial')).toHaveAttribute('aria-disabled', 'true');
  for (const id of ['product-weekly', 'product-monthly', 'product-yearly']) {
    await expect($(page, id)).toHaveAttribute('aria-checked', 'false');
  }
  const text = await visibleText(page);
  expect(text).toContain('$4.99 per week');
  expect(text).toContain('$9.99 per month');
  expect(text).toContain('$49.99 per year');
  expect(text).toContain('$69.89 less than paying monthly');
  await $(page, 'product-monthly').click();
  await expect($(page, 'charge-line')).toHaveText('Free for 7 days, then $9.99 per month unless you cancel.');
  await $(page, 'start-trial').click();
  await expect($(page, 'trial-active')).toContainText('7 days left');
});

test('restore purchases: nothing to restore, and a recoverable failure', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'open-trial').click();
  await $(page, 'restore').click();
  await expect($(page, 'restore-nothing')).toBeVisible();
  await page.goto('/trial?restore=error');
  await $(page, 'restore').click();
  await expect($(page, 'restore-failed')).toBeVisible();
});
