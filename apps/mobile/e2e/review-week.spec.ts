/**
 * Wave 1 review captures: the week plan screen only, one state per file at
 * 390×844, plus 320px/150% text and a short recording. Run with REVIEW=1.
 * Every state is still run as an audited test when REVIEW is unset.
 */
import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, buildWeek } from './helpers';

const OUT = 'docs/review/v2/week';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string, primary = 'open-grocery') => audit(page, name, { primary, out: REVIEW ? `${OUT}/${name}.png` : undefined });

test.describe('week plan · 390×844', () => {
  test('idle, pressed, scrolled, about sheet', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await shot(page, '01-idle');
    const card = await $(page, 'tonight-card').boundingBox();
    await page.mouse.move(card!.x + card!.width / 2, card!.y + 80);
    await page.mouse.down();
    await page.waitForTimeout(120);
    if (REVIEW) await page.screenshot({ path: `${OUT}/02-pressed-tonight.png` });
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(300);
    await shot(page, '03-scrolled');
    await $(page, 'price-about').click();
    await expect($(page, 'about-sheet')).toBeVisible();
    await page.waitForTimeout(400);
    if (REVIEW) await page.screenshot({ path: `${OUT}/04-detail-about-estimate.png` });
  });

  test('loading: prices updating', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&priceDelay=4000' });
    await $(page, 'price-about').click();
    await page.getByRole('button', { name: 'Check prices again' }).filter({ visible: true }).click();
    await expect($(page, 'price-kind')).toContainText('updating');
    await shot(page, '05-loading-prices-updating');
  });

  test('error: prices unavailable', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&prices=unavailable' });
    await shot(page, '06-error-price-unavailable');
  });

  test('stale prices', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&prices=stale' });
    await shot(page, '07-stale-prices');
  });

  test('over budget → rebuild → undo', async ({ page }) => {
    await buildWeek(page, { store: 'walmart', budget: 40, household: '3_4', query: 'today=wed' });
    await shot(page, '08-over-budget');
    await $(page, 'price-action-rebuild').click();
    await expect($(page, 'rebuild-sheet')).toBeVisible();
    await page.waitForTimeout(400);
    if (REVIEW) await page.screenshot({ path: `${OUT}/09-detail-rebuild-sheet.png` });
    await $(page, 'rebuild-apply').click();
    await expect($(page, 'plan-undo')).toBeVisible();
    await shot(page, '10-rebuilt-with-undo');
  });

  test('weekend: next up Monday', async ({ page }) => {
    await buildWeek(page, { query: 'today=sat' });
    await shot(page, '11-weekend-next-up');
  });
});

test.describe('week plan · 320×568 at 150% text', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('idle', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&fontScale=1.5' });
    await shot(page, '12-idle-320-150');
  });
});

test.describe('recording', () => {
  test.skip(!REVIEW, 'recording only for review captures');
  test('plan → recipe → back → grocery', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: 'test-results/video', size: { width: 390, height: 844 } } });
    const page = await context.newPage();
    await buildWeek(page, { query: 'today=wed' });
    await page.waitForTimeout(1200);
    await $(page, 'tonight-card').click();
    await page.waitForTimeout(1500);
    await page.goBack();
    await page.waitForTimeout(800);
    await page.mouse.move(195, 500);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(600);
    await $(page, 'price-about').click();
    await page.waitForTimeout(1500);
    await $(page, 'about-done').click();
    await page.waitForTimeout(600);
    await $(page, 'open-grocery').click();
    await page.waitForTimeout(1500);
    const video = page.video();
    await context.close();
    if (video) copyFileSync(await video.path(), `${OUT}/13-recording-plan-recipe-grocery.webm`);
  });
});
