import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Station, Statistics, CountryNode } from '../types/terminal';
import * as api from '../services/api';

const TTL_COUNTRIES = 600000;
const TTL_STATS = 60000;
// TTL_RANDOM: 1 hour — API now uses server-side KV cache (random:v2:${hour}),
// so hitting it more often than once per hour gains nothing and wastes D1 reads.
const TTL_RANDOM = 3600000;
const TTL_TRENDING = 60000;
const TTL_SEARCH = 300000;

// Stations with country='Global' are catch-all entries (363k+ rows).
// The API already excludes them via SQL, but we filter client-side as a safety net.
const isRealCountry = (s: { country?: string }) =>
  s.country !== 'Global' && s.country !== 'global';

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [countries, setCountries] = useState<CountryNode[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [isTrending, setIsTrending] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const pageCache = useRef(new Map<string, { stations: Station[], nextCursor: string | number | null }>());
  const searchCache = useRef(new Map<string, { data: Station[], timestamp: number }>());
  const trendingCache = useRef<{ data: Station[], timestamp: number } | null>(null);
  const randomCache = useRef<{ data: Station[], timestamp: number } | null>(null);

  const fetchId = useRef<number>(0);
  const lastSignal = useRef<string>('');
  const lastFetch = useRef<number>(0);
  const isFetching = useRef<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── Smart stats fallback logic ─── */
  const stationCount = useMemo(() => {
    const apiTotal = stats?.total_stations ?? stats?.total ?? stats?.stations ?? 0;
    // Fallback: Sum up the counts from the countries list if available
    const computedTotal = countries.reduce((acc, c) => acc + (c.count || 0), 0);

    // Prioritize the calculated sum from countries if it's significantly larger
    // This solves the issue where the /stats endpoint is stale or failing
    return Math.max(apiTotal, computedTotal);
  }, [stats, countries]);

  const countryCount = useMemo(() => {
    return Math.max(countries.length, stats?.total_countries ?? stats?.countries ?? 0);
  }, [countries, stats]);

  useEffect(() => {
    // Initial boot fetches
    api.fetchCountries().then(setCountries).catch(() => {
      console.warn('BOOT: Country registry fetch failed. Check network.');
    });
    api.fetchStats().then(setStats).catch(() => {
      console.warn('BOOT: Stats endpoint fetch failed. Using country fallback.');
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(v => v - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const load = useCallback(async (append = false) => {
    const now = Date.now();
    if (isFetching.current && append) return;
    if (now - lastFetch.current < 200) return;

    const currentFetchId = ++fetchId.current;

    if (query && query.length < 3) {
      if (!append) setStations([]);
      setHasMore(false);
      return;
    }

    const cursorToUse = append ? nextCursor : 0;
    const modeKey = isTrending ? 'trending' : (query ? 'search' : 'explore');
    const countryKey = country || 'global';
    const cacheKey = `${modeKey}:${countryKey}:${cursorToUse}`;

    if (modeKey === 'explore' && !refreshKey) {
      const cached = pageCache.current.get(cacheKey);
      if (cached) {
        setStations(prev => {
          const list = append ? [...prev] : [];
          const existingUrls = new Set(list.map(s => s.url));
          const unique = cached.stations.filter(s => !existingUrls.has(s.url));
          return [...list, ...unique];
        });
        setNextCursor(cached.nextCursor ?? 0);
        setHasMore(cached.nextCursor !== null);
        return;
      }
    }

    setLoading(true);
    isFetching.current = true;
    lastFetch.current = now;
    if (!append) {
      setError(null);
      setStations([]);
    }

    try {
      let result;
      if (isTrending) {
        result = await api.fetchTrending();
        trendingCache.current = { data: result, timestamp: now };
      } else if (query) {
        result = await api.searchStations(query);
        searchCache.current.set(query.toLowerCase(), { data: result, timestamp: now });
      } else if (!query && !country && cursorToUse === 0) {
        if (randomCache.current && (now - randomCache.current.timestamp < TTL_RANDOM) && !refreshKey) {
          // ✅ Fresh client-side cache — shuffle and serve instantly (zero D1 reads)
          const shuffled = [...randomCache.current.data].sort(() => Math.random() - 0.5);
          result = { stations: shuffled, next_cursor: null };
        } else {
          const rawList = await api.fetchRandom();
          // API excludes 'Global' in SQL, but we filter client-side as a safety net.
          const list = rawList.filter(isRealCountry);
          if (list.length > 0) {
            // ✅ Happy path — store and shuffle
            randomCache.current = { data: list, timestamp: now };
            const shuffled = [...list].sort(() => Math.random() - 0.5);
            result = { stations: shuffled, next_cursor: null };
          } else if (randomCache.current && randomCache.current.data.length > 0) {
            // ⚡ API returned empty (quota hit) — serve stale cache, avoid extra D1 reads
            const shuffled = [...randomCache.current.data].sort(() => Math.random() - 0.5);
            result = { stations: shuffled, next_cursor: null };
          } else {
            // 🆕 Cold start with no cache AND API empty — load first page of real stations.
            // fetchStations reads only ~50 rows; acceptable cost to prevent blank home page.
            result = await api.fetchStations(0, '');
          }
        }
      } else {
        result = await api.fetchStations(cursorToUse, country);
      }

      if (currentFetchId !== fetchId.current || !result) return;

      const list = Array.isArray(result) ? result : (result.stations || []);
      const next = result.next_cursor ?? null;
      const apiWarning = (!Array.isArray(result) && result.warning) || null;
      const apiError = (!Array.isArray(result) && result.error) || null;

      if (apiWarning) setWarning(apiWarning);
      if (apiError) setError(apiError);

      if (modeKey === 'explore') {
        pageCache.current.set(cacheKey, { stations: list, nextCursor: next });
      }

      setStations(prev => {
        if (!append) return list;
        const existingUrls = new Set(prev.map(s => s.url));
        const unique = list.filter((s: Station) => !existingUrls.has(s.url));
        return [...prev, ...unique];
      });

      setNextCursor(next ?? 0);
      setHasMore(!isTrending && !query && next !== null);

    } catch (err: any) {
      if (currentFetchId === fetchId.current) {
        setError(err.message || 'Signal Lost — Global Network Offline');
      }
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        isFetching.current = false;
        setRefreshKey(0);
      }
    }
  }, [query, country, nextCursor, isTrending, refreshKey]);

  useEffect(() => {
    const sig = `${query}:${country}:${isTrending}:${refreshKey}`;
    if (sig === lastSignal.current) return;
    lastSignal.current = sig;
    load(false);
  }, [query, country, isTrending, refreshKey, load]);

  const fetchRandom = useCallback(() => {
    if (cooldown > 0) return;
    setIsTrending(false);
    setQuery('');
    setCountry('');
    setNextCursor(0);
    setCooldown(2);
    setRefreshKey(Date.now());
  }, [cooldown]);

  const toggleTrending = useCallback(() => {
    setIsTrending(p => !p);
    setQuery('');
    setCountry('');
    setNextCursor(0);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sanitized = q.trim().replace(/[<>\\"'`;()]/g, '').slice(0, 100);
      if (sanitized === query) return;
      setIsTrending(false);
      setQuery(sanitized);
      setNextCursor(0);
    }, 400);
  }, [query]);

  const filterByCountry = useCallback((c: string | null) => {
    setIsTrending(false);
    setCountry(c === 'All Countries' || !c ? '' : c);
    setQuery('');
    setNextCursor(0);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) load(true);
  }, [loading, hasMore, load]);

  const reset = useCallback(() => {
    setIsTrending(false);
    setQuery('');
    setCountry('');
    setNextCursor(0);
    setRefreshKey(Date.now());
  }, []);

  return {
    stations, countries, stats, loading, error, warning,
    query, country, isTrending, nextCursor, hasMore, cooldown,
    stationCount, countryCount, // Return computed values
    search, filterByCountry, toggleTrending, fetchRandom, loadMore, reset,
  };
}
