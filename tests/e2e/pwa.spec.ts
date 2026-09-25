import { test as base, expect, type Page, type Request } from '@playwright/test';
import {
  blockExternal,
  mockApi,
  mockStreams,
  playButton,
  playerLine,
  heading,
  API_ORIGIN,
  STREAM_ORIGIN,
} from './support/fixtures';

// Service workers are blocked in every other spec; here they run for real.
// Routes are installed on the context so they also answer the worker's own fetches.
const test = base.extend({});
test.use({ serviceWorkers: 'allow' });
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Context routing of service-worker traffic is Chromium-only in Playwright',
);

test.beforeEach(async ({ context }) => {
  await blockExternal(context);
  await mockApi(context);
  await mockStreams(context);
});

async function activeWorker(page: Page) {
  await page.goto('/');
  await expect(heading(page)).toHaveText('Estonia');
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated');
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { state: reg.active?.state, scope: reg.scope, url: reg.active?.scriptURL };
  });
}

test('manifest is valid and installable', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const m = (await res.json()) as Record<string, unknown> & {
    icons: { sizes: string; purpose?: string; src: string }[];
  };
  expect(m).toMatchObject({
    name: 'Nebula Cast FM',
    short_name: 'Nebula FM',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  });
  expect(m.theme_color).toBe('#06060B');
  expect(m.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});

test('service worker registers and activates', async ({ page }) => {
  const sw = await activeWorker(page);
  expect(sw.state).toBe('activated');
  expect(sw.url).toMatch(/\/sw\.js$/);
});

// PWA-1 (STANDARDS_REPORT): vite.config.js registers NetworkOnly routes for
// audio and API URLs, so the worker *does* intercept them (it re-fetches them
// itself). Nothing is cached, but streams still pass through the worker.
test.fail('the service worker never intercepts API or audio requests', async ({ page }) => {
  await activeWorker(page);
  await page.reload(); // the page is now controlled by the worker
  await expect(heading(page)).toHaveText('Estonia');
  const seen: Request[] = [];
  page.on('requestfinished', (r) => {
    if (r.url().startsWith(API_ORIGIN) || r.url().startsWith(STREAM_ORIGIN)) seen.push(r);
  });
  await playButton(page, 'Eesti Raadio 1').click();
  await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
  const viaWorker: string[] = [];
  for (const r of seen) {
    const res = await r.response();
    if (res?.fromServiceWorker()) viaWorker.push(r.url());
  }
  console.log(`PWA-1 evidence: ${viaWorker.length}/${seen.length} API/stream responses came from the service worker`);
  expect(viaWorker).toEqual([]);
});

test('nothing from the API or a stream ever lands in Cache Storage', async ({ page }) => {
  await activeWorker(page);
  await page.reload();
  await playButton(page, 'Eesti Raadio 1').click();
  await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0); // the app shell is precached
  expect(cached.filter((u) => /api\.test|radio\.test|\.mp3|\.m3u8?/.test(u))).toEqual([]);
});

test('offline: the app shell still loads from the precache', async ({ page, context }) => {
  await activeWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByText("You're offline — radio needs a connection")).toBeVisible();
  await context.setOffline(false);
});
