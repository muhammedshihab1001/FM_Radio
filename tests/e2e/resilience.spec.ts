import { test, expect, cards, heading } from './support/fixtures';
import type { Page } from '@playwright/test';

const trackCrashes = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const expectNotBlank = async (page: Page) => {
  await expect(page.locator('#root > *')).not.toHaveCount(0);
  await expect(page.getByRole('banner')).toBeVisible();
  expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(0);
};

test.describe('resilience', () => {
  test.describe('API down', () => {
    test.use({ apiMode: 'down' });
    test('shows an error, keeps the chrome, never crashes', async ({ page }) => {
      const crashes = trackCrashes(page);
      await page.goto('/');
      await expect(page.getByRole('alert')).toContainText("Can't reach the station directory", { timeout: 15_000 });
      await expect(page.getByRole('alert').getByRole('button', { name: 'Try again' })).toBeVisible();
      await expectNotBlank(page);
      expect(crashes).toEqual([]);
    });
  });

  test.describe('API slow (3 s)', () => {
    test.use({ apiMode: 'slow' });
    test('shows skeletons first, then the stations', async ({ page }) => {
      const crashes = trackCrashes(page);
      await page.goto('/');
      await expect(page.getByRole('status', { name: 'Loading stations' })).toBeVisible({ timeout: 1500 });
      await expect(heading(page)).toHaveText('Estonia');
      await expect(cards(page)).toHaveCount(50, { timeout: 10_000 });
      await expect(page.getByRole('status', { name: 'Loading stations' })).toHaveCount(0);
      expect(crashes).toEqual([]);
    });
  });

  test.describe('API empty', () => {
    test.use({ apiMode: 'empty' });
    test('shows the empty state with a way forward', async ({ page }) => {
      const crashes = trackCrashes(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'No stations found' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Back to Estonia' })).toBeVisible();
      await expectNotBlank(page);
      expect(crashes).toEqual([]);
    });
  });

  test.describe('API malformed', () => {
    test.use({ apiMode: 'malformed' });
    test('reports bad data instead of crashing', async ({ page }) => {
      const crashes = trackCrashes(page);
      await page.goto('/');
      await expect(page.getByRole('alert')).toContainText("sent a response we couldn't read", { timeout: 15_000 });
      await expectNotBlank(page);
      expect(crashes).toEqual([]);
    });
  });
});
