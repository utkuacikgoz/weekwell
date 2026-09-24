/** Wave 2 review captures: grocery list. Run with REVIEW=1 to save files. */
import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, buildWeek } from './helpers';

const OUT = 'docs/review/v3/grocery';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string) => audit(page, name, { primary: 'share-list', out: REVIEW ? `${OUT}/${name}.png` : undefined });
const items = (page: Page) => page.locator('[data-testid^="item-"]:visible');

async function openList(page: Page, query = 'today=wed') {
  await buildWeek(page, { query });
  await $(page, 'open-grocery').click();
  await expect($(page, 'grocery-screen')).toBeVisible();
}

test.describe('grocery · 390×844', () => {
  test('idle, pressed, checked with undo, used-in sheet, scrolled, staples', async ({ page }) => {
    await openList(page);
    await shot(page, '01-idle');
    const box = await items(page).nth(1).boundingBox();
    await page.mouse.move(box!.x + 60, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(120);
    if (REVIEW) await page.screenshot({ path: `${OUT}/02-pressed-row.png` });
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await items(page).first().click();
    await items(page).nth(2).click();
    await expect($(page, 'check-toast')).toBeVisible();
    await shot(page, '03-checked-with-undo-toast');
    await page.locator('[data-testid^="used-in-"]:visible').first().click();
    await expect($(page, 'used-in-sheet')).toBeVisible();
    await page.waitForTimeout(400);
    if (REVIEW) await page.screenshot({ path: `${OUT}/04-detail-used-in-meals.png` });
    await page.mouse.click(195, 60); // tap the dimmed area above the sheet
    await expect($(page, 'used-in-sheet')).toHaveCount(0);
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(300);
    await $(page, 'staples-toggle').click();
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(300);
    await shot(page, '05-scrolled-staples-open');
  });

  test('stale prices', async ({ page }) => {
    await openList(page, 'today=wed&prices=stale');
    await shot(page, '06-stale-prices');
  });

  test('missing prices', async ({ page }) => {
    await openList(page, 'today=wed&prices=partial');
    await shot(page, '07-missing-prices');
  });

  test('loading prices', async ({ page }) => {
    await openList(page, 'today=wed&priceDelay=4000');
    await $(page, 'price-about').click();
    await page.getByRole('button', { name: 'Check prices again' }).filter({ visible: true }).click();
    await expect($(page, 'price-kind')).toContainText('updating');
    await shot(page, '08-loading-prices');
  });

  test('all checked', async ({ page }) => {
    await openList(page);
    const n = await items(page).count();
    for (let i = 0; i < n; i++) await items(page).nth(i).click();
    await expect($(page, 'all-checked')).toBeVisible();
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, -5000);
    await shot(page, '09-all-checked');
  });

  test('empty list', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    for (const id of ['dinner_mon', 'dinner_tue', 'dinner_wed', 'dinner_thu', 'dinner_fri', 'lunch_a', 'lunch_b']) {
      await page.goto(`/meal/${id}?today=wed`);
      await $(page, 'toggle-on-list').click();
    }
    await page.goto('/grocery?today=wed');
    await expect($(page, 'empty-list')).toBeVisible();
    await audit(page, '10-empty', { out: REVIEW ? `${OUT}/10-empty.png` : undefined });
  });
});

test.describe('grocery · 320×568 at 150% text', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('idle', async ({ page }) => {
    await openList(page, 'today=wed&fontScale=1.5');
    await shot(page, '11-idle-320-150');
  });
});

test.describe('recording', () => {
  test.skip(!REVIEW, 'recording only for review captures');
  test('check, undo, used-in', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: 'test-results/video', size: { width: 390, height: 844 } } });
    const page = await context.newPage();
    await openList(page);
    await page.waitForTimeout(800);
    await items(page).first().click();
    await page.waitForTimeout(900);
    await items(page).nth(1).click();
    await page.waitForTimeout(900);
    await $(page, 'undo-check').click();
    await page.waitForTimeout(900);
    await page.locator('[data-testid^="used-in-"]:visible').first().click();
    await page.waitForTimeout(1500);
    const video = page.video();
    await context.close();
    if (video) copyFileSync(await video.path(), `${OUT}/12-recording-check-undo-used-in.webm`);
  });
});
