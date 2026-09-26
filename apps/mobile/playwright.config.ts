import { defineConfig } from '@playwright/test';

const launchOptions = { executablePath: process.env.PW_CHROMIUM ?? undefined };
const device = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, launchOptions };

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: '../../qa-artifacts/tmp/playwright-report', open: 'never' }]],
  projects: [
    // The pilot build: everything on-device.
    // Tests are independent (fresh browser context each), so CI shards split them by test, not by file.
    { name: 'local', testIgnore: /remote\.spec\.ts/u, fullyParallel: true, use: { ...device, baseURL: 'http://127.0.0.1:8081' } },
    // A build connected to the API (EXPO_PUBLIC_API_URL), against a real API process.
    { name: 'remote', testMatch: /remote\.spec\.ts/u, use: { ...device, baseURL: 'http://127.0.0.1:8082' } },
  ],
  webServer: [
    { command: 'node scripts/serve-web.mjs', url: 'http://127.0.0.1:8081', reuseExistingServer: true },
    { command: 'node scripts/serve-web.mjs', url: 'http://127.0.0.1:8082', reuseExistingServer: true, env: { DIST: 'dist-remote', PORT: '8082' } },
    {
      command: 'npx tsx src/server.ts',
      cwd: '../api',
      url: 'http://127.0.0.1:8799/v1/health',
      reuseExistingServer: false,
      env: { PORT: '8799', ALLOW_DEV_CODES: '1', CORS_ORIGINS: 'http://127.0.0.1:8082', DATABASE_PATH: ':memory:', PRICE_SOURCE: 'sample', STORE_MODE: 'mock' },
    },
  ],
});
