/**
 * Connected mode: the app built with EXPO_PUBLIC_API_URL against a real API
 * process (in-memory database). Sign-in, server-saved plan and grocery state,
 * swap + undo via the API, account deletion.
 */
import { expect, test, type Page } from '@playwright/test';
import { $, onboard } from './helpers';

async function signInAndPlan(page: Page, email: string) {
  await onboard(page, { query: 'today=wed' });
  await $(page, 'generate').click();
  await $(page, 'email-input').fill(email);
  await $(page, 'send-code').click();
  const dev = await $(page, 'dev-code').innerText();
  await $(page, 'code-input').fill(dev.replace(/\D/gu, ''));
  await $(page, 'verify-code').click();
  await expect($(page, 'tonight-card')).toBeVisible({ timeout: 20_000 });
}

test('sign in, plan, and the server keeps the plan and grocery checks', async ({ page }) => {
  await signInAndPlan(page, `a${Date.now()}@example.com`);
  await expect($(page, 'price-chip')).toContainText('sample est.');
  await $(page, 'open-grocery').click();
  await page.locator('[data-testid^="item-"]:visible').first().click();
  await expect($(page, 'checked-count')).toContainText('1 of');
  await page.waitForTimeout(1200); // list saves after a short debounce
  // Drop the on-device cache: what comes back must be from the server.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k !== 'weekwell.session') localStorage.removeItem(k);
  });
  await page.goto('/grocery?today=wed');
  await expect($(page, 'checked-count')).toContainText('1 of');
});

test('wrong code is refused with a clear message', async ({ page }) => {
  await onboard(page, { query: 'today=wed' });
  await $(page, 'generate').click();
  await $(page, 'email-input').fill(`b${Date.now()}@example.com`);
  await $(page, 'send-code').click();
  const dev = (await $(page, 'dev-code').innerText()).replace(/\D/gu, '');
  await $(page, 'code-input').fill(dev === '000000' ? '111111' : '000000');
  await $(page, 'verify-code').click();
  await expect($(page, 'sign-in-error')).toContainText('That code didn’t work');
});

test('swap and undo go through the API', async ({ page }) => {
  await signInAndPlan(page, `c${Date.now()}@example.com`);
  await $(page, 'meal-dinner_wed').click();
  const original = await ($(page, 'meal-name').textContent()) ?? '';
  await $(page, 'repair-swap').click();
  await $(page, 'swap-option-0').click();
  await expect($(page, 'swap-pending')).toBeVisible();
  expect(await ($(page, 'meal-name').textContent()) ?? '').not.toBe(original);
  await $(page, 'undo-swap').click();
  await expect($(page, 'meal-name')).toHaveText(original);
  await page.reload();
  await expect($(page, 'meal-name')).toHaveText(original);
});

test('deleting the account removes it on the server', async ({ page }) => {
  await signInAndPlan(page, `d${Date.now()}@example.com`);
  await $(page, 'edit-preferences').click();
  await $(page, 'delete-data').click();
  await $(page, 'confirm-delete').click();
  await expect($(page, 'start')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('weekwell.session'));
  expect(token).toBeNull();
});
