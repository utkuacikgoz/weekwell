/**
 * Layout gate (design audit 2026-09-24, P0): nothing important may sit under
 * the bottom action bar, and the bar may not eat the screen.
 *
 * For every screen with a bar, at 390×844 and at 320×568 with 150% text:
 * - scrolled to the end, the last text or control ends above the bar;
 * - the bar is at most 20% (390) / 32% (320 at 150%) of the viewport height;
 * - the page never scrolls sideways.
 * FOOTER_SHOTS=1 saves each case to qa-artifacts/tmp/footer/.
 */
import { expect, test, type Page } from '@playwright/test';
import { $, buildWeek, onboard } from './helpers';

type Case = { name: string; open: (page: Page, q: string) => Promise<void> };

const CASES: Case[] = [
  { name: 'week', open: async (page, q) => void (await buildWeek(page, { query: q })) },
  {
    name: 'week-over-budget',
    open: async (page, q) => {
      await buildWeek(page, { budget: 40, query: q });
      await expect($(page, 'price-notice')).toBeVisible();
    },
  },
  {
    name: 'grocery',
    open: async (page, q) => {
      await buildWeek(page, { query: q });
      await $(page, 'open-grocery').click();
      await expect($(page, 'grocery-screen')).toBeVisible();
    },
  },
  {
    name: 'meal',
    open: async (page, q) => {
      await buildWeek(page, { query: q });
      await $(page, 'tonight-card').click();
      await expect($(page, 'start-cooking')).toBeVisible();
    },
  },
  {
    name: 'meal-swap-pending',
    open: async (page, q) => {
      await buildWeek(page, { query: q });
      await $(page, 'tonight-card').click();
      await $(page, 'repair-swap').click();
      await expect($(page, 'keep-swap')).toBeVisible();
    },
  },
  {
    name: 'onboarding-store',
    open: async (page, q) => {
      await page.goto(`/onboarding?${q}`);
      await $(page, 'start').click();
      await $(page, 'store-trader_joes').click();
    },
  },
  {
    name: 'onboarding-review',
    open: async (page, q) => void (await onboard(page, { query: q })),
  },
  {
    name: 'trial',
    open: async (page, q) => {
      await buildWeek(page, { query: q });
      await $(page, 'open-trial').click();
      await expect($(page, 'start-trial')).toBeVisible();
    },
  },
  {
    name: 'cook',
    open: async (page, q) => {
      await buildWeek(page, { query: q });
      await $(page, 'tonight-card').click();
      await $(page, 'start-cooking').click();
      await expect($(page, 'cook-next')).toBeVisible();
    },
  },
];

const SIZES = [
  { label: '390', viewport: { width: 390, height: 844 }, q: 'today=wed', maxShare: 0.2 },
  { label: '320-150', viewport: { width: 320, height: 568 }, q: 'today=wed&fontScale=1.5', maxShare: 0.32 },
];

async function measure(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && r.left < innerWidth && r.right > 0;
    };
    const footer = [...document.querySelectorAll('[data-testid="screen-footer"]')].find(visible);
    const scroll = [...document.querySelectorAll('[data-testid="screen-scroll"]')].find(visible) as HTMLElement | undefined;
    if (!scroll) return null;
    scroll.scrollTop = scroll.scrollHeight;
    // Last leaf that shows text or is a control.
    const leaves = [...scroll.querySelectorAll('*')].filter(
      (el) => visible(el) && (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'checkbox' || (el.children.length === 0 && (el.textContent ?? '').trim().length > 0)),
    );
    const lastBottom = Math.max(...leaves.map((el) => el.getBoundingClientRect().bottom));
    const f = footer?.getBoundingClientRect();
    return {
      footerTop: f ? f.top : innerHeight,
      footerHeight: f ? f.height : 0,
      lastBottom,
      viewportHeight: innerHeight,
      sideways: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

for (const size of SIZES) {
  test.describe(`bottom bar · ${size.label}`, () => {
    test.use({ viewport: size.viewport });
    for (const c of CASES) {
      test(c.name, async ({ page }) => {
        await c.open(page, size.q);
        await page.waitForTimeout(250);
        const m = await measure(page);
        expect(m, 'screen scroll container').not.toBeNull();
        await page.waitForTimeout(150);
        if (process.env.FOOTER_SHOTS) await page.screenshot({ path: `../../qa-artifacts/tmp/footer/${c.name}-${size.label}.png` });
        const after = (await measure(page))!;
        expect(after.lastBottom, 'last row ends above the bar').toBeLessThanOrEqual(after.footerTop + 1);
        expect(after.footerHeight / after.viewportHeight, 'bar height share').toBeLessThanOrEqual(size.maxShare);
        expect(after.sideways, 'no sideways scroll').toBeLessThanOrEqual(0);
      });
    }
  });
}

test.describe('long dish names · 320 at 150%', () => {
  test.use({ viewport: { width: 320, height: 568 } });
  test('wrap without clipping, and the serif steps down', async ({ page }) => {
    await page.goto('/review/type?review=1&fontScale=1.5');
    await expect($(page, 'type-specimen')).toBeVisible();
    const r = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[data-testid="type-specimen"] div[dir="auto"]')] as HTMLElement[];
      const clipped = els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent);
      const title = document.querySelector('[data-testid="specimen-title"]') as HTMLElement;
      return { clipped, titleSize: parseFloat(getComputedStyle(title).fontSize), sideways: document.documentElement.scrollWidth - innerWidth };
    });
    if (process.env.FOOTER_SHOTS) await page.screenshot({ path: '../../qa-artifacts/tmp/footer/type-320-150.png', fullPage: true });
    expect(r.clipped).toEqual([]);
    expect(r.sideways).toBeLessThanOrEqual(0);
    // Narrow title is 24px; serif stops growing at 130%.
    expect(r.titleSize).toBeLessThanOrEqual(24 * 1.3 + 0.5);
  });
});
