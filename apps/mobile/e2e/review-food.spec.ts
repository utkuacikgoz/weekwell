/** Meal photo coverage (D-038). REVIEW=1 saves a capture to docs/review/v3/food/. */
import { expect, test } from '@playwright/test';
import { $ } from './helpers';

test('photo coverage lists every recipe with its shot brief', async ({ page }) => {
  await page.goto('/review/food?review=1');
  await expect($(page, 'photo-coverage')).toBeVisible();
  await expect(page.locator('[data-testid^="shot-"]:visible')).toHaveCount(22);
  await expect($(page, 'photo-count')).toContainText('of 22 recipes have a photo');
  if (process.env.REVIEW) await page.screenshot({ path: 'docs/review/v3/food/03-photo-coverage-390.png' });
});

test('the coverage page is review-only', async ({ page }) => {
  await page.goto('/review/food');
  await expect($(page, 'photo-coverage')).toHaveCount(0);
});
