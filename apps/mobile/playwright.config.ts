import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '../../qa-artifacts/tmp/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8081',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? undefined },
  },
  webServer: { command: 'node scripts/serve-web.mjs', url: 'http://127.0.0.1:8081', reuseExistingServer: true },
});
