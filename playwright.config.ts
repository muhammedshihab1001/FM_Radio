import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const OUT = 'node_modules/.e2e-dist';

export default defineConfig({
  testDir: './tests/e2e',
  // Baselines are per OS (font rendering differs); CI keeps its own Linux set.
  snapshotPathTemplate: '{testDir}/../visual/{platform}/{arg}{-projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // More parallel browsers (plus axe scans) starve the mocked API on a dev laptop.
  workers: 2,
  // Reports and traces live under node_modules/.cache (already git-ignored).
  outputDir: 'node_modules/.cache/test-results',
  reporter: process.env.CI
    ? [['html', { open: 'never', outputFolder: 'node_modules/.cache/playwright-report' }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: 'node_modules/.cache/playwright-report' }]],
  timeout: 60_000,
  expect: {
    timeout: 7_000,
    // Same-machine renders are pixel-stable, so any real change (even one word) must fail.
    toHaveScreenshot: { maxDiffPixels: 20, threshold: 0.2, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The app's service worker would proxy API/stream fetches out of page.route's
    // reach; PWA behaviour has its own spec (pwa.spec.ts) that re-enables it.
    serviceWorkers: 'block',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // Playwright's WebKit on Windows/Linux starves for frames when several instances run at once
      // (measured: 3–4 frames in 2 s), so actionability checks time out. One WebKit at a time.
      workers: 1,
    },
  ],
  webServer: {
    // Production build + preview, with a fake API origin baked in (every request
    // to it is answered by Playwright route interception).
    command: `npm run build -- --outDir ${OUT} && npx vite preview --outDir ${OUT} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Always build and serve the current code. Reusing a server left running on this port would
    // silently test an old build (this happened once) — with --strictPort a leftover now fails loudly.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_API_BASE_URL: 'https://api.test',
      VITE_ADMIN_USER: 'e2e-admin',
      VITE_ADMIN_PASS: 'e2e-pass',
      VITE_ADMIN_KEY: 'e2e-key',
    },
  },
});
