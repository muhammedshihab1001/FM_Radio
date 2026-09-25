import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useStations } from '../../../src/hooks/useStations';
import { api, calls, page, respond, server } from '../../setup/msw';
import { ESTONIA, STATIONS, envelope, makeStation } from '../../fixtures/stations';
import type { CountryNode } from '../../../src/types/terminal';

// useStations.load() ignores a request that starts < 200 ms after the previous
// one (BUG-8), so every user action below is separated by a 250 ms clock step,
// the way a real person's clicks would be. Only Date is faked here.
const step = async (fn: () => void) => {
  vi.setSystemTime(Date.now() + 250);
  await act(() => Promise.resolve(fn()));
};
// Switch from the Date-only clock to fully fake timers (a second useFakeTimers
// call would otherwise keep the first configuration).
const fakeAllTimers = () => {
  vi.useRealTimers();
  vi.useFakeTimers({ shouldAdvanceTime: true });
};
// Clock that moves only when the test advances it — for exact timing assertions, where
// shouldAdvanceTime would let real (loaded-machine) time leak into the fake clock.
const fakeManualTimers = () => {
  vi.useRealTimers();
  vi.useFakeTimers();
};
const setup = async () => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  const hook = renderHook(() => useStations());
  await vi.waitFor(() => expect(hook.result.current.loading).toBe(false));
  await vi.waitFor(() => expect(hook.result.current.stations.length).toBeGreaterThan(0));
  return hook;
};
const pathCalls = (path: string) => calls.filter((u) => u.pathname === path);
const names = (list: { name: string }[]) => list.map((s) => s.name);
const twelveCountries: CountryNode[] = Array.from({ length: 12 }, (_, i) => ({ country: `Land ${i}`, count: 100 + i }));

describe('useStations — default + browse', () => {
  it('boots on Estonia, loads countries + stats, no more pages', async () => {
    const { result } = await setup();
    expect(result.current.country).toBe('Estonia');
    expect(names(result.current.stations)).toEqual(names(ESTONIA));
    expect(result.current.hasMore).toBe(false);
    await vi.waitFor(() => expect(result.current.countries).toHaveLength(9));
    // max(API total, sum of per-country counts)
    expect(result.current.stationCount).toBe(872268);
    expect(result.current.countryCount).toBe(189);
    expect(pathCalls('/stations')[0]!.searchParams.get('country')).toBe('Estonia');
  });

  it('changes country and serves a revisited country from the page cache', async () => {
    const { result } = await setup();
    await step(() => result.current.filterByCountry('Germany'));
    await vi.waitFor(() => expect(result.current.stations.every((s) => s.country === 'Germany')).toBe(true));
    expect(result.current.country).toBe('Germany');

    await step(() => result.current.filterByCountry('Estonia'));
    await vi.waitFor(() => expect(names(result.current.stations)).toEqual(names(ESTONIA)));
    expect(pathCalls('/stations').filter((u) => u.searchParams.get('country') === 'Estonia')).toHaveLength(1);
  });

  it('"All Countries" / null clears the country and shows the random discovery mix', async () => {
    const { result } = await setup();
    await step(() => result.current.filterByCountry('All Countries'));
    await vi.waitFor(() => expect(result.current.country).toBe(''));
    await vi.waitFor(() => expect(pathCalls('/stations/random')).toHaveLength(1));
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(24));
    expect(result.current.hasMore).toBe(false);
  });

  it('pages with the cursor, appends without duplicates and stops at the end', async () => {
    const big = Array.from({ length: 120 }, (_, i) => makeStation(200 + i, { country: 'Germany' }));
    server.use(
      http.get(api('/stations'), ({ request }) => {
        const url = new URL(request.url);
        calls.push(url);
        return HttpResponse.json(envelope(page(url.searchParams.get('country') === 'Germany' ? big : ESTONIA, url)));
      }),
    );
    const { result } = await setup();
    await step(() => result.current.filterByCountry('Germany'));
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(50));
    expect(result.current.hasMore).toBe(true);

    await step(() => result.current.loadMore());
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(100));
    await step(() => result.current.loadMore());
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(120));
    expect(result.current.hasMore).toBe(false);
    expect(new Set(result.current.stations.map((s) => s.url)).size).toBe(120);

    const cursors = pathCalls('/stations')
      .filter((u) => u.searchParams.get('country') === 'Germany')
      .map((u) => u.searchParams.get('cursor'));
    expect(cursors).toEqual([null, String(big[49]!.id), String(big[99]!.id)]); // first page: no cursor
  });

  it('surfaces API errors and warnings', async () => {
    server.use(http.get(api('/stations'), () => HttpResponse.json({ success: false, error: 'D1 quota exhausted' })));
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    const { result } = renderHook(() => useStations());
    await vi.waitFor(() => expect(result.current.error).toBe('D1 quota exhausted'));
    expect(result.current.loading).toBe(false);

    server.use(
      http.get(api('/stations'), () =>
        HttpResponse.json(
          envelope({ stations: ESTONIA.slice(0, 2), next_cursor: null, warning: 'Serving cached data' }),
        ),
      ),
    );
    await step(() => result.current.filterByCountry('France'));
    await vi.waitFor(() => expect(result.current.warning).toBe('Serving cached data'));
  });

  // BUG-8: load() silently drops any request that starts < 200 ms after the
  // previous one, so a quick second filter change never loads its stations.
  it.fails('loads the latest country even when changed twice quickly', async () => {
    const { result } = await setup();
    await step(() => result.current.filterByCountry('Germany'));
    act(() => result.current.filterByCountry('Japan')); // same tick, < 200 ms later
    await vi.waitFor(() => expect(result.current.stations.every((s) => s.country === 'Japan')).toBe(true), {
      timeout: 1500,
    });
  });
});

describe('useStations — search', () => {
  it('debounces typing by 400 ms and sends one sanitised query', async () => {
    const { result } = await setup();
    fakeManualTimers();
    for (const q of ['j', 'ja', 'jaz', 'jazz<script>']) act(() => result.current.search(q));
    await act(() => vi.advanceTimersByTimeAsync(399));
    expect(pathCalls('/stations/search')).toHaveLength(0);
    await act(() => vi.advanceTimersByTimeAsync(1));
    await vi.waitFor(() => expect(result.current.query).toBe('jazzscript'));
    await vi.waitFor(() => expect(pathCalls('/stations/search')).toHaveLength(1));
    expect(pathCalls('/stations/search')[0]!.searchParams.get('q')).toBe('jazzscript');
    expect(result.current.hasMore).toBe(false);
  });

  it('does not search for fewer than 3 characters', async () => {
    const { result } = await setup();
    fakeAllTimers();
    await step(() => result.current.search('ja'));
    await act(() => vi.advanceTimersByTimeAsync(450));
    await vi.waitFor(() => expect(result.current.query).toBe('ja'));
    expect(result.current.stations).toEqual([]);
    expect(pathCalls('/stations/search')).toHaveLength(0);
  });

  it('caps the query at 100 characters', async () => {
    const { result } = await setup();
    fakeAllTimers();
    await step(() => result.current.search('x'.repeat(300)));
    await act(() => vi.advanceTimersByTimeAsync(400));
    await vi.waitFor(() => expect(result.current.query).toHaveLength(100));
  });
});

describe('useStations — shuffle', () => {
  it('picks a real country from the list, syncs the filter and enforces a 2 s cooldown', async () => {
    server.use(http.get(api('/countries'), () => HttpResponse.json(envelope(twelveCountries))));
    const { result } = await setup();
    await vi.waitFor(() => expect(result.current.countries).toHaveLength(12));
    fakeManualTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // → index 6
    await step(() => result.current.fetchRandom());
    expect(result.current.country).toBe('Land 6');
    expect(result.current.cooldown).toBe(2);
    await vi.waitFor(() =>
      expect(pathCalls('/stations').some((u) => u.searchParams.get('country') === 'Land 6')).toBe(true),
    );

    await step(() => result.current.fetchRandom()); // ignored during cooldown
    expect(result.current.country).toBe('Land 6');
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.cooldown).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.cooldown).toBe(0);
  });

  it('uses the built-in diverse list when too few real countries are known', async () => {
    const { result } = await setup();
    vi.spyOn(Math, 'random').mockReturnValue(0); // → 'United States'
    await step(() => result.current.fetchRandom());
    expect(result.current.country).toBe('United States');
  });
});

describe('useStations — trending fallback chain', () => {
  it('1. real trending data', async () => {
    const { result } = await setup();
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(names(result.current.stations)).toEqual(names(STATIONS.slice(0, 12))));
    expect(result.current.isTrending).toBe(true);
    expect(result.current.country).toBe('');
    expect(result.current.hasMore).toBe(false);
  });

  it('2. stale trending cache when the API returns nothing', async () => {
    const { result } = await setup();
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(12));
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(result.current.isTrending).toBe(false));
    server.use(respond('/stations/trending', []));
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(pathCalls('/stations/trending')).toHaveLength(2));
    await vi.waitFor(() => expect(names(result.current.stations)).toEqual(names(STATIONS.slice(0, 12))));
  });

  it('3. shuffled random cache when there is no trending cache', async () => {
    server.use(respond('/stations/trending', []));
    const { result } = await setup();
    await step(() => result.current.filterByCountry(null)); // fills the random cache
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(24));
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(pathCalls('/stations/trending')).toHaveLength(1));
    await vi.waitFor(() =>
      expect(new Set(names(result.current.stations))).toEqual(new Set(names(STATIONS.slice(20, 44)))),
    );
    expect(pathCalls('/stations/random')).toHaveLength(1);
  });

  it('4. Estonia when trending and random are both empty', async () => {
    server.use(respond('/stations/trending', []), respond('/stations/random', []));
    const { result } = await setup();
    const before = pathCalls('/stations').length;
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(pathCalls('/stations').length).toBe(before + 1));
    expect(pathCalls('/stations').at(-1)!.searchParams.get('country')).toBe('Estonia');
    await vi.waitFor(() => expect(names(result.current.stations)).toEqual(names(ESTONIA)));
  });
});

describe('useStations — caching + cold start', () => {
  // BUG-9: pageCache (no TTL) is checked before the random cache, so the
  // 1-hour TTL never applies — the discovery mix (and every country page)
  // stays frozen for the whole session.
  it.fails('reuses the random mix for 1 hour, then refetches', async () => {
    const { result } = await setup();
    fakeAllTimers();
    const next = async (c: string | null) => {
      await step(() => result.current.filterByCountry(c));
      await act(() => vi.advanceTimersByTimeAsync(250)); // clear the 200 ms re-entry guard
    };
    await next(null);
    await vi.waitFor(() => expect(pathCalls('/stations/random')).toHaveLength(1));
    await next('Germany');
    await next(null);
    await vi.waitFor(() => expect(result.current.stations).toHaveLength(24));
    expect(pathCalls('/stations/random')).toHaveLength(1);

    vi.setSystemTime(Date.now() + 60 * 60 * 1000 + 1);
    await next('Japan');
    await next(null);
    await vi.waitFor(() => expect(pathCalls('/stations/random')).toHaveLength(2));
  });

  it('Shuffle bypasses the page cache and refetches a country it already has', async () => {
    const { result } = await setup();
    await step(() => result.current.filterByCountry('Brazil'));
    await vi.waitFor(() =>
      expect(pathCalls('/stations').filter((u) => u.searchParams.get('country') === 'Brazil')).toHaveLength(1),
    );
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // diverse list index 2 → 'Brazil'
    await step(() => result.current.fetchRandom());
    await vi.waitFor(() =>
      expect(pathCalls('/stations').filter((u) => u.searchParams.get('country') === 'Brazil')).toHaveLength(2),
    );
  });

  it('cold start: an empty random pool falls back to one country page', async () => {
    server.use(respond('/stations/random', []));
    const { result } = await setup();
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // → last of the diverse list
    await step(() => result.current.filterByCountry(null));
    await vi.waitFor(() => expect(pathCalls('/stations').at(-1)!.searchParams.get('country')).toBe('South Korea'));
  });

  it('filters the "Global" catch-all out of the random mix', async () => {
    server.use(
      http.get(api('/stations/random'), () =>
        HttpResponse.json(
          envelope([
            makeStation(1, { country: 'Global' }),
            makeStation(2, { country: 'global' }),
            makeStation(3, { country: 'Japan' }),
          ]),
        ),
      ),
    );
    const { result } = await setup();
    await step(() => result.current.filterByCountry(null));
    await vi.waitFor(() => expect(result.current.stations.map((s) => s.country)).toEqual(['Japan']));
  });

  it('reset() returns home to Estonia', async () => {
    const { result } = await setup();
    await step(() => result.current.toggleTrending());
    await vi.waitFor(() => expect(result.current.isTrending).toBe(true));
    await step(() => result.current.reset());
    await vi.waitFor(() => expect(result.current.country).toBe('Estonia'));
    expect(result.current.isTrending).toBe(false);
    expect(result.current.query).toBe('');
  });
});
