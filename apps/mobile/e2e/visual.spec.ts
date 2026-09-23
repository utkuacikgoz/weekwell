/**
 * Visual and accessibility QA (A2/A7):
 * - no text runs past the right edge (clipping / horizontal overflow)
 * - the primary action is inside the viewport
 * - every interactive control is at least 44×44
 * - no forbidden product language in rendered text
 * at 320/375/390/430 px and 100/125/150% text (web simulation of Dynamic Type).
 *
 * With CAPTURE=1, saves review screenshots to docs/review/screens/.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { $, buildWeek, onboard } from './helpers';
import { audit as baseAudit } from './audit';

const OUT = 'docs/review/screens';
const CAPTURE = process.env.CAPTURE === '1';
if (CAPTURE) mkdirSync(OUT, { recursive: true });
const audit = (page: Page, name: string, opts: { primary?: string } = {}) => baseAudit(page, name, { ...opts, out: CAPTURE ? `${OUT}/${name}.png` : undefined });

const WIDTHS = [320, 375, 390, 430];
const SCALES = [1, 1.25, 1.5];

for (const width of WIDTHS) {
  for (const fontScale of SCALES) {
    const tag = `${width}w-${Math.round(fontScale * 100)}`;
    const capture = (width === 390 && fontScale === 1) || (width === 320 && fontScale === 1.5);
    test.describe(`${tag}`, () => {
      test.use({ viewport: { width, height: width === 320 ? 568 : width === 430 ? 932 : 844 } });
      const name = (s: string) => (capture ? `${s}@${tag}` : `tmp-${s}`);
      const q = `fontScale=${fontScale}`;

      test('onboarding screens', async ({ page }) => {
        await page.goto(`/onboarding?${q}`);
        await audit(page, name('01-welcome'), { primary: 'start' });
        await $(page, 'start').click();
        await audit(page, name('02-store-empty'), { primary: 'continue' });
        await $(page, 'store-trader_joes').click();
        await audit(page, name('03-store-selected'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('04-budget'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('05-goal'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('06-time'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('07-household'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('08-exclusions'), { primary: 'continue' });
        await $(page, 'continue').click();
        await audit(page, name('09-review'), { primary: 'generate' });
      });

      test('week, meal, grocery', async ({ page }) => {
        await buildWeek(page, { query: q });
        await audit(page, name('11-week'), { primary: 'open-grocery' });
        await $(page, 'meal-dinner_wed').click();
        await audit(page, name('12-meal-detail'));
        await $(page, 'repair-swap').click();
        await expect($(page, 'swap-banner')).toBeVisible();
        await audit(page, name('13-meal-swapped'));
        await page.goBack();
        await $(page, 'open-grocery').click();
        await audit(page, name('14-grocery'), { primary: 'share-list' });
        await page.locator('[data-testid^="item-"]:visible').first().click();
        await page.locator('[data-testid^="item-"]:visible').nth(1).click();
        await audit(page, name('15-grocery-checked'), { primary: 'share-list' });
      });

      test('preferences and paywall', async ({ page }) => {
        await buildWeek(page, { query: q });
        await $(page, 'edit-preferences').click();
        await $(page, 'pref-store-walmart').click();
        await expect($(page, 'preference-preview')).toBeVisible();
        await audit(page, name('16-preferences-preview'), { primary: 'apply-preferences' });
        await page.goto(`/trial?${q}`);
        await audit(page, name('17-trial'), { primary: 'start-trial' });
        await $(page, 'product-monthly').click();
        await audit(page, name('18-trial-selected'), { primary: 'start-trial' });
      });
    });
  }
}

test.describe('states at 390', () => {
  test('generating (in progress)', async ({ page }) => {
    await onboard(page, { query: 'generation=timeout' });
    await $(page, 'generate').click();
    await expect(page.getByText('Building your week').filter({ visible: true })).toBeVisible();
    await audit(page, '10-generating@390w-100');
    await expect($(page, 'generation-error')).toBeVisible({ timeout: 15_000 });
    await audit(page, '21-error-timeout@390w-100', { primary: 'retry' });
  });

  test('generation failure', async ({ page }) => {
    await onboard(page, { query: 'generation=invalid_output' });
    await $(page, 'generate').click();
    await expect($(page, 'generation-error')).toBeVisible({ timeout: 15_000 });
    await audit(page, '22-error-invalid-output@390w-100', { primary: 'retry' });
  });

  test('allergy conflict', async ({ page }) => {
    await onboard(page, { store: 'walmart', time: '20', exclusions: ['dairy', 'gluten', 'nuts'] });
    await $(page, 'review-exclusions').click();
    await $(page, 'exclusion-input').fill('fish');
    await $(page, 'exclusion-add').click();
    await audit(page, '23-exclusions-conflict@390w-100', { primary: 'continue' });
    await $(page, 'continue').click();
    await audit(page, '24-review-conflict@390w-100');
  });

  for (const [prices, file] of [['stale', '25-week-stale-prices'], ['unavailable', '26-week-prices-unavailable'], ['partial', '27-week-prices-partial'], ['fresh', '28-week-estimate-fresh'], ['verified', '29-week-verified']] as const) {
    test(`prices: ${prices}`, async ({ page }) => {
      await buildWeek(page, { query: `prices=${prices}` });
      await audit(page, `${file}@390w-100`, { primary: 'open-grocery' });
      if (prices === 'partial') {
        await $(page, 'open-grocery').click();
        await audit(page, `27b-grocery-prices-partial@390w-100`, { primary: 'share-list' });
      }
    });
  }

  test('over budget', async ({ page }) => {
    await buildWeek(page, { store: 'walmart', budget: 40, household: '3_4' });
    await audit(page, '30-week-over-budget@390w-100', { primary: 'open-grocery' });
  });

  test('trial active, restore failure, delete confirm', async ({ page }) => {
    await buildWeek(page, { query: 'restore=error' });
    await $(page, 'open-trial').click();
    await $(page, 'product-yearly').click();
    await $(page, 'start-trial').click();
    await expect($(page, 'trial-active')).toBeVisible();
    await audit(page, '31-trial-active@390w-100');
    await $(page, 'restore').click();
    await expect($(page, 'restore-failed')).toBeVisible();
    await audit(page, '32-restore-failed@390w-100');
    await page.goto('/preferences');
    await $(page, 'delete-data').click();
    await audit(page, '33-delete-confirm@390w-100');
  });

  test('meal off the grocery list', async ({ page }) => {
    await buildWeek(page);
    await $(page, 'meal-dinner_mon').click();
    await $(page, 'toggle-on-list').click();
    await audit(page, '34-meal-off-list@390w-100');
  });
});
