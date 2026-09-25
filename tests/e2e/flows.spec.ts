import {
  test,
  expect,
  cards,
  card,
  heading,
  nowPlaying,
  playButton,
  detailsButton,
  playerLine,
  gotoHome,
  E2E_ESTONIA,
  NO_WEBKIT_AUDIO,
  webkitWithoutAudio,
} from './support/fixtures';

test.describe('core flows', () => {
  test('first load shows Estonia, 50 stations and a Load more button', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByText('48 stations')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more stations' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('872,268 stations');
  });

  test('infinite scroll: Load more appends the next page, then stops', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Load more stations' }).click();
    await expect(cards(page)).toHaveCount(E2E_ESTONIA.length);
    await expect(page.getByRole('button', { name: 'Load more stations' })).toHaveCount(0);
  });

  test('browse a country from the filter', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: /^Estonia/, expanded: false }).click();
    await page.getByRole('combobox').fill('germ');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Germany');
    await expect(cards(page).first()).toContainText('Germany');
  });

  test('search', async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press('/');
    await page.keyboard.type('eesti');
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Results for "eesti"');
    await expect(cards(page)).toHaveCount(30);
  });

  test('Shuffle lands on a country and syncs the filter', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Shuffle to a random country' }).first().click();
    await expect(heading(page)).not.toHaveText('Estonia');
    const country = (await heading(page).textContent())!;
    await expect(page.getByRole('button', { name: new RegExp(`^${country}`), expanded: false })).toBeVisible();
    // One shuffle control per screen: the section heading carries no button of its own
    // (it used to show "Shuffle again", labelled "2s" during the cooldown).
    const headingBlock = heading(page).locator('xpath=ancestor::div[contains(@class,"card-enter")][1]');
    await expect(headingBlock).toBeVisible();
    await expect(headingBlock.getByRole('button')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Shuffle to a random country' }).filter({ visible: true }),
    ).toHaveCount(1);
  });

  test('trending (Charts)', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('button', { name: 'Top charts' }).click();
    await expect(heading(page)).toHaveText('Global Top Charts');
    await expect(cards(page)).toHaveCount(12);
  });

  test('favorites persist across a reload', async ({ page }) => {
    await gotoHome(page);
    const target = E2E_ESTONIA.find((s) => s.name === 'Eesti Raadio 3')!;
    await card(page, target.name).getByRole('button', { name: 'Add to favorites' }).click();
    await page.getByRole('button', { name: /^Favorites, 1 saved/ }).click();
    await expect(heading(page)).toHaveText('Your stations');
    await expect(cards(page)).toHaveCount(1);

    await page.reload();
    await expect(heading(page)).toHaveText('Estonia');
    await page.getByRole('button', { name: /^Favorites, 1 saved/ }).click();
    await expect(card(page, target.name)).toBeVisible();
  });

  test('play → On air → pause → Ready', async ({ page, browserName }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);
    const name = 'Eesti Raadio 1';
    await playButton(page, name).click();
    const player = nowPlaying(page);
    await expect(player).toContainText(name);
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
    await expect(card(page, name).getByText('Live')).toBeVisible();

    await player.getByRole('button', { name: `Pause ${name}` }).click();
    await expect(playerLine(page, 'Ready')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });
  });

  test('a failed stream ends in the error UI; "Try again" retries', async ({ page, browserName }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);
    await playButton(page, 'Broken Test Stream').click();
    const player = nowPlaying(page);
    await expect(playerLine(page, 'Station offline')).toBeVisible({ timeout: 15_000 });
    await expect(card(page, 'Broken Test Stream').getByText('Station offline')).toBeVisible();

    const retry = player.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible();
    const attempt = page.waitForRequest((r) => r.url().includes('/broken/'));
    await retry.click();
    await attempt;
    await expect(playerLine(page, 'Station offline')).toBeVisible({ timeout: 15_000 });
  });

  test('an http:// station is upgraded to https:// (and fails cleanly if the host has no TLS)', async ({
    page,
    browserName,
  }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);
    const req = page.waitForRequest((r) => r.url().startsWith('https://insecure.radio.test/'));
    await playButton(page, 'Insecure Test Stream').click();
    await req;
    await expect(playerLine(page, 'Station offline')).toBeVisible({ timeout: 15_000 });
  });

  test('HLS station plays', async ({ page, browserName }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);
    await playButton(page, 'HLS Test Stream').click();
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 20_000 });
  });

  test('station modal opens and closes (Esc, backdrop, Close)', async ({ page }) => {
    await gotoHome(page);
    const details = detailsButton(page, 'Eesti Raadio 2');
    // Keyboard open: Safari-family engines don't focus buttons on mouse click,
    // so focus return is asserted on the keyboard path every engine shares.
    await details.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Eesti Raadio 2', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(details).toBeFocused();

    await details.click();
    await page.getByTestId('modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(dialog).toHaveCount(0);

    await details.click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('admin opens with Shift+A and signs in', async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press('Shift+A');
    await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible();
    await page.getByLabel('Admin ID').fill('e2e-admin');
    await page.getByLabel('Password').fill('e2e-pass');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Broadcast control' })).toBeVisible();
    await expect(page.getByText('3,800')).toBeVisible();
  });

  test('scroll-to-top appears after scrolling and returns to the top', async ({ page }) => {
    await gotoHome(page);
    const toTop = page.getByRole('button', { name: 'Scroll to top' });
    await expect(toTop).toHaveCount(0);
    await page.mouse.wheel(0, 1500);
    await expect(toTop).toBeVisible();
    await toTop.click();
    await page.waitForFunction(() => window.scrollY === 0);
    await expect(toTop).toHaveCount(0);
  });

  test('offline mode shows a banner and recovers', async ({ page, context }) => {
    await gotoHome(page);
    await context.setOffline(true);
    await expect(page.getByText("You're offline — radio needs a connection")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText("You're offline — radio needs a connection")).toHaveCount(0);
  });
});
