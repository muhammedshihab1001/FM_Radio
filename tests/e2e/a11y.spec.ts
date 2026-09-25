import AxeBuilder from '@axe-core/playwright';
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
  gotoHome,
  settle,
  NO_WEBKIT_AUDIO,
  webkitWithoutAudio,
} from './support/fixtures';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function audit(page: Page, label: string) {
  await settle(page);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  for (const v of violations.filter((x) => x.impact === 'minor' || x.impact === 'moderate')) {
    test.info().annotations.push({ type: `axe-${v.impact}`, description: `${label}: ${v.id} (${v.nodes.length})` });
  }
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = blocking.map(
    (v) =>
      `${v.impact} ${v.id}: ${v.help} → ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  );
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
  return violations;
}

const SIZES = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const size of SIZES) {
  test.describe(`axe @a11y ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('home, playing, country list, modal', async ({ page, browserName }) => {
      await gotoHome(page);
      await audit(page, 'home');

      // Same policy as every WebKit playback test: audio-less WebKit can't reach "playing" and instead
      // loops through recovery with spinners running, which (under load) starves its frames until
      // actionability checks time out. The playing state is audited on Chromium and Firefox.
      const canPlay = !webkitWithoutAudio(browserName);
      if (canPlay) {
        await playButton(page, 'Eesti Raadio 1').click();
        await expect(nowPlaying(page)).toBeVisible();
      } else {
        test.info().annotations.push({ type: 'partial', description: `playing state skipped: ${NO_WEBKIT_AUDIO}` });
      }
      // a saved station makes the favorites count/badge render, so it is audited too
      await cards(page).nth(2).getByRole('button', { name: 'Add to favorites' }).click();
      await audit(page, canPlay ? 'playing + one favorite' : 'one favorite');

      await page.getByRole('button', { name: /^Estonia/, expanded: false }).click();
      await expect(page.getByRole('listbox')).toBeVisible();
      await audit(page, 'country list open');
      await page.keyboard.press('Escape');

      await detailsButton(page, 'Eesti Raadio 2').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await audit(page, 'station modal');
    });

    test('country, search, shuffle, trending, favorites', async ({ page }) => {
      await gotoHome(page);
      await page.getByRole('button', { name: /^Estonia/, expanded: false }).click();
      await page.getByRole('option', { name: /Germany/ }).click();
      await expect(heading(page)).toHaveText('Germany');
      await audit(page, 'country');

      await page.keyboard.press('/');
      await page.keyboard.type('eesti');
      await page.keyboard.press('Enter');
      await expect(heading(page)).toHaveText('Results for "eesti"');
      await audit(page, 'search results');

      await page.getByRole('button', { name: 'Shuffle to a random country' }).first().click();
      await expect(heading(page)).not.toHaveText('Results for "eesti"');
      await audit(page, 'shuffle');

      await page
        .getByRole('button', { name: /^(Top charts|Charts)$/ })
        .first()
        .click();
      await expect(heading(page)).toHaveText('Global Top Charts');
      await audit(page, 'trending');

      await page
        .getByRole('button', { name: /^(Favorites|Saved stations)/ })
        .first()
        .click();
      await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
      await audit(page, 'favorites empty');
    });

    test('admin login + dashboard', async ({ page }) => {
      await gotoHome(page);
      await page.keyboard.press('Shift+A');
      await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible();
      await audit(page, 'admin login');
      await page.getByLabel('Admin ID').fill('e2e-admin');
      await page.getByLabel('Password').fill('e2e-pass');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('3,800')).toBeVisible();
      await audit(page, 'admin dashboard');
    });

    test('offline banner', async ({ page, context }) => {
      await gotoHome(page);
      await context.setOffline(true);
      await expect(page.getByText("You're offline — radio needs a connection")).toBeVisible();
      await audit(page, 'offline');
      await context.setOffline(false);
    });
  });
}

test.describe('axe @a11y states', () => {
  test.describe('error', () => {
    test.use({ apiMode: 'down' });
    test('API down', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
      await audit(page, 'error');
    });
  });
  test.describe('empty', () => {
    test.use({ apiMode: 'empty' });
    test('no stations', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'No stations found' })).toBeVisible();
      await audit(page, 'empty');
    });
  });
  test.describe('loading', () => {
    test.use({ apiMode: 'slow' });
    test('skeletons', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('status', { name: 'Loading stations' })).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    });
  });
});

test.describe('keyboard-only journey @a11y', () => {
  test('browse → play → favorite → modal → close with a visible focus ring at every step', async ({
    page,
    browserName,
  }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);

    const expectRing = async () => {
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        return {
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          color: s.outlineColor,
          visible: el.matches(':focus-visible'),
        };
      });
      expect(outline, 'something is focused').not.toBeNull();
      expect(outline!.visible).toBe(true);
      expect(outline!.style).not.toBe('none');
      expect(outline!.width).toBeGreaterThanOrEqual(2);
    };
    const tabTo = async (predicate: (el: { label: string; text: string }) => boolean, max = 80) => {
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        const el = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement;
          return { label: a.getAttribute('aria-label') ?? '', text: a.textContent?.trim() ?? '' };
        });
        if (predicate(el)) return;
      }
      throw new Error('target never reached by Tab');
    };

    await tabTo((e) => e.label === 'Play Eesti Raadio 1');
    await expectRing();
    await page.keyboard.press('Enter');
    await expect(playerLine(page, 'On air')).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('Tab'); // → favorite on the same card
    await expectRing();
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Add to favorites');
    await page.keyboard.press('Space');
    await expect(cards(page).first().getByRole('button', { name: 'Remove from favorites' })).toBeVisible();
    await expect(playerLine(page, 'On air')).toBeVisible(); // Space on a button did not pause the radio

    await tabTo((e) => e.label === 'Details for Eesti Raadio 1');
    await expectRing();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Eesti Raadio 1', exact: true })).toBeVisible();
    await expectRing();
    await page.keyboard.press('Tab');
    await expectRing();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectRing();
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(
      'Details for Eesti Raadio 1',
    );
  });
});

test.describe('screen-reader semantics @a11y', () => {
  test('icon buttons are named, status is announced, slider and dialog are well-formed', async ({
    page,
    browserName,
  }) => {
    test.skip(webkitWithoutAudio(browserName), NO_WEBKIT_AUDIO);
    await gotoHome(page);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => !b.getAttribute('aria-label') && !b.textContent?.trim() && !b.getAttribute('aria-labelledby'))
        .map((b) => b.outerHTML.slice(0, 80)),
    );
    expect(unnamed).toEqual([]);

    await playButton(page, 'Eesti Raadio 1').click();
    const live = nowPlaying(page).getByRole('status');
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveText('On air: Eesti Raadio 1', { timeout: 15_000 });

    const slider = page.getByRole('slider', { name: 'Volume' }).first();
    await expect(slider).toHaveAttribute('aria-valuetext', /%$/);

    await detailsButton(page, 'Eesti Raadio 1').click();
    const dialog = page.getByRole('dialog', { name: 'Eesti Raadio 1', exact: true });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

test.describe('reduced motion @a11y', () => {
  test.use({ reducedMotion: 'reduce' });
  test('nothing moves: animations and transitions collapse to ~1 ms, except opacity-only fades', async ({ page }) => {
    await gotoHome(page);
    const { long, moving } = await page.evaluate(() => {
      const ms = (v: string) => Math.max(...v.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 1 : 1000)));
      // Keyframes that change anything other than opacity count as motion.
      const keyframes = new Map<string, string[]>();
      for (const sheet of [...document.styleSheets]) {
        for (const rule of [...sheet.cssRules]) {
          if (rule instanceof CSSKeyframesRule) {
            const props = [...rule.cssRules].flatMap((f) => [...(f as CSSKeyframeRule).style]);
            keyframes.set(rule.name, props);
          }
        }
      }
      // The Buy Me a Coffee reel keeps gliding on every device by the owner's choice: a small,
      // contained motion inside its own 44 px button. Nothing else may move.
      const ALLOWED = ['coffee-reel'];
      const isFadeOnly = (names: string) =>
        names
          .split(',')
          .every((n) => ALLOWED.includes(n.trim()) || (keyframes.get(n.trim()) ?? ['?']).every((p) => p === 'opacity'));
      const all = [...document.querySelectorAll<HTMLElement>('*')].map((el) => {
        const s = getComputedStyle(el);
        return {
          el: el.className.toString().slice(0, 40),
          name: s.animationName,
          anim: ms(s.animationDuration),
          trans: ms(s.transitionDuration),
        };
      });
      return {
        long: all.filter((x) => x.trans > 10 || (x.anim > 10 && !isFadeOnly(x.name))),
        moving: [...keyframes].filter(([, props]) => props.some((p) => p !== 'opacity')).map(([n]) => n),
      };
    });
    expect(long, JSON.stringify(long)).toEqual([]);
    // sanity: the check really distinguishes motion (e.g. the sliding reel) from fades
    expect(moving).toContain('coffee-reel');
  });
});
