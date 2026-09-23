/** Tool (not a test): renders app icon assets from the illustration system. Run with ICONS=1. */
import { test } from '@playwright/test';

const OUT = 'assets';
const jobs: Array<[string, string, number, boolean]> = [
  ['icon.png', 'icon', 1024, false],
  ['android-icon-foreground.png', 'foreground', 1024, true],
  ['android-icon-monochrome.png', 'foreground', 1024, true],
  ['splash-icon.png', 'splash', 1024, true],
  ['favicon.png', 'icon', 48, false],
];

test.skip(process.env.ICONS !== '1', 'asset generation tool');
for (const [file, variant, size, transparent] of jobs) {
  test(`render ${file}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.goto(`/review/icon?review=1&variant=${variant}&size=${size}`);
    await page.getByTestId('icon-art').waitFor();
    // Transparent assets: clear every page/background layer (SVG fills are unaffected).
    if (transparent) await page.addStyleTag({ content: 'html, body, #root, div { background: transparent !important; background-color: transparent !important; }' });
    await page.waitForTimeout(300);
    await page.getByTestId('icon-art').screenshot({ path: `${OUT}/${file}`, omitBackground: transparent });
    await page.close();
  });
}
