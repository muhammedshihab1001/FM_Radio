import { useState, useEffect, useCallback, useRef } from 'react';
import { Station, Statistics, CountryNode } from '../types/terminal';
import * as api from '../services/api';

// Cache TTLs (ms)
const TTL_COUNTRIES = 600000; // 10 min
const TTL_STATS     = 60000;  // 1 min
const TTL_RANDOM    = 30000;  // 30 sec
const TTL_TRENDING  = 60000;  // 60 sec
const TTL_SEARCH    = 300000; // 5 min (Requested)

export function useStations() {
  const [stations, setStations]     = useState<Station[]>([]);
  const [countries, setCountries]   = useState<CountryNode[]>([]);
  const [stats, setStats]           = useState<Statistics | null>(null);
  const [loading, setLoading]       = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState<string>('');
  const [country, setCountry]       = useState<string>('');
  const [isTrending, setIsTrending] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | number>(0);
  const [hasMore, setHasMore]       = useState<boolean>(false);
  const [cooldown, setCooldown]     = useState<number>(0);

  // ─── Memory Cache Storage ───
  // Format: mode:country:cursor
  const pageCache     = useRef(new Map<string, { stations: Station[], nextCursor: string | number }>());
  const searchCache   = useRef(new Map<string, { data: Station[], timestamp: number }>()); // Supports TTL
  const trendingCache = useRef<{ data: Station[], timestamp: number } | null>(null);
  const randomCache   = useRef<{ data: Station[], timestamp: number } | null>(null);

  const fetchId     = useRef<number>(0);
  const lastSignal  = useRef<string>('');
  const lastFetch   = useRef<number>(0); 
  const isFetching  = useRef<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── API Boot Sequence ─── */
  useEffect(() => {
    api.fetchCountries().then(setCountries).catch(() => {});
    api.fetchStats().then(setStats).catch(() => {});
  }, []);

  /* ─── Cooldown Timer ─── */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(v => v - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /* ─── Load Logic (KV + Edge Optimized) ─── */
  const load = useCallback(async (append = false) => {
    const now = Date.now();
    
    // Strict Deduplication & Guarding
    if (isFetching.current && append) return;
    if (now - lastFetch.current < 300) return; 

    // Search validation
    if (query && query.length < 3) {
      if (!append) setStations([]);
      setHasMore(false);
      return;
    }

    const currentFetchId = ++fetchId.current;
    const cursorToUse = append ? nextCursor : 0;
    
    // Standardized Key Format: mode:country:cursor
    const modeKey = isTrending ? 'trending' : (query ? 'search' : 'explore');
    const countryKey = country || 'global';
    const cacheKey = `${modeKey}:${countryKey}:${cursorToUse}`;

    // ─── 1. OPTIMISTIC CACHE CHECK ───
    if (modeKey === 'explore') {
      const cached = pageCache.current.get(cacheKey);
      if (cached) {
        setStations(prev => {
          if (!append) return cached.stations;
          const existingUrls = new Set(prev.map(s => s.url));
          const unique = cached.stations.filter(s => !existingUrls.has(s.url));
          return [...prev, ...unique];
        });
        setNextCursor(cached.nextCursor);
        setHasMore(cached.nextCursor !== null && cached.stations.length >= 40);
        if (!append) setError(null);
        return; // ZERO LATENCY EXIT
      }
    } else if (modeKey === 'search') {
      const cached = searchCache.current.get(cacheKey);
      if (cached && (now - cached.timestamp < TTL_SEARCH) && !append) {
        setStations(cached.data);
        setHasMore(false);
        setNextCursor(0);
        setError(null);
        return;
      }
    } else if (modeKey === 'trending') {
      const cached = trendingCache.current;
      if (cached && (now - cached.timestamp < TTL_TRENDING) && !append) {
        setStations(cached.data);
        setHasMore(false);
        setNextCursor(0);
        setError(null);
        return;
      }
    }

    // ─── 2. NETWORK FETCH (Cache Miss) ───
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
        searchCache.current.set(cacheKey, { data: result, timestamp: now });
      } else if (!query && !country && cursorToUse === 0) {
        // Random Selection Handshake
        if (randomCache.current && (now - randomCache.current.timestamp < TTL_RANDOM)) {
          result = { stations: randomCache.current.data, next_cursor: 0 };
        } else {
          const stations = await api.fetchRandom();
          randomCache.current = { data: stations, timestamp: now };
          result = { stations, next_cursor: 0 };
        }
      } else {
        result = await api.fetchStations(cursorToUse, country);
      }

      if (currentFetchId !== fetchId.current || !result) return;

      const list = Array.isArray(result) ? result : (result.stations || []);
      const next = result.next_cursor ?? null;

      if (list.length === 0 && !append) {
        setError('No Stations Found');
      }

      // Store in memory cache
      if (modeKey === 'explore') {
        pageCache.current.set(cacheKey, { stations: list, nextCursor: next });
      }

      setStations(prev => {
        if (!append) return list;
        const existingUrls = new Set(prev.map(s => s.url));
        const unique = list.filter((s: Station) => !existingUrls.has(s.url));
        return [...prev, ...unique];
      });

      setNextCursor(next);
      setHasMore(!isTrending && !query && next !== null && list.length >= 40);

      // ─── 3. PROACTIVE PREFETCH (Broadcast Synchronization) ───
      if (next !== null && modeKey === 'explore') {
        const nextKey = `${modeKey}:${countryKey}:${next}`;
        if (!pageCache.current.has(nextKey)) {
          api.fetchStations(next, country).then(res => {
            if (res?.stations) {
              pageCache.current.set(nextKey, { 
                stations: res.stations, 
                nextCursor: res.next_cursor 
              });
            }
          }).catch(() => {});
        }
      }

    } catch (err: any) {
      if (currentFetchId === fetchId.current) {
        setError(err.message || 'Connection Lost — Broadcast Offline');
      }
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, [query, country, nextCursor, isTrending]);

  /* ─── Station Observers ─── */
  useEffect(() => {
    const sig = `${query}:${country}:${isTrending}`;
    if (sig === lastSignal.current) return;
    lastSignal.current = sig;
    load(false);
  }, [query, country, isTrending, load]);

  const fetchRandom = useCallback(() => {
    if (cooldown > 0) return;
    setIsTrending(false);
    setQuery('');
    setCountry('');
    setNextCursor(0);
    setCooldown(1);
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
  }, []);

  return {
    stations, countries, stats, loading, error,
    query, country, isTrending, nextCursor, hasMore, cooldown,
    search, filterByCountry, toggleTrending, fetchRandom, loadMore, reset,
  };
}

const getSearchKey = (q: string) => `search:${q.toLowerCase()}`;

