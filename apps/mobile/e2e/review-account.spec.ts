/** Wave 5 review captures: preferences, paywall, read-only after trial, delete data. REVIEW=1 saves files. */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { audit } from './audit';
import { $, buildWeek } from './helpers';

const OUT = 'docs/review/v3/account';
const REVIEW = process.env.REVIEW === '1';
if (REVIEW) mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string, primary?: string) => audit(page, name, { primary, out: REVIEW ? `${OUT}/${name}.png` : undefined });

test.describe('preferences · 390×844', () => {
  test('idle, change preview, blocked change, delete sheet', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'edit-preferences').click();
    await shot(page, '01-preferences-idle');
    await $(page, 'pref-store-walmart').click();
    await expect($(page, 'preference-preview')).toBeVisible();
    await shot(page, '02-preferences-change-preview', 'apply-preferences');
    await $(page, 'discard-preferences').click();
    await $(page, 'pref-time-20').click();
    for (const e of ['dairy', 'gluten', 'nuts']) await $(page, `exclusion-${e}`).click();
    await $(page, 'exclusion-input').fill('fish');
    await $(page, 'exclusion-add').click();
    await expect($(page, 'preference-preview')).toContainText('doesn’t fit');
    await shot(page, '03-preferences-blocked');
    await $(page, 'discard-preferences').click();
    await $(page, 'delete-data').click();
    await expect($(page, 'delete-sheet')).toBeVisible();
    await page.waitForTimeout(400);
    if (REVIEW) await page.screenshot({ path: `${OUT}/04-delete-confirm-sheet.png` });
  });
});

test.describe('paywall · 390×844', () => {
  test('free week: idle, selected, started', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed' });
    await $(page, 'open-trial').click();
    await shot(page, '05-paywall-idle', 'start-trial');
    await $(page, 'product-monthly').click();
    await shot(page, '06-paywall-selected', 'start-trial');
    await $(page, 'start-trial').click();
    await expect($(page, 'trial-active')).toBeVisible();
    await shot(page, '07-trial-active');
  });

  test('restore failure', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&restore=error' });
    await $(page, 'open-trial').click();
    await $(page, 'restore').click();
    await expect($(page, 'restore-failed')).toBeVisible();
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 3000);
    await shot(page, '08-restore-failed', 'start-trial');
  });

  test('after the free week: read-only week, locked action, subscribe', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&entitlement=expired' });
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 3000);
    await shot(page, '09-week-after-trial');
    await $(page, 'plan-new-week').click();
    await expect($(page, 'locked-sheet')).toBeVisible();
    await page.waitForTimeout(400);
    if (REVIEW) await page.screenshot({ path: `${OUT}/10-locked-sheet.png` });
    await $(page, 'locked-see-plans').click();
    await $(page, 'product-yearly').click();
    await shot(page, '11-subscribe-after-trial', 'start-trial');
  });
});

test.describe('paywall · 320×568 at 150% text', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('idle', async ({ page }) => {
    await buildWeek(page, { query: 'today=wed&fontScale=1.5' });
    await page.goto('/trial?today=wed&fontScale=1.5');
    await shot(page, '12-paywall-320-150', 'start-trial');
  });
});
