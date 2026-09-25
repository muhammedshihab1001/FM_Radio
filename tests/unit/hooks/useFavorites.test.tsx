import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFavorites } from '../../../src/hooks/useFavorites';
import { STATIONS } from '../../fixtures/stations';

const KEY = 'fm_favs_v2';
const [a, b] = [STATIONS[0]!, STATIONS[1]!];

describe('useFavorites', () => {
  it('starts empty and adds / removes by stream URL', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favCount).toBe(0);

    act(() => result.current.toggleFav(a));
    expect(result.current.isFav(a.url)).toBe(true);
    expect(result.current.favList).toEqual([a]);

    act(() => result.current.toggleFav(a));
    expect(result.current.isFav(a.url)).toBe(false);
    expect(result.current.favCount).toBe(0);
  });

  it('persists to localStorage and restores on the next mount', () => {
    const first = renderHook(() => useFavorites());
    act(() => first.result.current.toggleFav(a));
    act(() => first.result.current.toggleFav(b));
    first.unmount();

    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)!) as object)).toEqual([a.url, b.url]);
    const second = renderHook(() => useFavorites());
    expect(second.result.current.favCount).toBe(2);
    expect(second.result.current.isFav(b.url)).toBe(true);
  });

  it('keys by stream URL: a second station with the same URL toggles the saved one off (no duplicates)', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFav(a));
    act(() => result.current.toggleFav(b));
    act(() => result.current.toggleFav({ ...a, id: 'dupe', name: 'Renamed' }));
    expect(result.current.favList.map((s) => s.url)).toEqual([b.url]);
  });

  it('ignores stations without a URL and undefined lookups', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFav({ ...a, url: '' }));
    expect(result.current.favCount).toBe(0);
    expect(result.current.isFav(undefined)).toBe(false);
  });

  it('recovers from corrupted (non-JSON) storage', () => {
    localStorage.setItem(KEY, '{not json');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favCount).toBe(0);
    act(() => result.current.toggleFav(a));
    expect(result.current.favCount).toBe(1);
  });

  // BUG-6: valid JSON of the wrong shape (e.g. "null") is returned as-is and
  // the first isFav() call throws, crashing the whole app on load.
  it.fails('recovers from valid-but-wrong JSON such as "null"', () => {
    localStorage.setItem(KEY, 'null');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFav(a.url)).toBe(false);
  });

  it('keeps every mounted instance in sync', () => {
    const one = renderHook(() => useFavorites());
    const two = renderHook(() => useFavorites());
    act(() => one.result.current.toggleFav(a));
    expect(two.result.current.isFav(a.url)).toBe(true);
    expect(two.result.current.favCount).toBe(1);
  });

  it('shows a transient toast and removes it', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFav(a));
    // The hook sets the text via innerText, which jsdom stores as a plain property.
    const toast = [...document.body.querySelectorAll<HTMLElement>('div')].find((d) =>
      d.innerText?.includes(`Saved ${a.name}`),
    );
    expect(toast).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(document.body.contains(toast!)).toBe(false);
  });
});
