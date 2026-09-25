import { test, expect, cards, nowPlaying, playButton, detailsButton, settle, VIEWPORTS } from './support/fixtures';
import type { Page } from '@playwright/test';

const MOBILE_MAX = 767; // below Tailwind's md breakpoint the bottom tab bar is the navigation

async function load(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await expect(cards(page)).toHaveCount(50, { timeout: 20_000 });
}

/** Every visible, enabled control that is inside the viewport. */
async function tapTargets(page: Page) {
  return page.evaluate(() => {
    const sel = 'button, a[href], [role="option"], input:not([type="hidden"]):not([type="range"]), select, textarea';
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== 'hidden' &&
          s.display !== 'none' &&
          Number(s.opacity) > 0.01 &&
          !el.closest('[aria-hidden="true"]') &&
          !(el as HTMLButtonElement).disabled &&
          r.bottom > 0 &&
          r.top < innerHeight &&
          r.right > 0 &&
          r.left < innerWidth
        );
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 30) ?? el.tagName,
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`layout @ ${vp.name}`, () => {
    test('no horizontal scroll anywhere', async ({ page }) => {
      await load(page, vp.width, vp.height);
      const scroll = () =>
        page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect((await scroll()).sw).toBeLessThanOrEqual((await scroll()).cw);

      await page.getByRole('button', { name: /^Estonia/, expanded: false }).click();
      const s2 = await scroll();
      expect(s2.sw).toBeLessThanOrEqual(s2.cw);
      await page.keyboard.press('Escape');

      await detailsButton(page, 'Eesti Raadio 1').click();
      const s3 = await scroll();
      expect(s3.sw).toBeLessThanOrEqual(s3.cw);
    });

    test('grid columns and no text overflow', async ({ page }) => {
      await load(page, vp.width, vp.height);
      const overflow = await page.evaluate(
        () =>
          [...document.querySelectorAll('article h3, article p')].filter((el) => {
            const r = el.getBoundingClientRect();
            const card = el.closest('article')!.getBoundingClientRect();
            return r.right > card.right + 0.5 || r.left < card.left - 0.5;
          }).length,
      );
      expect(overflow).toBe(0);
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('main .grid')!).gridTemplateColumns.split(' ').length,
      );
      const expected = vp.width >= 1536 ? 6 : vp.width >= 1280 ? 5 : vp.width >= 1024 ? 4 : vp.width >= 768 ? 3 : 2;
      expect(cols).toBe(expected);
    });

    if (vp.width > MOBILE_MAX) {
      test('desktop: mini player sits above the footer and never covers content', async ({ page }) => {
        await load(page, vp.width, vp.height);
        await playButton(page, 'Eesti Raadio 1').click();
        await expect(nowPlaying(page)).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForFunction(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1);
        await settle(page);
        const b = await page.evaluate(() => {
          const r = (el: Element | null | undefined) => el?.getBoundingClientRect();
          const player = r(document.querySelector('[aria-label="Now playing"]'))!;
          const footer = r(document.querySelector('footer'))!;
          const loadMore = r(
            [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Load more')),
          );
          const top = r(document.querySelector('[aria-label="Scroll to top"]'));
          return {
            playerTop: player.top,
            playerBottom: player.bottom,
            playerLeft: player.left,
            playerRight: player.right,
            footerTop: footer.top,
            loadMoreBottom: loadMore?.bottom ?? 0,
            top,
          };
        });
        expect(b.playerBottom).toBeLessThanOrEqual(b.footerTop);
        expect(b.loadMoreBottom).toBeLessThanOrEqual(b.playerTop);
        if (b.top) {
          const overlapsX = b.top.left < b.playerRight && b.top.right > b.playerLeft;
          const overlapsY = b.top.top < b.playerBottom && b.top.bottom > b.playerTop;
          expect(overlapsX && overlapsY).toBe(false);
        }
      });
    }

    if (vp.width <= MOBILE_MAX) {
      test('text fields use 16px+ text, so iPhone Safari never zooms the page when one is tapped', async ({ page }) => {
        await load(page, vp.width, vp.height);
        await page.getByRole('button', { name: /^Estonia/, expanded: false }).click(); // renders the filter field
        const small = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('input:not([type="range"]), textarea, select')]
            .map((el) => ({
              field: el.id || el.getAttribute('aria-label') || el.tagName,
              px: parseFloat(getComputedStyle(el).fontSize),
            }))
            .filter((f) => f.px < 16),
        );
        expect(small, JSON.stringify(small)).toEqual([]);
      });

      test('bottom tab bar + mini player never cover content; bottom padding is enough', async ({ page }) => {
        await load(page, vp.width, vp.height);
        await playButton(page, 'Eesti Raadio 1').click();
        await expect(nowPlaying(page)).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForFunction(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1);
        // Measure at rest: on a loaded machine the mini player's slide-up entrance can still be running.
        await settle(page);

        const boxes = await page.evaluate(() => {
          const top = (el: Element | null) => el?.getBoundingClientRect().top ?? Infinity;
          const player = document.querySelector('[aria-label="Now playing"]');
          const nav = document.querySelector('nav[aria-label="Main"]');
          const loadMore = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Load more'));
          const lastCard = [...document.querySelectorAll('article')].at(-1);
          return {
            playerTop: top(player),
            navTop: top(nav),
            playerBottom: player?.getBoundingClientRect().bottom ?? 0,
            loadMoreBottom: loadMore?.getBoundingClientRect().bottom ?? 0,
            lastCardBottom: lastCard?.getBoundingClientRect().bottom ?? 0,
          };
        });
        expect(boxes.playerBottom).toBeLessThanOrEqual(boxes.navTop + 0.5); // player sits above the tab bar
        expect(boxes.loadMoreBottom).toBeLessThanOrEqual(boxes.playerTop);
        expect(boxes.lastCardBottom).toBeLessThanOrEqual(boxes.playerTop);
      });

      test('every tap target is at least 44×44 px', async ({ page }) => {
        await load(page, vp.width, vp.height);
        await playButton(page, 'Eesti Raadio 1').click();
        await expect(nowPlaying(page)).toBeVisible();
        // measure at rest: a just-tapped card is scaled to 98% while :active
        await page.mouse.move(0, 0);
        await settle(page);
        const small = (await tapTargets(page)).filter((t) => t.w < 44 || t.h < 44);
        expect(small, JSON.stringify(small)).toEqual([]);

        await page.getByRole('button', { name: /^Estonia/, expanded: false }).click();
        const smallInList = (await tapTargets(page)).filter((t) => t.w < 44 || t.h < 44);
        expect(smallInList, JSON.stringify(smallInList)).toEqual([]);
        await page.keyboard.press('Escape');

        await detailsButton(page, 'Eesti Raadio 2').click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await settle(page);
        const smallInModal = (await tapTargets(page)).filter((t) => t.w < 44 || t.h < 44);
        expect(smallInModal, JSON.stringify(smallInModal)).toEqual([]);
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await page.keyboard.type('eesti');
        const smallInSearch = (await tapTargets(page)).filter((t) => t.w < 44 || t.h < 44);
        expect(smallInSearch, JSON.stringify(smallInSearch)).toEqual([]);
      });

      test('exactly one navigation bar', async ({ page }) => {
        await load(page, vp.width, vp.height);
        await expect(page.getByRole('navigation')).toHaveCount(1);
        await expect(page.getByRole('banner').getByRole('button', { name: 'Top charts' })).toBeHidden();
      });
    }
  });
}
