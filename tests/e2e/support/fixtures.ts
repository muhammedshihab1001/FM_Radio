import { test as base, expect, type BrowserContext, type Page, type Route } from '@playwright/test';

/** A page or a whole context — context routes also see service-worker requests (Chromium). */
type Router = Page | BrowserContext;
import { COUNTRY_LIST, ESTONIA, STATIONS, STATS, makeStation, envelope } from '../../fixtures/stations';
import type { Station } from '../../../src/types/terminal';
import { hlsPlaylist, silentMp3 } from './audio';

export const API_ORIGIN = 'https://api.test';
export const STREAM_ORIGIN = 'https://streams.radio.test';

/** Station URLs with special behaviour in the stream router below. */
export const FIXTURE_STREAMS = {
  hls: `${STREAM_ORIGIN}/hls/index.m3u8`,
  broken: `${STREAM_ORIGIN}/broken/offline.mp3`,
  // http-only station: the app upgrades it to https, which this origin refuses.
  insecure: 'http://insecure.radio.test/live.mp3',
} as const;

const special: Station[] = [
  makeStation(900, { name: 'HLS Test Stream', country: 'Estonia', url: FIXTURE_STREAMS.hls, codec: 'MP3' }),
  makeStation(901, { name: 'Broken Test Stream', country: 'Estonia', url: FIXTURE_STREAMS.broken }),
  makeStation(902, { name: 'Insecure Test Stream', country: 'Estonia', url: FIXTURE_STREAMS.insecure }),
];

/** Estonia gets 60 stations (the 30 base + 27 fixtures + 3 special) so paging kicks in at 50. */
export const E2E_ESTONIA: Station[] = [
  ...special,
  ...ESTONIA,
  ...STATIONS.slice(0, 27).map((s, i) => ({ ...s, id: 3000 + i, country: 'Estonia' })),
];

export type ApiMode = 'ok' | 'down' | 'slow' | 'empty' | 'malformed';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

function pageOf(list: Station[], url: URL) {
  const cursor = Number(url.searchParams.get('last_id') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const ordered = [...list].sort((a, b) => Number(a.id) - Number(b.id));
  const rest = ordered.filter((s) => Number(s.id) > cursor);
  const stations = rest.slice(0, limit);
  const last = stations.at(-1);
  return { stations, next_cursor: rest.length > limit && last ? Number(last.id) : null };
}

const listFor = (country: string | null) =>
  country === 'Estonia' ? E2E_ESTONIA : STATIONS.filter((s) => !country || s.country === country);

export async function mockApi(page: Router, mode: ApiMode = 'ok') {
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (mode === 'down') return route.abort('connectionrefused');
    if (mode === 'slow') await new Promise((r) => setTimeout(r, 3000));
    if (mode === 'malformed') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"success":true,"data":{"stations":[{"id":1,"na',
      });
    }
    const empty = mode === 'empty';
    switch (url.pathname) {
      case '/stations':
        return json(
          route,
          envelope(empty ? { stations: [], next_cursor: null } : pageOf(listFor(url.searchParams.get('country')), url)),
        );
      case '/stations/search': {
        const q = (url.searchParams.get('q') ?? '').toLowerCase();
        return json(
          route,
          envelope(
            empty ? [] : [...E2E_ESTONIA, ...STATIONS].filter((s) => s.name.toLowerCase().includes(q)).slice(0, 50),
          ),
        );
      }
      case '/stations/random':
        return json(route, envelope(empty ? [] : STATIONS.slice(20, 44)));
      case '/stations/trending':
        return json(route, envelope(empty ? [] : STATIONS.slice(0, 12)));
      case '/countries':
        return json(route, envelope(empty ? [] : COUNTRY_LIST));
      case '/stats':
        return json(route, envelope(STATS));
      case '/stations/click':
        return json(route, { success: true });
      case '/admin/d1/status':
        return json(
          route,
          envelope({ reads_today: 1200, limit: 5000, remaining: 3800, percentage: '24.0', can_query: true }),
        );
      default:
        return json(route, { success: false, error: 'Not found' }, 404);
    }
  });
}

const mp3 = silentMp3(90);
const segment = silentMp3(4);

/** Local stream server: every station URL is answered from memory; nothing reaches a real stream. */
export async function mockStreams(page: Router) {
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(`${STREAM_ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname.startsWith('/broken/')) return route.abort('connectionrefused');
    if (pathname.endsWith('.m3u8')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        headers: cors,
        body: hlsPlaylist(),
      });
    }
    const body = pathname.startsWith('/hls/') ? segment : mp3;
    return route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      headers: { ...cors, 'accept-ranges': 'none' },
      body,
    });
  });
  await page.route(/^https?:\/\/insecure\.radio\.test\//, (route) => route.abort('connectionrefused'));
}

/** Everything else off-box (Google Fonts, stray hosts) is blocked so tests never touch the internet. */
export async function blockExternal(page: Router) {
  await page.route(
    /^https?:\/\/(?!localhost|127\.0\.0\.1|api\.test|streams\.radio\.test|insecure\.radio\.test)/,
    (route) =>
      route.request().url().includes('fonts.googleapis.com')
        ? route.fulfill({ status: 200, contentType: 'text/css', body: '' })
        : route.abort('blockedbyclient'),
  );
}

type Fixtures = { apiMode: ApiMode; mocked: void };

export const test = base.extend<Fixtures>({
  apiMode: ['ok', { option: true }],
  mocked: [
    async ({ page, apiMode }, use) => {
      // Seeded Math.random so Shuffle / the discovery mix are identical on every run.
      await page.addInitScript(() => {
        let seed = 20260925;
        Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      });
      await blockExternal(page);
      await mockApi(page, apiMode);
      await mockStreams(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export const cards = (page: Page) => page.getByRole('article');
export const heading = (page: Page) => page.getByRole('heading', { level: 1 });
export const nowPlaying = (page: Page) => page.getByRole('region', { name: 'Now playing' });

export const card = (page: Page, name: string) => page.getByRole('article', { name, exact: true });
export const playButton = (page: Page, name: string) => page.getByRole('button', { name: `Play ${name}`, exact: true });
export const detailsButton = (page: Page, name: string) =>
  page.getByRole('button', { name: `Details for ${name}`, exact: true });
/** The visible status line in the mini player, e.g. "On air · Estonia" (the sr-only live region is separate). */
export const playerLine = (page: Page, status: string) => nowPlaying(page).getByText(new RegExp(`^${status} ·`));

/** Waits until no CSS animation/transition is running (entrance animations scale elements). */
export const settle = (page: Page) =>
  page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );

/** Playwright's WebKit builds for Windows/Linux can't decode or clock audio; real Safari is covered on macOS. */
export const NO_WEBKIT_AUDIO =
  'Playwright WebKit on Windows/Linux has no working audio pipeline (MP3/MSE/HLS); run on macOS for Safari playback';
export const webkitWithoutAudio = (browserName: string) => browserName === 'webkit' && process.platform !== 'darwin';

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(heading(page)).toHaveText('Estonia');
  await expect(cards(page)).toHaveCount(50, { timeout: 20_000 });
}

export const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: 'landscape-844x390', width: 844, height: 390 },
] as const;
