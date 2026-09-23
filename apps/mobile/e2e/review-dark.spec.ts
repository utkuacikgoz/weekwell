/** Wave 6: system dark mode on the core screens (audited; REVIEW=1 saves captures). */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, buildWeek } from './helpers';

const OUT = 'docs/review/v2/dark';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string, primary?: string) => audit(page, name, { primary, out: REVIEW ? `${OUT}/${name}.png` : undefined });

test.use({ colorScheme: 'dark' });

test('core screens in dark mode', async ({ page }) => {
  await page.goto('/onboarding');
  await shot(page, '01-welcome', 'start');
  await $(page, 'start').click();
  await $(page, 'store-trader_joes').click();
  await shot(page, '02-store-budget', 'continue');
  await buildWeek(page, { query: 'today=wed' });
  await shot(page, '03-week', 'open-grocery');
  await $(page, 'meal-dinner_wed').click();
  await shot(page, '04-meal', 'start-cooking');
  await page.goBack();
  await $(page, 'open-grocery').click();
  await page.locator('[data-testid^="item-"]:visible').first().click();
  await shot(page, '05-grocery-checked-toast', 'share-list');
  await $(page, 'price-about').click();
  await expect($(page, 'about-sheet')).toBeVisible();
  await page.waitForTimeout(400);
  if (REVIEW) await page.screenshot({ path: `${OUT}/06-about-sheet.png` });
  await page.goto('/trial?today=wed');
  await $(page, 'product-monthly').click();
  await shot(page, '07-paywall', 'start-trial');
});

test('attention states in dark mode', async ({ page }) => {
  await buildWeek(page, { store: 'walmart', budget: 40, household: '3_4', query: 'today=wed' });
  await shot(page, '08-week-over-budget', 'open-grocery');
});
