import { useState, useEffect, useCallback, useRef } from 'react';
import { Station, Statistics, CountryNode } from '../types/terminal';
import * as api from '../services/api';

// Cache Keys & TTLs
const CACHE_COUNTRIES_KEY = 'ast_cache_countries';
const CACHE_STATS_KEY     = 'ast_cache_stats';
const TTL_COUNTRIES       = 600000; // 10 min
const TTL_STATS           = 60000;  // 1 min
const TTL_RANDOM          = 30000;  // 30 sec (PROMPT 2)

export function useStations() {
  const [stations, setStations]   = useState<Station[]>([]);
  const [countries, setCountries] = useState<CountryNode[]>([]);
  const [stats, setStats]         = useState<Statistics | null>(null);
  
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string | null>(null);
  const [query, setQuery]         = useState<string>('');
  const [country, setCountry]     = useState<string>('');
  const [isTrending, setIsTrending] = useState<boolean>(false);
  
  const [nextCursor, setNextCursor] = useState<string | number>(0);
  const [hasMore, setHasMore]     = useState<boolean>(false);
  const [cooldown, setCooldown]   = useState<number>(0);

  // Multi-Layer Memory Cache
  const pageCache = useRef(new Map<string, Station[]>());
  const searchCache = useRef(new Map<string, Station[]>());
  const randomCache = useRef<{ data: Station[], timestamp: number } | null>(null);
  
  const fetchId = useRef<number>(0);
  const isFetching = useRef<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSignal = useRef<string>('');

  /* ─── Cache Helpers ─── */
  const getPersistentCached = (key: string, ttl: number) => {
    try {
      const cachedStr = sessionStorage.getItem(key);
      const cached = cachedStr ? JSON.parse(cachedStr) : null;
      if (cached && (Date.now() - cached.timestamp) < ttl) return cached.data;
    } catch { return null; }
    return null;
  };

  const setPersistentCached = (key: string, data: any) => {
    try { sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
  };

  /* ─── Cooldown Timer ─── */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(v => v - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /* ─── API Boot Sequence ─── */
  useEffect(() => {
    const cachedCountries = getPersistentCached(CACHE_COUNTRIES_KEY, TTL_COUNTRIES);
    if (cachedCountries) setCountries(cachedCountries);
    else {
      api.fetchCountries().then(list => {
        setCountries(list);
        if (list.length > 0) setPersistentCached(CACHE_COUNTRIES_KEY, list);
      }).catch(() => {});
    }

    const cachedStats = getPersistentCached(CACHE_STATS_KEY, TTL_STATS);
    if (cachedStats) setStats(cachedStats);
    else {
      api.fetchStats().then(s => {
        setStats(s);
        if (s) setPersistentCached(CACHE_STATS_KEY, s);
      }).catch(() => {});
    }
  }, []);

  /* ─── Background Prefetch System ─── */
  useEffect(() => {
    if (!nextCursor || loading || query || isTrending) return;
    
    const prefetchKey = `${country}:${nextCursor}`;
    if (pageCache.current.has(prefetchKey)) return;

    const t = setTimeout(() => {
      api.fetchStations(nextCursor, country).then(res => {
        if (res?.stations) pageCache.current.set(prefetchKey, res.stations);
      }).catch(() => {});
    }, 800) as unknown as number;

    return () => clearTimeout(t);
  }, [nextCursor, country, loading, query, isTrending]);

  /* ─── Global Load Logic (Hardened) ─── */
  const load = useCallback(async (append = false) => {
    if (isFetching.current && append) return;
    
    // PROMPT 3: Search Safety
    if (query && query.length < 3) {
      if (!append) setStations([]);
      setHasMore(false);
      return;
    }

    const currentFetchId = ++fetchId.current;
    // PROMPT 5: Cursor Safety (Propagated)
    const cursorToUse = append ? nextCursor : 0;
    
    const signalKey = isTrending ? 'trending' : (query ? `q:${query}` : `${country || 'intl'}`);
    const cacheKey = `${signalKey}:${cursorToUse}`;

    // PROMPT 1: Duplicate Prevention (Memory Cache Exit)
    const activeCache = query ? searchCache.current : pageCache.current;
    if (activeCache.has(cacheKey) && !append) {
      setStations(activeCache.get(cacheKey)!);
      setLoading(false);
      setHasMore(!query && !isTrending); // Trending/Search are flat in this implementation
      return; // EXIT EARLY - NO NETWORK HANDSHAKE
    }

    setLoading(true);
    if (!append) {
      setError(null);
      setStations([]); 
    }
    isFetching.current = true;

    try {
      let result;
      
      // PROMPT 4: Trending Integration
      if (isTrending) {
        result = await api.fetchTrending();
      } 
      // PROMPT 2: Random Pulse Throttle
      else if (!query && !country && cursorToUse === 0) {
        if (randomCache.current && (Date.now() - randomCache.current.timestamp) < TTL_RANDOM) {
          result = { stations: randomCache.current.data, next_cursor: 0 };
        } else {
          const stations = await api.fetchRandom();
          randomCache.current = { data: stations, timestamp: Date.now() };
          result = { stations, next_cursor: 0 };
        }
      } else if (query) {
        result = await api.searchStations(query);
      } else {
        result = await api.fetchStations(cursorToUse, country);
      }

      if (currentFetchId !== fetchId.current || !result) return;

      const list = Array.isArray(result) ? result : (result.stations || []);
      const next = result.next_cursor ?? null;

      // Update Cache
      activeCache.set(cacheKey, list);

      setStations(prev => {
        if (!append) return list;
        const existingUrls = new Set(prev.map(s => s.url));
        const uniqueNew = list.filter((s: Station) => !existingUrls.has(s.url));
        return [...prev, ...uniqueNew];
      });

      setNextCursor(next);
      setHasMore(!isTrending && !query && next !== null && list.length >= 20);
      
    } catch (err) {
      if (currentFetchId === fetchId.current) {
        setError('Signal terminal failure — attempting re-link.');
      }
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, [query, country, nextCursor, isTrending]);

  /* ─── Signal Observers ─── */
  useEffect(() => {
    // Prevent redundant triggers if signal didn't actually change
    const sig = `${query}:${country}:${isTrending}`;
    if (sig === lastSignal.current) return;
    lastSignal.current = sig;
    
    load(false);
  }, [query, country, isTrending, load]);

  const fetchRandom = useCallback(() => {
    if (cooldown > 0) return;
    setIsTrending(false);
    setStations([]);
    setNextCursor(0);
    setQuery('');
    setCountry('');
    setCooldown(1);
  }, [cooldown]);

  const toggleTrending = useCallback(() => {
    setIsTrending(prev => !prev);
    setQuery('');
    setCountry('');
    setNextCursor(0);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sanitized = q.trim().replace(/[<>\\"'`;()]/g, '').slice(0, 100);
      if (sanitized === query) return; // PROMPT 3: No repeated identical queries
      setIsTrending(false);
      setQuery(sanitized);
      setNextCursor(0);
    }, 400); // PROMPT 3: Debounce 400ms
  }, [query]);

  const filterByCountry = useCallback((c: string | null) => {
    setIsTrending(false);
    setCountry(c === 'All Countries' || !c ? '' : c);
    setQuery(''); 
    setNextCursor(0);
  }, []);

  const loadMore = useCallback(() => {
    // PROMPT 1: Guarded by loading + hasMore
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
