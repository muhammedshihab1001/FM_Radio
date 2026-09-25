import { http, HttpResponse, delay } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import * as apiMod from '../../../src/services/api';
import { api, calls, server } from '../../setup/msw';
import { ESTONIA, STATIONS, envelope } from '../../fixtures/stations';

const never = async () => {
  await delay('infinite');
  return HttpResponse.json({});
};

describe('fetchStations', () => {
  it('pages by cursor with country + limit; the first page sends no cursor', async () => {
    const first = await apiMod.fetchStations(0, 'Estonia');
    expect(first.stations).toHaveLength(30);
    const url = calls.at(-1)!;
    expect(url.searchParams.has('cursor')).toBe(false);
    expect(url.searchParams.has('last_id')).toBe(false);
    expect(url.searchParams.get('country')).toBe('Estonia');
    expect(url.searchParams.get('limit')).toBe('50');

    await apiMod.fetchStations(ESTONIA[9]!.id, '');
    expect(calls.at(-1)!.searchParams.has('country')).toBe(false);
    expect(calls.at(-1)!.searchParams.get('cursor')).toBe(String(ESTONIA[9]!.id));
    // The deployed Worker reads only `last_id` — without it "Load more" re-fetches page 1.
    expect(calls.at(-1)!.searchParams.get('last_id')).toBe(String(ESTONIA[9]!.id));
  });

  it('passes an opaque Radio Browser cursor back unchanged', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    await apiMod.fetchStations('rb:48', 'Global');
    const sent = new URL(spy.mock.calls[0]![0] as string);
    expect(sent.searchParams.get('cursor')).toBe('rb:48');
    expect(sent.searchParams.get('last_id')).toBe('rb:48');
  });

  it('keeps source / source_switched and warns when serving the fallback cache', async () => {
    server.use(
      http.get(api('/stations'), () =>
        HttpResponse.json(
          envelope({
            stations: STATIONS.slice(0, 2),
            next_cursor: 'rb:24',
            source: 'fallback-cache',
            source_switched: true,
          }),
        ),
      ),
    );
    const page = await apiMod.fetchStations();
    expect(page).toMatchObject({ next_cursor: 'rb:24', source: 'fallback-cache', source_switched: true });
    expect(page.warning).toMatch(/saved stations/i);

    server.use(http.get(api('/stations'), () => HttpResponse.json(envelope({ stations: null, source: 'none' }))));
    await expect(apiMod.fetchStations()).resolves.toMatchObject({ stations: [], next_cursor: null, source: 'none' });
  });

  it('reports a rate limit (429) clearly', async () => {
    server.use(
      http.get(api('/stations'), () =>
        HttpResponse.json({ success: false, error: 'Too many requests' }, { status: 429 }),
      ),
    );
    await expect(apiMod.fetchStations()).rejects.toThrow('Rate limited (429): Too many requests');
  });

  it('throws the API error message when success is false', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.json({ success: false, error: 'D1 quota exhausted' })));
    await expect(apiMod.fetchStations()).rejects.toThrow('D1 quota exhausted');
  });

  it('throws a default message when success is false without an error', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.json({ success: false })));
    await expect(apiMod.fetchStations()).rejects.toThrow('Signal Lost — Global Network Offline');
  });

  it('throws on a non-JSON response (e.g. an HTML error page)', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.html('<h1>502 Bad Gateway</h1>', { status: 502 })));
    await expect(apiMod.fetchStations()).rejects.toThrow('Invalid Signal Format (Non-JSON)');
  });

  it('rejects on a network error', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.error()));
    await expect(apiMod.fetchStations()).rejects.toThrow();
  });

  it('times out after 12 s', async () => {
    vi.useFakeTimers();
    server.use(http.get(api('/stations'), never));
    const pending = apiMod.fetchStations();
    const assertion = expect(pending).rejects.toThrow('Signal Timeout — Network Hub Unreachable');
    await vi.advanceTimersByTimeAsync(11_999);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });
});

describe('fetchRandom', () => {
  it('accepts a plain array', async () => {
    await expect(apiMod.fetchRandom()).resolves.toHaveLength(24);
  });
  it('accepts the { stations } quota-fallback shape', async () => {
    server.use(
      http.get(api('/stations/random'), () =>
        HttpResponse.json(envelope({ stations: STATIONS.slice(0, 3), next_cursor: null })),
      ),
    );
    await expect(apiMod.fetchRandom()).resolves.toHaveLength(3);
  });
  it('returns [] for any other shape', async () => {
    server.use(http.get(api('/stations/random'), () => HttpResponse.json(envelope({ nope: true }))));
    await expect(apiMod.fetchRandom()).resolves.toEqual([]);
  });
  it('throws on success: false and on non-JSON', async () => {
    server.use(http.get(api('/stations/random'), () => HttpResponse.json({ success: false, error: 'cold' })));
    await expect(apiMod.fetchRandom()).rejects.toThrow('cold');
    server.use(http.get(api('/stations/random'), () => HttpResponse.text('oops')));
    await expect(apiMod.fetchRandom()).rejects.toThrow('Non-JSON');
  });
});

describe('searchStations / fetchTrending', () => {
  it('URL-encodes the query and returns the data array', async () => {
    const res = (await apiMod.searchStations('jazz & blues/ü')) as unknown[];
    expect(Array.isArray(res)).toBe(true);
    expect(calls.at(-1)!.searchParams.get('q')).toBe('jazz & blues/ü');
    expect(calls.at(-1)!.searchParams.get('limit')).toBe('50');
  });
  it('trending returns [] when data is null and throws on failure', async () => {
    server.use(http.get(api('/stations/trending'), () => HttpResponse.json(envelope(null))));
    await expect(apiMod.fetchTrending()).resolves.toEqual([]);
    server.use(http.get(api('/stations/trending'), () => HttpResponse.json({ success: false })));
    await expect(apiMod.fetchTrending()).rejects.toThrow('Signal Lost — Terminal Offline');
  });
  it('search throws on success: false', async () => {
    server.use(http.get(api('/stations/search'), () => HttpResponse.json({ success: false, error: 'bad q' })));
    await expect(apiMod.searchStations('x')).rejects.toThrow('bad q');
  });
});

describe('fetchCountries / fetchStats never throw', () => {
  it('return data on success', async () => {
    await expect(apiMod.fetchCountries()).resolves.toHaveLength(9);
    await expect(apiMod.fetchStats()).resolves.toMatchObject({ total_stations: 872268 });
  });
  it('fall back to [] / null on failure, bad shape or network error', async () => {
    server.use(
      http.get(api('/countries'), () => HttpResponse.json(envelope({ not: 'an array' }))),
      http.get(api('/stats'), () => HttpResponse.json({ success: false })),
    );
    await expect(apiMod.fetchCountries()).resolves.toEqual([]);
    await expect(apiMod.fetchStats()).resolves.toBeNull();
    server.use(
      http.get(api('/countries'), () => HttpResponse.error()),
      http.get(api('/stats'), () => HttpResponse.error()),
    );
    await expect(apiMod.fetchCountries()).resolves.toEqual([]);
    await expect(apiMod.fetchStats()).resolves.toBeNull();
  });
});

describe('trackClick', () => {
  it('POSTs the id with keepalive', async () => {
    const seen = vi.fn();
    server.use(
      http.post(api('/stations/click'), async ({ request }) => {
        seen(await request.json(), request.headers.get('content-type'));
        return HttpResponse.json({ success: true });
      }),
    );
    const spy = vi.spyOn(globalThis, 'fetch');
    await apiMod.trackClick(42);
    // The API takes the id as a string, exactly as given ("rb:<uuid>" ids pass through untouched).
    await vi.waitFor(() => expect(seen).toHaveBeenCalledWith({ id: '42' }, 'application/json'));
    await apiMod.trackClick('rb:3a1f-uuid');
    await vi.waitFor(() => expect(seen).toHaveBeenLastCalledWith({ id: 'rb:3a1f-uuid' }, 'application/json'));
    expect(spy.mock.calls[0]![1]).toMatchObject({ method: 'POST', keepalive: true });
  });

  // BUG-10 (fixed): a failed beacon used to surface as an unhandled promise rejection.
  it('handles a failed beacon instead of leaving the rejection unhandled', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(apiMod.trackClick(1)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Click tracking deferred.');
  });
});

describe('admin endpoints send the key', () => {
  it('status succeeds with the right key and throws with a wrong one', async () => {
    await expect(apiMod.fetchAdminStatus('test-key')).resolves.toMatchObject({ remaining: 3800 });
    await expect(apiMod.fetchAdminStatus('nope')).rejects.toThrow('Unauthorized');
  });
  it('dead-stream add/restore/cleanup/reset hit the right routes', async () => {
    const hits: string[] = [];
    const record =
      (name: string) =>
      async ({ request }: { request: Request }) => {
        hits.push(
          `${request.method} ${name} ${request.headers.get('x-admin-key')} ${request.method === 'POST' ? await request.text() : ''}`.trim(),
        );
        return HttpResponse.json({ success: true, data: { ok: name } });
      };
    server.use(
      http.post(api('/admin/dead/add'), record('add')),
      http.post(api('/admin/dead/restore'), record('restore')),
      http.post(api('/admin/dead/cleanup'), record('cleanup')),
      http.get(api('/admin/d1/reset'), record('reset')),
    );
    await apiMod.addDeadStream('https://x.test/a', 'k');
    await apiMod.restoreStream('https://x.test/a', 'k');
    await apiMod.cleanupDeadStreams('k');
    await apiMod.resetD1Counter('k');
    expect(hits).toEqual([
      'POST add k {"url":"https://x.test/a"}',
      'POST restore k {"url":"https://x.test/a"}',
      'POST cleanup k',
      'GET reset k',
    ]);
  });
});

describe('new endpoints', () => {
  it('searchStationsFiltered sends only set filters and defaults limit to 50', async () => {
    const seen: URL[] = [];
    server.use(
      http.get(api('/stations/search'), ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json(envelope({ stations: STATIONS.slice(0, 2) }));
      }),
    );
    const res = await apiMod.searchStationsFiltered({
      tag: 'jazz',
      language: '',
      codec: 'mp3',
      bitrate_min: 128,
      order: 'votes',
      limit: undefined,
    });
    expect(res).toHaveLength(2);
    expect(Object.fromEntries(seen[0]!.searchParams)).toEqual({
      tag: 'jazz',
      codec: 'mp3',
      bitrate_min: '128',
      order: 'votes',
      limit: '50',
    });

    // `order` is only valid with tag/language; limit and bitrate_min are clamped; q is trimmed.
    await apiMod.searchStationsFiltered({ q: '  rock ', order: 'votes', bitrate_min: 5000, limit: 500 });
    expect(Object.fromEntries(seen[1]!.searchParams)).toEqual({ q: 'rock', bitrate_min: '1000', limit: '50' });

    // A bare name search needs 3+ characters: no request at all below that.
    await expect(apiMod.searchStationsFiltered({ q: 'ro' })).resolves.toEqual([]);
    await expect(apiMod.searchStationsFiltered({})).resolves.toEqual([]);
    expect(seen).toHaveLength(2);
    await apiMod.searchStationsFiltered({ language: 'estonian', limit: 0 });
    expect(Object.fromEntries(seen[2]!.searchParams)).toEqual({ language: 'estonian', limit: '1' });
  });

  it('fetchTopStations passes `by` and normalises both shapes', async () => {
    let by: string | null = null;
    server.use(
      http.get(api('/stations/top'), ({ request }) => {
        by = new URL(request.url).searchParams.get('by');
        return HttpResponse.json(envelope(STATIONS.slice(0, 4)));
      }),
    );
    await expect(apiMod.fetchTopStations('clicks', 4)).resolves.toHaveLength(4);
    expect(by).toBe('clicks');
    server.use(http.get(api('/stations/top'), () => HttpResponse.json({ success: false, error: 'Not found' })));
    await expect(apiMod.fetchTopStations()).rejects.toThrow('Not found');
  });

  it('fetchStationById returns the station, or null on any failure', async () => {
    server.use(http.get(api('/station'), () => HttpResponse.json(envelope(STATIONS[0]))));
    await expect(apiMod.fetchStationById('rb:abc/1')).resolves.toMatchObject({ id: STATIONS[0]!.id });
    server.use(http.get(api('/station'), () => HttpResponse.json(envelope([STATIONS[0]]))));
    await expect(apiMod.fetchStationById(1)).resolves.toBeNull();
    server.use(http.get(api('/station'), () => HttpResponse.json({ success: false, error: 'Not found' })));
    await expect(apiMod.fetchStationById(1)).resolves.toBeNull();
  });

  it('browse lists normalise Radio Browser rows and fail soft', async () => {
    server.use(
      http.get(api('/tags'), () =>
        HttpResponse.json(
          envelope([{ name: 'jazz', stationcount: 12 }, { name: 'rock', count: 3 }, { name: '' }, null]),
        ),
      ),
      http.get(api('/languages'), () => HttpResponse.json({ success: false, error: 'Not found' })),
      http.get(api('/codecs'), () => HttpResponse.json(envelope('nope'))),
    );
    await expect(apiMod.fetchTags()).resolves.toEqual([
      { name: 'jazz', count: 12 },
      { name: 'rock', count: 3 },
    ]);
    await expect(apiMod.fetchLanguages()).resolves.toEqual([]);
    await expect(apiMod.fetchCodecs()).resolves.toEqual([]);
  });

  it('browse lists read the Worker row shapes: {tag}, {language, code}, {codec}', async () => {
    let tagLimit: string | null = null;
    server.use(
      http.get(api('/tags'), ({ request }) => {
        tagLimit = new URL(request.url).searchParams.get('limit');
        return HttpResponse.json(envelope([{ tag: 'pop', count: 1200 }]));
      }),
      http.get(api('/languages'), () => HttpResponse.json(envelope([{ language: 'english', code: 'en', count: 9 }]))),
      http.get(api('/codecs'), () => HttpResponse.json(envelope([{ codec: 'MP3', count: 7 }]))),
    );
    await expect(apiMod.fetchTags(1000)).resolves.toEqual([{ name: 'pop', count: 1200 }]);
    expect(tagLimit).toBe('300');
    await expect(apiMod.fetchLanguages()).resolves.toEqual([{ name: 'english', count: 9, code: 'en' }]);
    await expect(apiMod.fetchCodecs()).resolves.toEqual([{ name: 'MP3', count: 7 }]);
  });

  it('fetchNowPlaying accepts a string, {title} or {song} and returns null otherwise', async () => {
    const answers: unknown[] = ['Artist – Song', { title: 'T' }, { song: 'S' }, {}, null];
    server.use(http.get(api('/nowplaying'), () => HttpResponse.json(envelope(answers.shift()))));
    const url = 'https://edge.test/live?sid=1&x=2';
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBe('Artist – Song');
    expect(calls.length).toBe(0); // handler above replaced the spying one
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBe('T');
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBe('S');
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBeNull();
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBeNull();
    server.use(http.get(api('/nowplaying'), () => HttpResponse.error()));
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBeNull();
  });

  it('fetchNowPlaying never asks again about a stream that reported supported: false', async () => {
    let hits = 0;
    server.use(
      http.get(api('/nowplaying'), () => {
        hits++;
        return HttpResponse.json(envelope({ title: null, supported: false, source: 'icy' }));
      }),
    );
    const url = 'https://edge.test/no-metadata';
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBeNull();
    await expect(apiMod.fetchNowPlaying(url)).resolves.toBeNull();
    expect(hits).toBe(1);
  });
});
