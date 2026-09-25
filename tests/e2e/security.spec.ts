import { readFileSync } from 'node:fs';
import {
  test,
  expect,
  gotoHome,
  playButton,
  playerLine,
  detailsButton,
  webkitWithoutAudio,
  NO_WEBKIT_AUDIO,
} from './support/fixtures';

// The CSP ships as Report-Only first. This test *enforces* the exact policy
// from vercel.json and proves the app works under it with zero violations.
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const all = vercel.headers.find((h) => h.source === '/(.*)')!.headers;
const csp = all.find((h) => h.key === 'Content-Security-Policy-Report-Only')!.value;

test.describe('security', () => {
  test('vercel.json sends HSTS, Permissions-Policy and a report-only CSP', () => {
    const keys = all.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'Strict-Transport-Security',
        'Permissions-Policy',
        'Content-Security-Policy-Report-Only',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
      ]),
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/media-src [^;]*https:/);
    expect(vercel.headers.some((h) => h.source === '/sw.js')).toBe(true);
  });

  test('the app runs with the CSP enforced: browse, play MP3 + HLS, open modal — zero violations', async ({
    page,
    browserName,
  }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.fallback();
      const res = await route.fetch();
      return route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
    });
    await page.addInitScript(() => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
      );
    });

    await gotoHome(page);
    await playButton(page, 'Eesti Raadio 1').click();
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
    await playButton(page, 'HLS Test Stream').click();
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 20_000 });
    await detailsButton(page, 'Eesti Raadio 2').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const violations = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    expect(violations).toEqual([]);
  });

  test('station names from the API are rendered as text, never as HTML', async ({ page }) => {
    await page.route('https://api.test/stations?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            stations: [
              {
                id: 1,
                name: '<img src=x onerror="window.__xss=1">',
                url: 'https://streams.radio.test/x.mp3',
                country: 'Estonia',
              },
            ],
            next_cursor: null,
          },
        }),
      }),
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: '<img src=x onerror="window.__xss=1">' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await page.locator('article img').count()).toBe(0);
  });
});
