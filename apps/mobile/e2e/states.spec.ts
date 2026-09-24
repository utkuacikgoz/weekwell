import { expect, test } from '@playwright/test';
import { $, buildWeek, onboard, visibleText } from './helpers';

test('a failed price check never shows a total', async ({ page }) => {
  await buildWeek(page, { query: 'prices=unavailable' });
  await expect($(page, 'price-notice')).toContainText('Prices unavailable right now');
  await expect($(page, 'price-amount')).toHaveText('No total');
  expect(await $(page, 'price-chip').innerText()).not.toMatch(/\$\d/u);
  await expect($(page, 'price-action-refresh')).toBeVisible();
});

test('partial prices withhold the total and mark missing items', async ({ page }) => {
  await buildWeek(page, { query: 'prices=partial' });
  await expect($(page, 'price-notice')).toContainText('Total unavailable');
  await $(page, 'open-grocery').click();
  await expect(page.getByText('No price').filter({ visible: true }).first()).toBeVisible();
});

test('stale prices are labelled as older estimates', async ({ page }) => {
  await buildWeek(page, { query: 'prices=stale' });
  await expect($(page, 'price-notice')).toContainText('Prices last checked 3 days ago');
  await expect($(page, 'price-kind')).toHaveText('older est.');
  await expect($(page, 'price-action-refresh')).toBeVisible();
});

test('a user can inspect pricing caveats in the list', async ({ page }) => {
  await buildWeek(page, { query: 'prices=fresh' });
  await $(page, 'open-grocery').click();
  await expect($(page, 'price-kind')).toHaveText('estimate');
  await expect($(page, 'price-notice')).toHaveCount(0);
  await $(page, 'price-about').click();
  await expect($(page, 'about-sheet')).toContainText(/checked (today|\d+ hours? ago)/u);
  await expect($(page, 'about-sheet')).toContainText('Prices can change in store');
});

test('over budget is stated, can be rebuilt, and the rebuild can be undone', async ({ page }) => {
  await buildWeek(page, { store: 'walmart', budget: 40, household: '3_4' });
  await expect($(page, 'price-notice')).toContainText(/Estimated total \$\d+ · \$\d+ over your \$40 target/u);
  await expect($(page, 'price-action-rebuild')).toHaveText('Rebuild under $40');
  const before = await page.locator('[data-testid^="meal-"]:visible').allInnerTexts();
  await $(page, 'price-action-rebuild').click();
  await expect($(page, 'rebuild-sheet')).toContainText('lowest-cost meals');
  await $(page, 'rebuild-apply').click();
  await expect($(page, 'plan-undo')).toContainText('Week rebuilt under budget');
  expect(await page.locator('[data-testid^="meal-"]:visible').allInnerTexts()).not.toEqual(before);
  await $(page, 'plan-undo-button').click();
  await expect($(page, 'plan-undo')).toHaveCount(0);
  expect(await page.locator('[data-testid^="meal-"]:visible').allInnerTexts()).toEqual(before);
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
  expect(text).toContain('$4.99 a week');
  expect(text).toContain('$9.99 a month');
  expect(text).toContain('$49.99 a year');
  expect(text).toContain('Save 58% vs monthly');
  expect(text).toContain('12 months of monthly ($119.88), $69.89 less');
  expect(text).toContain('About $2.31 a week');
  expect(text).toContain('About $0.96 a week');
  await expect($(page, 'start-trial')).toHaveText('Choose a plan');
  await expect($(page, 'legal')).toContainText('renew automatically unless cancelled at least 24 hours before');
  await $(page, 'product-monthly').click();
  await expect($(page, 'charge-line')).toHaveText('Free for 7 days, then $9.99 a month.');
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

test('after the free week: plan stays readable, changes ask for a subscription', async ({ page }) => {
  await buildWeek(page, { query: 'entitlement=expired' });
  await expect($(page, 'tonight-card')).toBeVisible();
  await $(page, 'plan-new-week').click();
  await expect($(page, 'locked-sheet')).toContainText('Your current plan and grocery list are still here');
  await $(page, 'locked-see-plans').click();
  await expect($(page, 'trial-ended')).toBeVisible();
  await $(page, 'product-yearly').click();
  await expect($(page, 'start-trial')).toHaveText(/Subscribe/u);
  await $(page, 'start-trial').click();
  await expect($(page, 'plan-active')).toContainText('Yearly plan');
});

test('swapping a meal is locked after the free week', async ({ page }) => {
  await buildWeek(page, { query: 'entitlement=expired' });
  await $(page, 'meal-dinner_wed').click();
  await $(page, 'repair-swap').click();
  await expect($(page, 'locked-sheet')).toBeVisible();
  await expect($(page, 'swap-pending')).toHaveCount(0);
});

test('plan a new week from the week screen', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'meal-dinner_mon').click();
  await $(page, 'toggle-on-list').click();
  await page.goBack();
  await $(page, 'plan-new-week').click();
  await expect($(page, 'generate')).toBeVisible();
  await $(page, 'generate').click();
  await expect($(page, 'tonight-card')).toBeVisible({ timeout: 15_000 });
  await expect($(page, 'meal-dinner_mon')).not.toContainText('Not on grocery list');
});
