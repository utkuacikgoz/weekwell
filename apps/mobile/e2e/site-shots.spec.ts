/**
 * Real app screens for the weekwell.pro landing page (D-044). Run with
 * SITE_SHOTS=1 npx playwright test e2e/site-shots.spec.ts --project=local
 * after `npm run export:web`. Writes JPEGs into site/src/img.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { $, buildWeek, pickStore } from './helpers';

const OUT = '../../site/src/img';
test.skip(!process.env.SITE_SHOTS, 'site screenshots only on demand');
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
};

test('setup sentence', async ({ page }) => {
  await page.goto('/onboarding');
  await $(page, 'start').click();
  await pickStore(page);
  await shot(page, 'setup');
});

test('week, meal, cooking, grocery, swap', async ({ page }) => {
  await buildWeek(page, { budget: 100, household: '2', query: 'today=wed' });
  await shot(page, 'week');
  await $(page, 'meal-dinner_wed').click();
  await expect($(page, 'meal-name')).toBeVisible();
  await shot(page, 'meal');
  await $(page, 'repair-swap').click();
  await expect($(page, 'swap-option-0')).toBeVisible();
  await shot(page, 'swap');
  await page.goto('/cook/dinner_wed?today=wed');
  await $(page, 'cook-timer-start').click();
  await page.waitForTimeout(2200);
  await shot(page, 'cook');
  await page.goto('/week?today=wed');
  await $(page, 'open-grocery').click();
  await expect($(page, 'grocery-screen')).toBeVisible();
  await shot(page, 'grocery');
});

test('leave foods out', async ({ page }) => {
  await page.goto('/onboarding');
  await $(page, 'start').click();
  await pickStore(page);
  await $(page, 'continue').click();
  await $(page, 'continue').click();
  await $(page, 'exclusion-dairy').click();
  await $(page, 'exclusion-nuts').click();
  await shot(page, 'exclusions');
});

const FONT = `@font-face { font-family: B; src: url(data:font/ttf;base64,${readFileSync(require.resolve('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf')).toString('base64')}); }`;

/** The mark: a white W on Weekwell green with a sun-yellow bar. `r` rounds the corners (0 for the app-icon-style square). */
const mark = (size: number, r: number) => `<!doctype html><html><head><style>${FONT}
  html,body{margin:0;background:transparent}
  .m{width:${size}px;height:${size}px;border-radius:${r}px;background:#1F5C40;position:relative;overflow:hidden}
  .w{position:absolute;left:0;right:0;top:${size * 0.1}px;text-align:center;font:800 ${size * 0.74}px/1 B;color:#fff;letter-spacing:-${size * 0.02}px}
  .bar{position:absolute;left:${size * 0.2}px;right:${size * 0.2}px;bottom:${size * 0.14}px;height:${Math.max(2, size * 0.1)}px;background:#F6C453}
</style></head><body><div class="m"><div class="w">W</div><div class="bar"></div></div></body></html>`;

test('brand mark and share image', async ({ browser }) => {
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [size, r, name] of [[16, 3, 'favicon-16'], [32, 6, 'favicon-32'], [48, 9, 'favicon-48'], [180, 0, 'apple-touch-icon'], [192, 36, 'icon-192'], [512, 96, 'icon-512']] as const) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(mark(size, r));
    await page.locator('.m').screenshot({ path: `${OUT}/../brand/${name}.png`, omitBackground: true });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  const phone = readFileSync(`${OUT}/week.jpg`).toString('base64');
  await page.setContent(`<!doctype html><html><head><style>${FONT}
    body{margin:0;width:1200px;height:630px;background:#1F5C40;font-family:B;color:#fff;position:relative;overflow:hidden}
    h1{position:absolute;left:72px;top:150px;margin:0;font-size:92px;line-height:.95;text-transform:uppercase;letter-spacing:-2px;width:640px}
    h1 span{color:#F6C453}
    .wm{position:absolute;left:72px;top:64px;font-size:40px;text-transform:uppercase}.wm span{color:#F6C453}
    .u{position:absolute;left:72px;bottom:64px;font:600 28px system-ui,sans-serif;color:#D3E4DA}
    img{position:absolute;right:90px;top:60px;width:300px;border:12px solid #0B2217;border-radius:44px;transform:rotate(4deg);box-shadow:0 30px 60px rgba(0,0,0,.4)}
  </style></head><body><div class="wm">Week<span>well</span></div><h1>Five dinners. <span>One grocery list.</span> Done.</h1><div class="u">weekwell.pro</div><img src="data:image/jpeg;base64,${phone}"></body></html>`);
  await page.screenshot({ path: `${OUT}/../brand/og.jpg`, type: 'jpeg', quality: 86 });
  await ctx.close();
});

/**
 * App icons from the same mark (D-045). `scale` shrinks the W and bar inside the canvas
 * (Android adaptive icons keep art in the middle 66%); `bg` null means transparent.
 */
const glyph = (size: number, { bg, scale = 1, bar = '#F6C453' }: { bg: string | null; scale?: number; bar?: string }) => {
  const s = size * scale;
  const off = (size - s) / 2;
  return `<!doctype html><html><head><style>${FONT}
  html,body{margin:0;background:transparent}
  .m{width:${size}px;height:${size}px;background:${bg ?? 'transparent'};position:relative;overflow:hidden}
  .w{position:absolute;left:${off}px;width:${s}px;top:${off + s * 0.1}px;text-align:center;font:800 ${s * 0.74}px/1 B;color:#fff;letter-spacing:-${s * 0.02}px}
  .bar{position:absolute;left:${off + s * 0.2}px;width:${s * 0.6}px;top:${off + s * 0.76}px;height:${s * 0.1}px;background:${bar}}
</style></head><body><div class="m"><div class="w">W</div><div class="bar"></div></div></body></html>`;
};

test('app icons', async ({ browser }) => {
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const A = '../../apps/mobile/assets';
  const jobs: [number, Parameters<typeof glyph>[1], string, boolean][] = [
    // iOS rounds the corners itself; the icon must be square and opaque.
    [1024, { bg: '#1F5C40' }, 'icon', false],
    // Shown centred on the green splash background.
    [1024, { bg: null, scale: 0.7 }, 'splash-icon', true],
    [1024, { bg: null, scale: 0.62 }, 'android-icon-foreground', true],
    [1024, { bg: null, scale: 0.62, bar: '#FFFFFF' }, 'android-icon-monochrome', true],
    [48, { bg: '#1F5C40' }, 'favicon', false],
  ];
  for (const [size, opts, name, transparent] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(glyph(size, opts));
    await page.locator('.m').screenshot({ path: `${A}/${name}.png`, omitBackground: transparent });
  }
  await ctx.close();
});

/**
 * App Store screenshots (D-045): real screens at 3×, then captioned in the Bold blocks
 * style at Apple's 6.9" (1320×2868) and 6.5" (1284×2778) sizes.
 */
const STORE = 'docs/release/screenshots/app-store';
const STORE_SCREENS: [string, string, string][] = [
  ['01-week', 'Five dinners.', 'One grocery list.'],
  ['02-setup', 'Plan it in', 'one sentence.'],
  ['03-grocery', 'Shop once,', 'by aisle, with prices.'],
  ['04-swap', 'Not feeling it?', 'Pick from three.'],
  ['05-cook', 'Every step', 'on one screen.'],
  ['06-exclusions', 'Leave out', 'what you don’t eat.'],
];

test('app store screenshots', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const raw = async (name: string) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${STORE}/raw/${name}.png` });
  };
  await page.goto('/onboarding');
  await $(page, 'start').click();
  await pickStore(page);
  await raw('02-setup');
  await $(page, 'continue').click();
  await $(page, 'continue').click();
  await $(page, 'exclusion-dairy').click();
  await $(page, 'exclusion-nuts').click();
  await raw('06-exclusions');
  await buildWeek(page, { budget: 100, household: '2', query: 'today=wed' });
  await raw('01-week');
  await $(page, 'meal-dinner_wed').click();
  await $(page, 'repair-swap').click();
  await expect($(page, 'swap-option-0')).toBeVisible();
  await raw('04-swap');
  await page.goto('/cook/dinner_wed?today=wed');
  await $(page, 'cook-timer-start').click();
  await page.waitForTimeout(2200);
  await raw('05-cook');
  await page.goto('/week?today=wed');
  await $(page, 'open-grocery').click();
  await expect($(page, 'grocery-screen')).toBeVisible();
  await raw('03-grocery');

  const frame = await ctx.browser()!.newContext({ deviceScaleFactor: 1 });
  const fp = await frame.newPage();
  for (const [w, h, dir] of [[1320, 2868, '6.9'], [1284, 2778, '6.5']] as const) {
    await fp.setViewportSize({ width: w, height: h });
    for (const [i, [name, a, b]] of STORE_SCREENS.entries()) {
      const img = readFileSync(`${STORE}/raw/${name}.png`).toString('base64');
      const bands = ['#A83E28', '#1B6480', '#735400', '#6B3F8E', '#26704F', '#A83E28'];
      const phoneW = w * 0.78;
      await fp.setContent(`<!doctype html><html><head><style>${FONT}
        body{margin:0;width:${w}px;height:${h}px;background:#1F5C40;overflow:hidden;position:relative;font-family:B}
        .band{position:absolute;left:0;right:0;top:0;height:${h * 0.2}px;background:${bands[i]}}
        h1{position:absolute;left:${w * 0.07}px;right:${w * 0.07}px;top:${h * 0.045}px;margin:0;color:#fff;font-size:${w * 0.092}px;line-height:1;text-transform:uppercase;letter-spacing:-${w * 0.002}px}
        h1 span{display:block;color:#F6C453}
        .phone{position:absolute;left:${(w - phoneW) / 2}px;top:${h * 0.235}px;width:${phoneW}px;border:${w * 0.022}px solid #0B2217;border-radius:${w * 0.1}px;overflow:hidden;box-shadow:0 ${w * 0.03}px ${w * 0.08}px rgba(0,0,0,.45);background:#0B2217}
        .phone img{display:block;width:100%}
      </style></head><body><div class="band"></div><h1>${a}<span>${b}</span></h1><div class="phone"><img src="data:image/png;base64,${img}"></div></body></html>`);
      await fp.screenshot({ path: `${STORE}/${dir}/${name}.png` });
    }
  }
  await frame.close();
  await ctx.close();
});
