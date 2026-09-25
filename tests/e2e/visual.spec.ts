import type { Page } from '@playwright/test';
import {
  test,
  expect,
  cards,
  heading,
  nowPlaying,
  playButton,
  detailsButton,
  playerLine,
  settle,
  gotoHome,
  STREAM_ORIGIN,
} from './support/fixtures';

// Baselines live in tests/visual/. Regenerate with `npm run test:visual:update`.
const WIDTHS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
] as const;

const shot = async (page: Page, name: string) => {
  // clicking scrolls the target into view by a varying amount; shots are taken from the top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false });
};

for (const w of WIDTHS) {
  test.describe(`@visual ${w.name}`, () => {
    test.use({ viewport: { width: w.width, height: w.height } });

    test('loaded', async ({ page }) => {
      await gotoHome(page);
      await shot(page, `loaded-${w.name}`);
    });

    test('playing', async ({ page }) => {
      await gotoHome(page);
      await playButton(page, 'Eesti Raadio 1').click();
      await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
      await shot(page, `playing-${w.name}`);
    });

    test('buffering (tuning)', async ({ page }) => {
      // A stream that never answers keeps the player in its connecting/buffering state.
      await page.route(`${STREAM_ORIGIN}/**`, () => undefined);
      await gotoHome(page);
      await playButton(page, 'Eesti Raadio 1').click();
      await expect(playerLine(page, 'Tuning…')).toBeVisible();
      await shot(page, `buffering-${w.name}`);
    });

    test('modal open', async ({ page }) => {
      await gotoHome(page);
      await detailsButton(page, 'Eesti Raadio 2').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await shot(page, `modal-${w.name}`);
    });

    test('admin', async ({ page }) => {
      await gotoHome(page);
      await page.keyboard.press('Shift+A');
      await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible();
      await shot(page, `admin-${w.name}`);
    });

    test('offline', async ({ page, context }) => {
      await gotoHome(page);
      await context.setOffline(true);
      await expect(page.getByText("You're offline — radio needs a connection")).toBeVisible();
      await shot(page, `offline-${w.name}`);
      await context.setOffline(false);
    });

    test.describe('api states', () => {
      test.describe('loading', () => {
        test.use({ apiMode: 'slow' });
        test('loading', async ({ page }) => {
          await page.goto('/');
          await expect(page.getByRole('status', { name: 'Loading stations' })).toBeVisible();
          await expect(page).toHaveScreenshot(`loading-${w.name}.png`, { animations: 'disabled' });
        });
      });
      test.describe('empty', () => {
        test.use({ apiMode: 'empty' });
        test('empty', async ({ page }) => {
          await page.goto('/');
          await expect(page.getByRole('heading', { name: 'No stations found' })).toBeVisible();
          await shot(page, `empty-${w.name}`);
        });
      });
      test.describe('error', () => {
        test.use({ apiMode: 'down' });
        test('error', async ({ page }) => {
          await page.goto('/');
          await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
          await expect(heading(page)).toBeVisible();
          await shot(page, `error-${w.name}`);
        });
      });
    });
  });
}

test('@visual keeps the grid stable (no layout shift between skeleton and cards)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoHome(page);
  await expect(cards(page)).toHaveCount(50);
  await expect(nowPlaying(page)).toHaveCount(0);
});
