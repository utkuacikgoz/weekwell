/** Wave 4 review captures: welcome, 4-step setup, generating. Run with REVIEW=1 to save files. */
import { expect, test, type Page } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, onboard } from './helpers';

const OUT = 'docs/review/v2/onboarding';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string, primary?: string) => audit(page, name, { primary, out: REVIEW ? `${OUT}/${name}.png` : undefined });

test.describe('onboarding · 390×844', () => {
  test('welcome → store and budget → your week → foods → review', async ({ page }) => {
    await page.goto('/onboarding');
    await shot(page, '01-welcome', 'start');
    await $(page, 'start').click();
    await shot(page, '02-store-budget-empty', 'continue');
    const b = await $(page, 'store-walmart').boundingBox();
    await page.mouse.move(b!.x + 40, b!.y + 20);
    await page.mouse.down();
    await page.waitForTimeout(120);
    if (REVIEW) await page.screenshot({ path: `${OUT}/03-pressed-store.png` });
    await page.mouse.up();
    await shot(page, '04-store-budget-selected', 'continue');
    await $(page, 'continue').click();
    await $(page, 'time-20').click();
    await shot(page, '05-your-week', 'continue');
    await $(page, 'continue').click();
    await $(page, 'exclusion-dairy').click();
    await shot(page, '06-foods-to-leave-out', 'continue');
    await $(page, 'continue').click();
    await shot(page, '07-review', 'generate');
  });

  test('conflict: not enough meals', async ({ page }) => {
    await onboard(page, { time: '20', exclusions: ['dairy', 'gluten', 'nuts'] });
    await $(page, 'review-exclusions').click();
    await $(page, 'exclusion-input').fill('fish');
    await $(page, 'exclusion-add').click();
    await shot(page, '08-foods-conflict', 'continue');
    await $(page, 'continue').click();
    await shot(page, '09-review-conflict');
  });

  test('generating and failures', async ({ page }) => {
    await onboard(page, { query: 'generation=timeout' });
    await $(page, 'generate').click();
    await expect(page.getByText('Building your week').filter({ visible: true })).toBeVisible();
    await shot(page, '10-generating');
    await expect($(page, 'generation-error')).toBeVisible({ timeout: 15_000 });
    await shot(page, '11-error-timeout', 'retry');
  });
});

test.describe('onboarding · 320×568 at 150% text', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('store and your week', async ({ page }) => {
    await page.goto('/onboarding?fontScale=1.5');
    await $(page, 'start').click();
    await $(page, 'store-trader_joes').click();
    await shot(page, '12-store-budget-320-150', 'continue');
    await $(page, 'continue').click();
    await shot(page, '13-your-week-320-150', 'continue');
  });
});

test.describe('recording', () => {
  test.skip(!REVIEW, 'recording only for review captures');
  test('full setup to plan', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, recordVideo: { dir: 'test-results/video', size: { width: 390, height: 844 } } });
    const page = await context.newPage();
    await page.goto('/onboarding?today=wed');
    const pause = () => page.waitForTimeout(700);
    await pause();
    await $(page, 'start').click();
    await pause();
    await $(page, 'store-trader_joes').click();
    await pause();
    await $(page, 'continue').click();
    await pause();
    await $(page, 'goal-low_effort').click();
    await $(page, 'household-2').click();
    await pause();
    await $(page, 'continue').click();
    await pause();
    await $(page, 'exclusion-nuts').click();
    await pause();
    await $(page, 'continue').click();
    await page.waitForTimeout(1200);
    await $(page, 'generate').click();
    await page.waitForTimeout(2500);
    const video = page.video();
    await context.close();
    if (video) copyFileSync(await video.path(), `${OUT}/14-recording-setup-to-plan.webm`);
  });
});
