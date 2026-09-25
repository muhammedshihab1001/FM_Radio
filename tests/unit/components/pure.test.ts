import { describe, expect, it } from 'vitest';
import { artworkFor, monogramOf } from '../../../src/components/artwork';
import { STATUS_LABEL, isRecoverable, toneOf } from '../../../src/components/playerStatus';

describe('artwork', () => {
  it.each([
    ['Radio Elmar', 'RE'],
    ['FIP', 'FI'],
    ['Duo GreatestHits (Estonia)', 'DG'],
    ['🎷 Smooth Jazz 24/7 🌙', 'SJ'],
    ['إذاعة القرآن الكريم', 'إا'],
    ['東京 ジャズ', '東ジ'],
    ['𝒜𝒷 radio', '𝒜R'],
    ['🎵🎶', '?'],
    ['', '?'],
  ])('monogram of %j is %j', (name, mono) => {
    expect(monogramOf(name)).toBe(mono);
  });

  it('is deterministic and stays inside the brand hue arc', () => {
    const a = artworkFor('Jazz FM');
    expect(artworkFor('Jazz FM')).toEqual(a);
    for (const n of ['a', 'b', 'Radio 1', 'Z'.repeat(200), '']) {
      const { hue, gradient } = artworkFor(n);
      expect(hue).toBeGreaterThanOrEqual(186);
      expect(hue).toBeLessThan(324);
      expect(gradient).toMatch(/^linear-gradient\(135deg/);
    }
  });
});

describe('playerStatus', () => {
  it('labels every status', () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual(
      ['buffering', 'connecting', 'error', 'idle', 'mixed-content', 'playing', 'recovering', 'stalled'].sort(),
    );
  });
  it('maps statuses to tones', () => {
    expect(toneOf(null, false)).toBe('idle');
    expect(toneOf('playing', true)).toBe('live');
    expect(toneOf('playing', false)).toBe('idle');
    expect(toneOf('mixed-content', false)).toBe('error');
    expect(toneOf('recovering', false)).toBe('busy');
    expect(toneOf('idle', false)).toBe('idle');
  });
  it('only error/stalled are retryable', () => {
    expect(isRecoverable('error')).toBe(true);
    expect(isRecoverable('stalled')).toBe(true);
    expect(isRecoverable('mixed-content')).toBe(false);
  });
});
