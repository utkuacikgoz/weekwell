/** Wave 3 review captures: meal detail, swap, cooking mode. Run with REVIEW=1 to save files. */
import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, buildWeek, onboard, findTimerStep } from './helpers';

const OUT = 'docs/review/v3/meal';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string, primary?: string) => audit(page, name, { primary, out: REVIEW ? `${OUT}/${name}.png` : undefined });
const scrollDown = async (page: Page, by = 5000) => {
  await page.mouse.move(195, 400);
  await page.mouse.wheel(0, by);
  await page.waitForTimeout(300);
};

test.describe('meal · 390×844', () => {
  test('idle, pressed, scrolled, nutrition and more changes open', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'meal-dinner_wed').click();
    await shot(page, '01-idle', 'start-cooking');
    const b = await $(page, 'start-cooking').boundingBox();
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(120);
    if (REVIEW) await page.screenshot({ path: `${OUT}/02-pressed-start-cooking.png` });
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await scrollDown(page, 700);
    await shot(page, '03-scrolled-ingredients-steps', 'start-cooking');
    await scrollDown(page);
    await $(page, 'nutrition-toggle').click();
    await $(page, 'more-changes').click();
    await scrollDown(page);
    await shot(page, '04-detail-nutrition-and-more-changes', 'start-cooking');
  });

  test('swap pending → keep', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'meal-dinner_wed').click();
    await scrollDown(page);
    await $(page, 'repair-swap').click();
    await expect($(page, 'swap-pending')).toBeVisible();
    await shot(page, '05-swap-pending', 'keep-swap');
    await $(page, 'keep-swap').click();
    await expect($(page, 'meal-toast')).toBeVisible();
    await shot(page, '06-swap-kept', 'start-cooking');
  });

  test('swap pending → undo', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'meal-dinner_wed').click();
    await scrollDown(page);
    await $(page, 'repair-swap').click();
    await $(page, 'undo-swap').click();
    await expect($(page, 'meal-toast')).toContainText('Swap undone');
    await shot(page, '07-swap-undone', 'start-cooking');
  });

  test('error: no other meal fits', async ({ page }) => {
    await onboard(page, { time: '20', query: 'today=wed' });
    await $(page, 'review-exclusions').click();
    await $(page, 'exclusion-input').fill('egg');
    await $(page, 'exclusion-add').click();
    await $(page, 'continue').click();
    await $(page, 'generate').click();
    await expect($(page, 'tonight-card')).toBeVisible({ timeout: 15_000 });
    await $(page, 'meal-dinner_wed').click();
    await scrollDown(page);
    await expect($(page, 'repair-swap')).toHaveAttribute('aria-disabled', 'true');
    await shot(page, '08-error-no-other-meal-fits', 'start-cooking');
  });

  test('meal off the grocery list', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'meal-dinner_mon').click();
    await $(page, 'toggle-on-list').click();
    await shot(page, '09-off-grocery-list', 'start-cooking');
  });

  test('cooking mode', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'meal-dinner_wed').click();
    await $(page, 'start-cooking').click();
    await shot(page, '10-cooking-step-1', 'cook-next');
    await $(page, 'cook-next').click();
    await $(page, 'cook-next').click();
    await shot(page, '11-cooking-step-3', 'cook-next');
    await findTimerStep(page);
    await shot(page, '13-cooking-timer-offered', 'cook-next');
    await $(page, 'cook-timer-start').click();
    await shot(page, '14-cooking-timer-running', 'cook-next');
    await $(page, 'nav-back').click();
    await $(page, 'nav-back').click();
    await expect($(page, 'continue-cooking')).toBeVisible();
    await shot(page, '15-week-continue-cooking', 'open-grocery');
  });
});

test.describe('meal · 320×568 at 150% text', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('idle', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&fontScale=1.5' });
    await $(page, 'meal-dinner_wed').click();
    await shot(page, '12-idle-320-150', 'start-cooking');
  });
});

test.describe('recording', () => {
  test.skip(!REVIEW, 'recording only for review captures');
  test('open, swap, keep, cook', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: 'test-results/video', size: { width: 390, height: 844 } } });
    const page = await context.newPage();
    await buildWeek(page, { query: 'today=wed' });
    await page.waitForTimeout(600);
    await $(page, 'tonight-card').click();
    await page.waitForTimeout(1200);
    await page.mouse.move(195, 400);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(100);
    }
    await $(page, 'repair-swap').click();
    await page.waitForTimeout(1800);
    await $(page, 'keep-swap').click();
    await page.waitForTimeout(1200);
    await $(page, 'start-cooking').click();
    await page.waitForTimeout(1000);
    await $(page, 'cook-next').click();
    await page.waitForTimeout(1200);
    const video = page.video();
    await context.close();
    if (video) copyFileSync(await video.path(), `${OUT}/13-recording-open-swap-keep-cook.webm`);
  });
});
