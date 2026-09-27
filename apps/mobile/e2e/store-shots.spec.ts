/**
 * App Store screenshots (D-045). Real app screens and real UI pieces, captured at 3× from the
 * web build, composed into designed slides: bold benefit headline, tilted phone with a status
 * bar, enlarged UI pulled out of the phone, and the app's own plate illustrations.
 *
 *   SITE_SHOTS=1 npx playwright test e2e/store-shots.spec.ts --project=local
 *
 * Writes docs/release/screenshots/app-store/{6.9,6.5}/NN-name.png (raw captures are git-ignored).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { $, buildWeek, pickStore } from './helpers';

test.skip(!process.env.SITE_SHOTS, 'store screenshots only on demand');

const OUT = 'docs/release/screenshots/app-store';
const RAW = `${OUT}/raw`;
const font = (pkg: string, file: string) => readFileSync(require.resolve(`@expo-google-fonts/${pkg}/${file}`)).toString('base64');
const FONTS = `@font-face{font-family:D;src:url(data:font/ttf;base64,${font('bricolage-grotesque', '800ExtraBold/BricolageGrotesque_800ExtraBold.ttf')})}
@font-face{font-family:S;font-weight:600;src:url(data:font/ttf;base64,${font('inter', '600SemiBold/Inter_600SemiBold.ttf')})}`;
const b64 = (name: string) => `data:image/png;base64,${readFileSync(`${RAW}/${name}.png`).toString('base64')}`;

const C = { green: '#1F5C40', deep: '#173F2D', ink: '#0B2217', sun: '#F6C453', cream: '#FBF6EA', white: '#FFFFFF' };

async function captureAll(page: Page): Promise<string[]> {
  mkdirSync(RAW, { recursive: true });
  const shot = async (name: string) => {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${RAW}/${name}.png` });
  };
  const piece = async (name: string, loc: Locator) => {
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await loc.screenshot({ path: `${RAW}/${name}.png` });
  };

  await page.goto('/onboarding');
  await $(page, 'start').click();
  await pickStore(page);
  await shot('setup');
  await piece('sentence', $(page, 'store-pick').locator('xpath=..'));
  await $(page, 'continue').click();
  await $(page, 'continue').click();
  for (const e of ['dairy', 'nuts']) await $(page, `exclusion-${e}`).click();
  await shot('exclusions');
  for (const e of ['dairy', 'gluten', 'nuts']) await piece(`switch-${e}`, $(page, `exclusion-${e}`));

  await buildWeek(page, { budget: 100, household: '2', query: 'today=wed' });
  await shot('week');
  // The app's plate illustrations, as vector art.
  const plates = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="meal-"] svg')].map((s) => s.outerHTML).filter((h) => h.includes('viewBox="-1 -1 104 104"')));
  for (const d of ['mon', 'tue', 'wed']) await piece(`row-${d}`, $(page, `meal-dinner_${d}`));
  await piece('budget-line', $(page, 'budget-line'));

  await $(page, 'open-grocery').click();
  await expect($(page, 'grocery-screen')).toBeVisible();
  await shot('grocery');
  const items = page.getByTestId(/^item-/u).filter({ visible: true });
  await items.nth(0).click(); // show one ticked item
  for (const i of [0, 1, 2]) await piece(`item-${i}`, items.nth(i));
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.goto('/week?today=wed');
  await $(page, 'meal-dinner_wed').click();
  await expect($(page, 'meal-name')).toBeVisible();
  await shot('meal');
  await $(page, 'repair-swap').click();
  await expect($(page, 'swap-option-2')).toBeVisible();
  await page.waitForTimeout(500);
  for (const i of [0, 1, 2]) await piece(`swap-${i}`, $(page, `swap-option-${i}`));

  await page.goto('/cook/dinner_wed?today=wed');
  await $(page, 'cook-timer-start').click();
  await page.waitForTimeout(2300);
  await shot('cook');
  await piece('cook-current', $(page, 'cook-current'));
  return plates;
}

/** An iPhone: black bezel, dynamic island, status bar, then the app screen. */
const phone = (screen: string, width: number, extra = '') => {
  const bezel = width * 0.034;
  const inner = width - 2 * bezel;
  const status = inner * 0.12;
  return `<div class="phone" style="width:${width}px;padding:${bezel}px;border-radius:${width * 0.15}px;${extra}">
    <div class="scr" style="border-radius:${width * 0.12}px">
      <div class="status" style="height:${status}px;font-size:${inner * 0.042}px;padding:0 ${inner * 0.085}px">
        <span>9:41</span><span class="island" style="width:${inner * 0.3}px;height:${inner * 0.085}px"></span>
        <span class="glyphs"><i class="bars"></i><i class="batt"></i></span>
      </div>
      <img src="${screen}" style="width:${inner}px;display:block">
    </div></div>`;
};
const plate = (svg: string | undefined, size: number, style: string) =>
  svg === undefined ? "" :
  `<div class="plate" style="width:${size}px;height:${size}px;${style}">${svg.replace(/width="60" height="60"/, `width="${size}" height="${size}"`)}</div>`;
const card = (src: string, width: number, style: string) => `<img class="card" src="${src}" style="width:${width}px;${style}">`;

type Slide = { name: string; bg: string; ink: string; accent: string; kicker: string; title: string[]; sub: string; body: (w: number, h: number, plates: string[]) => string };

const SLIDES: Slide[] = [
  {
    name: '01-dinner-sorted', bg: C.sun, ink: C.deep, accent: C.white, kicker: 'Weekwell',
    title: ['Dinner,', 'sorted.'], sub: 'Five weeknight dinners and one grocery list, planned in two minutes.',
    body: (w, h, p) =>
      plate(p[0], w * 0.44, `left:${-w * 0.1}px;top:${h * 0.52}px`) +
      plate(p[1], w * 0.3, `left:${w * 0.02}px;top:${h * 0.8}px`) +
      phone(b64('week'), w * 0.7, `position:absolute;left:${w * 0.27}px;top:${h * 0.38}px;transform:rotate(-5deg)`) +
      plate(p[2], w * 0.36, `left:${w * 0.72}px;top:${h * 0.3}px`),
  },
  {
    name: '02-one-sentence', bg: C.green, ink: C.white, accent: C.sun, kicker: 'Setup',
    title: ['Plan it in', 'one sentence.'], sub: 'Your store, your budget, your time. That’s it.',
    body: (w, h) =>
      phone(b64('setup'), w * 0.66, `position:absolute;left:${w * 0.17}px;top:${h * 0.42}px`) +
      card(b64('sentence'), w * 0.9, `left:${w * 0.05}px;top:${h * 0.47}px;transform:rotate(-3deg);background:${C.green};padding:${w * 0.04}px;border:${w * 0.008}px solid ${C.sun}`),
  },
  {
    name: '03-every-dinner-priced', bg: C.sun, ink: C.deep, accent: C.white, kicker: 'Budget',
    title: ['See what each', 'dinner costs.'], sub: 'Every meal shows its share of the week’s estimated total.',
    body: (w, h) =>
      phone(b64('week'), w * 0.62, `position:absolute;left:${w * 0.34}px;top:${h * 0.4}px;transform:rotate(4deg)`) +
      card(b64('budget-line'), w * 0.78, `left:${w * 0.05}px;top:${h * 0.43}px;background:${C.green};padding:${w * 0.03}px ${w * 0.04}px`) +
      card(b64('row-mon'), w * 0.86, `left:${w * 0.03}px;top:${h * 0.55}px;transform:rotate(-2deg)`) +
      card(b64('row-tue'), w * 0.86, `left:${w * 0.08}px;top:${h * 0.66}px;transform:rotate(1.5deg)`) +
      card(b64('row-wed'), w * 0.86, `left:${w * 0.02}px;top:${h * 0.77}px;transform:rotate(-1deg)`),
  },
  {
    name: '04-one-list', bg: C.green, ink: C.white, accent: C.sun, kicker: 'Groceries',
    title: ['One list.', 'By aisle.'], sub: 'How much to buy, and about what it costs, for your store.',
    body: (w, h, p) =>
      phone(b64('grocery'), w * 0.66, `position:absolute;left:${w * 0.06}px;top:${h * 0.4}px;transform:rotate(-4deg)`) +
      card(b64('item-0'), w * 0.84, `left:${w * 0.12}px;top:${h * 0.6}px;transform:rotate(2deg);background:${C.green};padding:${w * 0.02}px ${w * 0.03}px;border:${w * 0.008}px solid ${C.sun}`) +
      plate(p[3] ?? p[0], w * 0.34, `left:${w * 0.7}px;top:${h * 0.4}px`),
  },
  {
    name: '05-pick-from-three', bg: C.sun, ink: C.deep, accent: C.white, kicker: 'Swaps',
    title: ['Not feeling it?', 'Pick from three.'], sub: 'Each option shows its time and price. Only that meal changes.',
    body: (w, h) =>
      [0, 1, 2]
        .map((i) => card(b64(`swap-${i}`), w * 0.88, `left:${w * (0.04 + i * 0.02)}px;top:${h * (0.43 + i * 0.16)}px;transform:rotate(${[-2, 1.5, -1][i]}deg);background:${C.deep};padding:${w * 0.035}px ${w * 0.04}px`))
        .join(''),
  },
  {
    name: '06-cook-mode', bg: C.green, ink: C.white, accent: C.sun, kicker: 'Cooking mode',
    title: ['Every step', 'on one screen.'], sub: 'Big text, timers that keep running, and a screen that stays awake.',
    body: (w, h) =>
      phone(b64('cook'), w * 0.66, `position:absolute;left:${w * 0.3}px;top:${h * 0.4}px;transform:rotate(4deg)`) +
      card(b64('cook-current'), w * 0.74, `left:${w * 0.04}px;top:${h * 0.56}px;transform:rotate(-3deg)`),
  },
  {
    name: '07-leave-it-out', bg: C.sun, ink: C.deep, accent: C.white, kicker: 'Your food, your rules',
    title: ['Switch off', 'what you skip.'], sub: 'Dairy, gluten, nuts or anything else. Those recipes never show up.',
    body: (w, h, p) =>
      ['dairy', 'gluten', 'nuts']
        .map((e, i) => card(b64(`switch-${e}`), w * 0.84, `left:${w * 0.08}px;top:${h * (0.46 + i * 0.1)}px;background:${C.green};padding:${w * 0.02}px ${w * 0.05}px;transform:rotate(${[-1.5, 1, -0.5][i]}deg)`))
        .join('') +
      plate(p[4] ?? p[1], w * 0.52, `left:${w * 0.5}px;top:${h * 0.75}px`),
  },
];

const page_ = (s: Slide, w: number, h: number, plates: string[]) => `<!doctype html><html><head><style>${FONTS}
  *{box-sizing:border-box}
  body{margin:0;width:${w}px;height:${h}px;background:${s.bg};overflow:hidden;position:relative;color:${s.ink}}
  .head{position:absolute;left:${w * 0.075}px;right:${w * 0.075}px;top:${h * 0.06}px}
  .kicker{font:600 ${w * 0.036}px/1 S,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:${w * 0.03}px}
  h1{margin:0;font:800 ${w * 0.118}px/.92 D,sans-serif;text-transform:uppercase;letter-spacing:-${w * 0.002}px}
  h1 span{display:block;color:${s.accent}}
  p{margin:${w * 0.035}px 0 0;font:600 ${w * 0.043}px/1.3 S,sans-serif;max-width:${w * 0.8}px;opacity:.92}
  .phone{background:${C.ink};box-shadow:0 ${w * 0.04}px ${w * 0.09}px rgba(0,0,0,.35)}
  .scr{overflow:hidden;background:${C.green}}
  .status{display:flex;align-items:center;justify-content:space-between;color:#fff;font:600 1em S,sans-serif;background:${C.green};position:relative}
  .island{position:absolute;left:50%;top:22%;transform:translateX(-50%);background:#000;border-radius:999px}
  .glyphs{display:flex;gap:.35em;align-items:center}
  .bars{width:1.1em;height:.7em;background:linear-gradient(90deg,#fff 20%,transparent 20% 27%,#fff 27% 47%,transparent 47% 54%,#fff 54% 74%,transparent 74% 81%,#fff 81%);clip-path:polygon(0 100%,100% 0,100% 100%)}
  .batt{width:1.5em;height:.72em;border:.1em solid #fff;border-radius:.2em;background:linear-gradient(90deg,#fff 75%,transparent 75%);background-clip:content-box;padding:.08em}
  .card{position:absolute;display:block;box-shadow:0 ${w * 0.03}px ${w * 0.07}px rgba(0,0,0,.3)}
  .plate{position:absolute;filter:drop-shadow(0 ${w * 0.02}px ${w * 0.03}px rgba(0,0,0,.25))}
  .plate svg{width:100%;height:100%}
</style></head><body>
  ${s.body(w, h, plates)}
  <div class="head"><div class="kicker">${s.kicker}</div><h1>${s.title[0]}<span>${s.title[1]}</span></h1><p>${s.sub}</p></div>
</body></html>`;

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  let c = 0xffffffff;
  for (const b of body) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0, body.length + 4);
  return out;
};
/** An 8-bit RGB PNG from filtered scanlines. */
const rgbPng = (w: number, h: number, rows: Buffer) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

test('app store screenshots', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const plates = await captureAll(await ctx.newPage());
  await ctx.close();
  expect(plates.length).toBeGreaterThan(4);

  for (const [w, h, dir] of [[1320, 2868, '6.9'], [1284, 2778, '6.5']] as const) {
    mkdirSync(`${OUT}/${dir}`, { recursive: true });
    for (const s of SLIDES) {
      // Chromium sometimes returns a slide one row short, and App Store Connect rejects even a 1-pixel
      // difference, so each capture is redrawn onto a canvas of the exact size.
      const out = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await out.newPage();
      await p.setContent(page_(s, w, h, plates));
      const shot = (await p.screenshot()).toString('base64');
      const exact = await p.evaluate(
        async ({ src, w, h }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${src}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const g = c.getContext('2d')!;
          g.drawImage(img, 0, 0, w, h);
          const rgba = g.getImageData(0, 0, w, h).data;
          // PNG scanlines of RGB (filter byte 0 per row), without the alpha channel.
          const rows = new Uint8Array(h * (w * 3 + 1));
          for (let y = 0, o = 0; y < h; y++) {
            rows[o++] = 0;
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              rows[o++] = rgba[i]!;
              rows[o++] = rgba[i + 1]!;
              rows[o++] = rgba[i + 2]!;
            }
          }
          let bin = '';
          for (let i = 0; i < rows.length; i += 0x8000) bin += String.fromCharCode(...rows.subarray(i, i + 0x8000));
          return btoa(bin);
        },
        { src: shot, w, h },
      );
      const file = `${OUT}/${dir}/${s.name}.png`;
      // Opaque RGB: App Store Connect can refuse images with an alpha channel.
      writeFileSync(file, rgbPng(w, h, Buffer.from(exact, 'base64')));
      await out.close();
      const png = readFileSync(file);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], file).toEqual([w, h]);
    }
  }
});
