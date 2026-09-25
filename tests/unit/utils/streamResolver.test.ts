// @vitest-environment-options { "url": "https://nebula.test/" }
import { http, HttpResponse, delay } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import {
  injectPreconnect,
  isHls,
  isMixedContent,
  resolveStreamUrl,
  upgradeToHttps,
} from '../../../src/utils/streamResolver';
import { server } from '../../setup/msw';

describe('isHls', () => {
  it.each([
    ['https://cdn.test/live/index.m3u8', true],
    ['HTTPS://CDN.TEST/LIVE/INDEX.M3U8', true],
    ['https://cdn.test/index.m3u8?token=abc&x=1', true],
    ['https://cdn.test/stream.m3u8#t=10', false],
    ['https://cdn.test/a.m3u8/segment.ts', false],
    ['https://cdn.test/radio.mp3', false],
    ['https://cdn.test/list.m3u', false],
    ['', false],
  ])('%s → %s', (url, expected) => {
    expect(isHls(url)).toBe(expected);
  });
});

describe('isMixedContent (page served over https)', () => {
  it('flags an http:// stream', () => {
    expect(isMixedContent('http://radio.test/live.mp3')).toBe(true);
  });
  it('allows https:// streams and relative URLs', () => {
    expect(isMixedContent('https://radio.test/live.mp3')).toBe(false);
    expect(isMixedContent('/fixtures/tone.mp3')).toBe(false);
    expect(isMixedContent('')).toBe(false);
  });
  // BUG-11 (STANDARDS_REPORT): scheme matching is case-sensitive; URL schemes are not.
  it.fails('flags an uppercase HTTP:// stream', () => {
    expect(isMixedContent('HTTP://radio.test/live.mp3')).toBe(true);
  });
});

describe('upgradeToHttps', () => {
  it('upgrades http:// and leaves everything else alone', () => {
    expect(upgradeToHttps('http://radio.test/a?b=http://x')).toBe('https://radio.test/a?b=http://x');
    expect(upgradeToHttps('https://radio.test/a')).toBe('https://radio.test/a');
    expect(upgradeToHttps('')).toBe('');
    expect(upgradeToHttps('not a url')).toBe('not a url');
  });
  // BUG-11: uppercase scheme is not upgraded.
  it.fails('upgrades an uppercase HTTP:// scheme', () => {
    expect(upgradeToHttps('HTTP://radio.test/a')).toBe('https://radio.test/a');
  });
});

describe('resolveStreamUrl', () => {
  it('returns direct streams and empty input untouched without fetching', async () => {
    await expect(resolveStreamUrl('')).resolves.toBe('');
    await expect(resolveStreamUrl('https://radio.test/live.mp3')).resolves.toBe('https://radio.test/live.mp3');
    await expect(resolveStreamUrl('https://radio.test/index.m3u8')).resolves.toBe('https://radio.test/index.m3u8');
    await expect(resolveStreamUrl('not a url')).resolves.toBe('not a url');
  });

  it('resolves an .m3u playlist (CRLF, comments, query string, uppercase ext) to its first entry', async () => {
    server.use(
      http.get('https://radio.test/list.M3U', () =>
        HttpResponse.text(
          '#EXTM3U\r\n#EXTINF:-1,Station\r\n\r\nhttps://edge.radio.test/stream\r\nhttps://backup.test/s\r\n',
        ),
      ),
    );
    await expect(resolveStreamUrl('https://radio.test/list.M3U?sid=1')).resolves.toBe('https://edge.radio.test/stream');
  });

  it('resolves a .pls playlist via File1=', async () => {
    server.use(
      http.get('https://radio.test/list.pls', () =>
        HttpResponse.text('[playlist]\nNumberOfEntries=1\nfile1=https://edge.radio.test/live\nTitle1=x\n'),
      ),
    );
    await expect(resolveStreamUrl('https://radio.test/list.pls')).resolves.toBe('https://edge.radio.test/live');
  });

  // BUG-7: parsePLS splits on every "=", truncating URLs with query strings.
  it.fails('keeps query strings in a .pls entry', async () => {
    server.use(
      http.get('https://radio.test/q.pls', () => HttpResponse.text('File1=https://edge.test/live?sid=5&t=a=b\n')),
    );
    await expect(resolveStreamUrl('https://radio.test/q.pls')).resolves.toBe('https://edge.test/live?sid=5&t=a=b');
  });

  it('falls back to the playlist URL when it has no entries or the fetch fails', async () => {
    server.use(
      http.get('https://radio.test/empty.m3u', () => HttpResponse.text('#EXTM3U\n# nothing here\n')),
      http.get('https://radio.test/down.pls', () => HttpResponse.error()),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(resolveStreamUrl('https://radio.test/empty.m3u')).resolves.toBe('https://radio.test/empty.m3u');
    await expect(resolveStreamUrl('https://radio.test/down.pls')).resolves.toBe('https://radio.test/down.pls');
  });

  it('gives up after 5 s and falls back to the playlist URL', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    server.use(
      http.get('https://radio.test/slow.m3u', async () => {
        await delay('infinite');
        return HttpResponse.text('https://never.test');
      }),
    );
    const pending = resolveStreamUrl('https://radio.test/slow.m3u');
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBe('https://radio.test/slow.m3u');
  });
});

describe('injectPreconnect', () => {
  it('adds one preconnect hint per origin and ignores invalid URLs', () => {
    injectPreconnect('https://edge.radio.test/a.mp3');
    injectPreconnect('https://edge.radio.test/b.mp3');
    injectPreconnect('not a url');
    injectPreconnect('');
    const links = document.head.querySelectorAll('link[rel="preconnect"]');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://edge.radio.test');
  });
});
