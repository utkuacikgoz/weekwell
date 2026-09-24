/**
 * Food-art direction board (design audit 2026-09-24): six meals, photography
 * spec beside the illustration direction. REVIEW=1 saves captures to
 * docs/review/v3/food/.
 */
import { expect, test } from '@playwright/test';
import { $ } from './helpers';

const OUT = 'docs/review/v3/food';

test('the direction board shows six meals in both directions', async ({ page }) => {
  await page.goto('/review/food?review=1');
  await expect($(page, 'food-directions')).toBeVisible();
  await expect(page.locator('[data-testid^="direction-"]:visible')).toHaveCount(6);
  if (process.env.REVIEW) {
    await page.screenshot({ path: `${OUT}/01-board-390.png` });
    const meal = $(page, 'direction-sheet-pan-salmon');
    await meal.scrollIntoViewIfNeeded();
    await meal.screenshot({ path: `${OUT}/02-one-meal-both-directions.png` });
  }
});

test('the board is review-only', async ({ page }) => {
  await page.goto('/review/food');
  await expect($(page, 'food-directions')).toHaveCount(0);
});
