import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Reads the real design tokens from index.css, so a token change that breaks
// WCAG AA fails this test. (Vitest stubs CSS imports, so it's read from disk.)
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
const token = (name: string): RGB => {
  const m = css.match(new RegExp(`--c-${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!m) throw new Error(`token --c-${name} not found`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

type RGB = [number, number, number];
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  fg.map((v, i) => Math.round(v * alpha + bg[i]! * (1 - alpha))) as RGB;

const bg = {
  base: token('bg-base'),
  surface: token('bg-surface'),
  raised: token('bg-raised'),
  overlay: token('bg-overlay'),
};
const text = token('text');
const ink: RGB = [6, 6, 11]; // text-[#06060B] on accent fills
const tiers = { primary: 1, secondary: 0.64, tertiary: 0.5 };
const accents = {
  cyan: token('cyan'),
  magenta: token('magenta'),
  'magenta-ink': token('magenta-ink'),
  danger: token('danger'),
  warn: token('warn'),
};

const AA_TEXT = 4.5;
const AA_UI = 3; // non-text: icons, borders, focus ring

describe('WCAG AA contrast of the v4 tokens', () => {
  for (const [tier, alpha] of Object.entries(tiers)) {
    for (const [surface, colour] of Object.entries(bg)) {
      it(`${tier} text on ${surface} ≥ ${AA_TEXT}:1`, () => {
        expect(ratio(over(text, alpha, colour), colour)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  for (const [name, colour] of Object.entries(accents)) {
    for (const surface of ['base', 'surface', 'raised'] as const) {
      it(`${name} text on ${surface} ≥ ${AA_TEXT}:1`, () => {
        expect(ratio(colour, bg[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  it.each([
    ['ink on cyan (primary buttons)', ink, accents.cyan],
    ['ink on magenta (saved badge)', ink, accents.magenta],
    ['ink on warn', ink, accents.warn],
    ['cyan on cyan-dim (active Charts)', accents.cyan, over(accents.cyan, 0.15, bg.raised)],
    [
      'magenta-ink on magenta-dim (active Favorites, sweep)',
      accents['magenta-ink'],
      over(accents.magenta, 0.15, bg.raised),
    ],
    ['danger on danger/10 (error banner)', accents.danger, over(accents.danger, 0.1, bg.base)],
    ['warn on warn/10 (warning banner)', accents.warn, over(accents.warn, 0.1, bg.base)],
    ['secondary on raised meta tag', over(text, 0.64, bg.raised), bg.raised],
  ])('%s ≥ 4.5:1', (_l, fg, back) => {
    expect(ratio(fg, back)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('raw magenta text on magenta-dim fails AA — which is why magenta-ink exists', () => {
    expect(ratio(accents.magenta, over(accents.magenta, 0.15, bg.raised))).toBeLessThan(AA_TEXT);
  });

  it.each([
    ['focus ring (cyan) vs base', accents.cyan, bg.base],
    ['focus ring (cyan) vs raised', accents.cyan, bg.raised],
    ['favorite heart (magenta) on raised', accents.magenta, bg.raised],
    ['inactive tab icon (tertiary) on base', over(text, 0.5, bg.base), bg.base],
  ])('%s ≥ 3:1 (non-text)', (_l, fg, back) => {
    expect(ratio(fg, back)).toBeGreaterThanOrEqual(AA_UI);
  });

  it('disabled controls (opacity 40%) are exempt from 1.4.3 but stay distinguishable', () => {
    // WCAG 1.4.3 exempts inactive UI components; recorded so a regression is visible.
    const disabledSecondary = over(over(text, 0.64, bg.raised), 0.4, bg.base);
    expect(ratio(disabledSecondary, bg.base)).toBeGreaterThan(1.5);
  });
});
