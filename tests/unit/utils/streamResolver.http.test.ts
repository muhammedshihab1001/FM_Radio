// Default jsdom origin is http://localhost:3000 — an http page can play http streams.
import { describe, expect, it } from 'vitest';
import { isMixedContent } from '../../../src/utils/streamResolver';

describe('isMixedContent (page served over http)', () => {
  it('never blocks: an http page may load http streams', () => {
    expect(window.location.protocol).toBe('http:');
    expect(isMixedContent('http://radio.test/live.mp3')).toBe(false);
    expect(isMixedContent('https://radio.test/live.mp3')).toBe(false);
  });
});
