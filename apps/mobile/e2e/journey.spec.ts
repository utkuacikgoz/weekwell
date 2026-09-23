import { expect, test } from '@playwright/test';
import { $, buildWeek, onboard, visibleText } from './helpers';

test('a new user builds a plan in under two minutes', async ({ page }) => {
  const start = Date.now();
  await buildWeek(page);
  expect(Date.now() - start).toBeLessThan(120_000);
  for (const d of ['dinner_mon', 'dinner_tue', 'dinner_wed', 'dinner_thu', 'dinner_fri', 'lunch_a', 'lunch_b']) {
    await expect($(page, `meal-${d}`)).toHaveCount(1);
  }
  await expect($(page, 'price-summary')).toContainText('estimated at Trader Joe’s');
  await expect($(page, 'price-summary')).toContainText('Sample prices for testing');
});

test('tonight’s meal, total, budget fit, protein/time, and store are visible without scrolling', async ({ page }) => {
  await buildWeek(page);
  const vh = page.viewportSize()!.height;
  for (const id of ['settings-summary', 'week-summary', 'price-headline', 'budget-line']) {
    const box = await $(page, id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y + box!.height, id).toBeLessThan(vh - 80);
  }
  const first = await page.locator('[data-testid^="meal-dinner_"]:visible').first().boundingBox();
  expect(first!.y + first!.height).toBeLessThan(vh - 80);
});

test('the review screen reflects every choice and edits return to review', async ({ page }) => {
  await onboard(page, { store: 'walmart', budget: 120, time: '20', household: '2', exclusions: ['dairy'] });
  const text = await visibleText(page);
  for (const s of ['Walmart', '$120', 'High protein', '20 minutes', '2 people', 'Dairy-free']) expect(text).toContain(s);
  await $(page, 'review-household').click();
  await $(page, 'household-3_4').click();
  await $(page, 'continue').click();
  await expect(page.getByText('Check your choices').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('3–4 people').filter({ visible: true })).toBeVisible();
});

test('budget input is bounded and explains corrections', async ({ page }) => {
  await page.goto('/onboarding/budget');
  const input = $(page, 'budget-input');
  await input.fill('5');
  await input.blur();
  await expect(page.getByText('Budgets start at $30. We set it to $30.')).toBeVisible();
  await input.fill('9999');
  await input.blur();
  await expect(page.getByText('Budgets go up to $400. We set it to $400.')).toBeVisible();
});

test('an allergy conflict is shown before generation and blocks it', async ({ page }) => {
  await onboard(page, { store: 'walmart', time: '20', exclusions: ['dairy', 'gluten', 'nuts'] });
  await $(page, 'review-exclusions').click();
  await $(page, 'exclusion-input').fill('fish');
  await $(page, 'exclusion-add').click();
  await expect($(page, 'feasibility-warning')).toBeVisible();
  await $(page, 'continue').click();
  await expect($(page, 'review-conflict')).toBeVisible();
  await expect($(page, 'generate')).toHaveAttribute('aria-disabled', 'true');
});

test('check off and undo a grocery item; state survives a reload', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'open-grocery').click();
  await expect($(page, 'checked-count')).toContainText('0 of');
  const item = page.locator('[data-testid^="item-"]:visible').first();
  await item.click();
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await expect($(page, 'checked-count')).toContainText('1 of');
  await page.reload();
  await expect($(page, 'checked-count')).toContainText('1 of');
  await page.locator('[data-testid^="item-"]:visible').first().click();
  await expect($(page, 'checked-count')).toContainText('0 of');
});

test('grocery items map back to their meals', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'open-grocery').click();
  const link = page.getByRole('link').filter({ visible: true }).first();
  const label = await link.getAttribute('aria-label');
  await link.click();
  await expect($(page, 'meal-name')).toBeVisible();
  expect(label).toContain(await $(page, 'meal-name').innerText());
});

test('swap one meal, then undo it', async ({ page }) => {
  await buildWeek(page);
  const before = await page.locator('[data-testid^="meal-"]:visible').allInnerTexts();
  await $(page, 'meal-dinner_wed').click();
  const original = await $(page, 'meal-name').innerText();
  await $(page, 'repair-swap').click();
  await expect($(page, 'swap-banner')).toBeVisible();
  const swapped = await $(page, 'meal-name').innerText();
  expect(swapped).not.toBe(original);
  await $(page, 'undo-swap').click();
  await expect($(page, 'meal-name')).toHaveText(original);
  await page.goBack();
  expect(await page.locator('[data-testid^="meal-"]:visible').allInnerTexts()).toEqual(before);
});

test('changing store previews exactly what will change before applying', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'edit-preferences').click();
  await $(page, 'pref-store-walmart').click();
  await expect($(page, 'preference-preview')).toContainText(/Changing to Walmart may change \d+ prices/u);
  await $(page, 'apply-preferences').click();
  await expect($(page, 'price-summary')).toContainText('Walmart');
});

test('delete my data returns to onboarding', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'edit-preferences').click();
  await $(page, 'delete-data').click();
  await $(page, 'confirm-delete').click();
  await expect($(page, 'start')).toBeVisible();
  await page.reload();
  await expect($(page, 'start')).toBeVisible();
});
