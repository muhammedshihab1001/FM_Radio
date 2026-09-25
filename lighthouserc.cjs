// Lighthouse CI — mobile preset (Lighthouse's default: Moto G-class device, slow 4G, 4× CPU).
// The app is served by scripts/mock-server.mjs, so audits never touch the real API.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/mock-server.mjs --build --port 4180',
      startServerReadyPattern: 'listening',
      startServerReadyTimeout: 180000,
      url: ['http://localhost:4180/'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--headless=new --no-sandbox',
        // The page must not be blocked by the SW install on first load.
        disableStorageReset: false,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05, aggregationMethod: 'median-run' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median-run' }],
      },
    },
    upload: { target: 'filesystem', outputDir: 'node_modules/.cache/lighthouse' },
  },
};
