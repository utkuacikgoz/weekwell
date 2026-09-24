import { expect, test } from '@playwright/test';
import { $, buildWeek, onboard, visibleText, findTimerStep } from './helpers';

test('a new user builds a plan in under two minutes', async ({ page }) => {
  const start = Date.now();
  await buildWeek(page);
  expect(Date.now() - start).toBeLessThan(120_000);
  for (const d of ['dinner_mon', 'dinner_tue', 'dinner_wed', 'dinner_thu', 'dinner_fri', 'lunch_a', 'lunch_b']) {
    await expect($(page, `meal-${d}`)).toHaveCount(1);
  }
  await expect($(page, 'price-chip')).toContainText('sample est.');
  await expect($(page, 'settings-summary')).toContainText('Trader Joe’s');
});

test('tonight’s meal, total, budget fit, and store are visible without scrolling', async ({ page }) => {
  await buildWeek(page);
  const vh = page.viewportSize()!.height;
  for (const id of ['settings-summary', 'tonight-card', 'price-chip']) {
    const box = await $(page, id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.y + box!.height, id).toBeLessThanOrEqual(vh);
  }
});

test('the review screen reflects every choice and edits return to review', async ({ page }) => {
  await onboard(page, { store: 'walmart', budget: 120, time: '20', household: '2', exclusions: ['dairy'] });
  const text = await visibleText(page);
  for (const s of ['Walmart', '$120', 'High protein', '20 minutes', '2 people', 'Dairy-free']) expect(text).toContain(s);
  await $(page, 'review-week').click();
  await $(page, 'household-3_4').click();
  await $(page, 'continue').click();
  await expect($(page, 'generate')).toBeVisible();
  await expect(page.getByText('3–4 people', { exact: false }).filter({ visible: true })).toBeVisible();
});

test('budget input is bounded and explains corrections', async ({ page }) => {
  await page.goto('/onboarding/store');
  // Presets first; the number field only appears for Custom.
  await expect($(page, 'budget-80')).toHaveAttribute('aria-checked', 'true');
  await expect($(page, 'budget-input')).toHaveCount(0);
  await $(page, 'budget-custom').click();
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
  await page.locator('[data-testid^="used-in-"]:visible').first().click();
  const sheet = $(page, 'used-in-sheet');
  await expect(sheet).toBeVisible();
  const row = sheet.locator('[data-testid^="meal-"]').first();
  const label = await row.getAttribute('aria-label');
  await row.click();
  await expect($(page, 'meal-name')).toBeVisible();
  expect(label).toContain(await $(page, 'meal-name').innerText());
});

test('checking an item offers a quick undo', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'open-grocery').click();
  const item = page.locator('[data-testid^="item-"]:visible').first();
  await item.click();
  await expect($(page, 'check-toast')).toBeVisible();
  await $(page, 'undo-check').click();
  await expect(item).toHaveAttribute('aria-checked', 'false');
  await expect($(page, 'checked-count')).toContainText('0 of');
});

test('swap one meal, then undo it', async ({ page }) => {
  await buildWeek(page);
  const before = await page.locator('[data-testid^="meal-"]:visible').allInnerTexts();
  await $(page, 'meal-dinner_wed').click();
  const original = await $(page, 'meal-name').innerText();
  await $(page, 'repair-swap').click();
  await expect($(page, 'swap-pending')).toContainText('Swapped to');
  expect(await $(page, 'meal-name').innerText()).not.toBe(original);
  await $(page, 'undo-swap').click();
  await expect($(page, 'meal-name')).toHaveText(original);
  await expect($(page, 'swap-pending')).toHaveCount(0);
  await page.goBack();
  expect(await page.locator('[data-testid^="meal-"]:visible').allInnerTexts()).toEqual(before);
});

test('keep a swap: the week shows the new meal', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'meal-dinner_wed').click();
  await $(page, 'repair-swap').click();
  const swapped = await $(page, 'meal-name').innerText();
  await $(page, 'keep-swap').click();
  await expect($(page, 'meal-toast')).toContainText('Swap kept');
  await expect($(page, 'start-cooking')).toBeVisible();
  await page.goBack();
  await expect($(page, 'meal-dinner_wed')).toContainText(swapped);
});

test('cooking mode walks through the steps', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'meal-dinner_mon').click();
  await $(page, 'start-cooking').click();
  await expect($(page, 'cook-step-count')).toHaveText(/Step 1 of \d/u);
  await $(page, 'cook-next').click();
  await expect($(page, 'cook-step-count')).toHaveText(/Step 2 of \d/u);
  await $(page, 'cook-prev').click();
  await expect($(page, 'cook-step-count')).toHaveText(/Step 1 of \d/u);
});

test('changing store previews exactly what will change before applying', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'edit-preferences').click();
  await $(page, 'pref-store-walmart').click();
  await expect($(page, 'preference-preview')).toContainText(/Changing to Walmart may change \d+ prices/u);
  await $(page, 'apply-preferences').click();
  await expect($(page, 'settings-summary')).toContainText('Walmart');
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

test('about this estimate explains the total in a sheet', async ({ page }) => {
  await buildWeek(page);
  await $(page, 'price-about').click();
  await expect($(page, 'about-sheet')).toContainText('They weren’t checked in a store');
  await $(page, 'about-done').click();
  await expect($(page, 'about-sheet')).toHaveCount(0);
});

test('cooking mode: timer from the step, resume after leaving, done clears it', async ({ page }) => {
  await page.clock.install();
  await buildWeek(page, { query: 'today=wed' });
  await $(page, 'meal-dinner_wed').click();
  await $(page, 'start-cooking').click();
  // Find a step with a time in it.
  await findTimerStep(page);
  const label = await $(page, 'cook-timer-start').innerText();
  const minutes = Number(/Start (\d+) min timer/u.exec(label)?.[1]);
  expect(minutes).toBeGreaterThan(0);
  await $(page, 'cook-timer-start').click();
  await expect($(page, 'cook-timer-time')).toHaveText(`${minutes}:00`);
  const step = await $(page, 'cook-step-count').innerText();
  // Accidental back: the week offers to continue, at the same step, with the timer still running.
  await $(page, 'nav-back').click();
  await $(page, 'nav-back').click();
  await expect($(page, 'continue-cooking')).toContainText(step.replace('Step', 'step'));
  await $(page, 'continue-cooking-open').click();
  await expect($(page, 'cook-step-count')).toHaveText(step);
  await expect($(page, 'cook-timer')).toBeVisible();
  await page.clock.fastForward(minutes * 60_000 + 1000);
  await expect($(page, 'cook-timer-time')).toHaveText('Time’s up');
  // Finish: the resume prompt goes away.
  while ((await $(page, 'cook-next').innerText()) !== 'Done') await $(page, 'cook-next').click();
  await $(page, 'cook-next').click();
  // Opened from the week, so Done returns to the week.
  await expect($(page, 'tonight-card')).toBeVisible();
  await expect($(page, 'continue-cooking')).toHaveCount(0);
});
