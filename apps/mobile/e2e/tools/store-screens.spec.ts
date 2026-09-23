/** Tool (not a test): draft App Store screenshots at 6.9" (1320×2868). Run with STORE_SHOTS=1. */
import { expect, test } from '@playwright/test';
import { $, buildWeek } from '../helpers';

const OUT = 'docs/release/screenshots';
test.skip(process.env.STORE_SHOTS !== '1', 'asset generation tool');
test.use({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });

test('store screenshots', async ({ page }) => {
  await page.goto('/onboarding');
  await page.screenshot({ path: `${OUT}/01-plan-my-five-dinners.png` });
  await buildWeek(page, { query: 'today=wed' });
  await page.screenshot({ path: `${OUT}/02-your-week.png` });
  await $(page, 'meal-dinner_wed').click();
  await page.screenshot({ path: `${OUT}/03-recipe.png` });
  await page.goBack();
  await $(page, 'open-grocery').click();
  await page.locator('[data-testid^="item-"]:visible').first().click();
  await page.locator('[data-testid^="item-"]:visible').nth(2).click();
  await expect($(page, 'check-toast')).toBeVisible();
  await page.waitForTimeout(4200); // let the toast clear
  await page.screenshot({ path: `${OUT}/04-grocery-list.png` });
  await page.goto('/cook/dinner_wed?today=wed');
  await page.screenshot({ path: `${OUT}/05-cooking-mode.png` });
});
