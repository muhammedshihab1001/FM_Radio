/**
 * Generated station artwork — a pure presentational helper, no state, no API.
 *
 * Each station gets a deterministic gradient + monogram derived from a hash
 * of its name, so the grid feels like album art instead of identical tiles.
 * Hues are restricted to a 140° arc that runs cyan → blue → violet → magenta,
 * i.e. directly between the two brand accents, so every generated card sits
 * inside the same premium palette instead of drifting into yellow/green/orange.
 */

function hashString(str: string): number {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const HUE_MIN = 186; // cyan
const HUE_MAX = 324; // magenta
const HUE_SPAN = HUE_MAX - HUE_MIN;

export interface StationArt {
  hue: number;
  /** CSS gradient for the artwork tile background. */
  gradient: string;
  /** Tint used for the monogram glyph and hover accents. */
  tint: string;
  /** 1–2 letter monogram, e.g. "Radio Elmar" → "RE", "FIP" → "FIP"→"FI". */
  monogram: string;
}

export function monogramOf(name: string): string {
  const words = (name || '')
    .replace(/\(.*?\)/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const [first, second] = words;
  if (!first) return '?';
  if (!second) return Array.from(first).slice(0, 2).join('').toUpperCase();
  return (Array.from(first)[0]! + Array.from(second)[0]!).toUpperCase();
}

export function artworkFor(name: string): StationArt {
  const h = hashString(name || '');
  const hue = HUE_MIN + (h % HUE_SPAN);
  const hue2 = hue + 22 + (h % 14); // secondary stop, gentle shift for depth
  const gradient = `linear-gradient(135deg, hsl(${hue} 62% 20%) 0%, hsl(${hue2} 70% 11%) 100%)`;
  const tint = `hsl(${hue} 88% 76%)`;
  return { hue, gradient, tint, monogram: monogramOf(name) };
}
