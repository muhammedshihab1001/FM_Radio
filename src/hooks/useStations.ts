import { useState, useEffect, useCallback, useRef } from 'react';
import { Station, Statistics, CountryNode } from '../types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;

// Cache Keys & TTLs (Per Spec)
const CACHE_COUNTRIES_KEY = 'ast_cache_countries';
const CACHE_STATS_KEY     = 'ast_cache_stats';
const TTL_COUNTRIES       = 600000; // 600 sec (10 min) per Final Spec
const TTL_STATS           = 60000;  // 60 sec (1 min)

interface FetchOptions {
  append?: boolean;
  resetCursor?: boolean;
}

export function useStations() {
  // StationDiscoveryMesh integrity maintained
  const [stations, setStations]   = useState<Station[]>([]);
  const [countries, setCountries] = useState<CountryNode[]>([]);
  const [stats, setStats]         = useState<Statistics | null>(null);
  
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string | null>(null);
  
  const [query, setQuery]         = useState<string>('');
  const [country, setCountry]     = useState<string>('');
  
  const [nextCursor, setNextCursor] = useState<string | number>(0);
  const [total, setTotal]         = useState<number | null>(null);
  const [hasMore, setHasMore]     = useState<boolean>(false);
  const [refreshPulse, setRefreshPulse] = useState<number>(0);
  const fetchId = useRef<number>(0);

  // Rate Limiting & Dedup
  const [cooldown, setCooldown]   = useState<number>(0); // seconds remaining
  const isFetching = useRef<boolean>(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── Cache Helpers ─── */
  const getCached = (key: string, ttl: number) => {
    try {
      const cachedStr = sessionStorage.getItem(key);
      const cached = cachedStr ? JSON.parse(cachedStr) : null;
      if (cached && (Date.now() - cached.timestamp) < ttl) {
        return cached.data;
      }
    } catch { return null; }
    return null;
  };

  const setCached = (key: string, data: any) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* session storage unavailable */ }
  };

  /* ─── Cooldown Timer ─── */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(v => v - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  /* ─── Staggered Industrial Boot Sequence ─── */
  useEffect(() => {
    // 1. Discovery (0ms) - Handled by Signal Observer
    
    // 2. Regional Nodes (500ms)
    const tCountries = setTimeout(() => {
      const cached = getCached(CACHE_COUNTRIES_KEY, TTL_COUNTRIES);
      if (cached) {
        setCountries(cached);
      } else {
        fetch(`${API}/countries`)
          .then(r => r.json())
          .then(json => {
            const list = Array.isArray(json.data) ? json.data : [];
            setCountries(list);
            if (list.length > 0) setCached(CACHE_COUNTRIES_KEY, list);
          })
          .catch(() => {});
      }
    }, 500);

    // 3. Network Stats (1000ms)
    const tStats = setTimeout(() => {
      const cached = getCached(CACHE_STATS_KEY, TTL_STATS);
      if (cached) {
        setStats(cached);
      } else {
        fetch(`${API}/stats`)
          .then(r => r.json())
          .then(json => {
            const statsData = json.data || null;
            setStats(statsData);
            if (statsData) setCached(CACHE_STATS_KEY, statsData);
          })
          .catch(() => {});
      }
    }, 1000);

    return () => {
      clearTimeout(tCountries);
      clearTimeout(tStats);
    };
  }, []); 

  /* ─── Handle Standardized Response Protocol ─── */
  const handleResponse = async (res: Response) => {
    if (res.status === 429) {
      setError('Frequency Congestion — Wait 10s.');
      setCooldown(10);
      return null;
    }
    const json = await res.json();
    if (json.success === false) {
      throw new Error(json.error || 'Signal Error');
    }
    return json;
  };

  /* ─── Core fetch ─── */
  const fetchStations = useCallback(async (opts: FetchOptions = {}) => {
    if (!API) return;
    const { append = false, resetCursor = false } = opts;
    
    if (isFetching.current && append) return;

    // Final Signal Protocol: Search Scanner strictly requires 3 chars (Min Length = 3)
    if (query && query.length < 3) {
      if (!append) setStations([]);
      setHasMore(false);
      return;
    }

    const currentFetchId = ++fetchId.current;
    const cursorToUse = resetCursor ? 0 : nextCursor;
    
    setLoading(true);
    if (!append) {
      setError(null);
      setStations([]); 
    }
    isFetching.current = true;

    try {
      let path = '/stations/random';
      const p = new URLSearchParams();

      // Industrial Signal Protocol: Standardized Endpoint Limits
      if (!query && !country) {
        path = '/stations/random';
        p.set('limit', '24'); // Max: 50
      } else if (query) {
        path = '/stations/search'; 
        p.set('q', query);
        p.set('last_id', String(cursorToUse));
        p.set('limit', '20'); // Rule: Max 20 results
      } else {
        path = '/stations';
        if (country) p.set('country', country);
        p.set('last_id', String(cursorToUse));
        p.set('limit', '24'); // Rule: Example pagination
      }
      const url = `${API}${path}?${p}`;
      const res = await fetch(url, path === '/stations/random' ? { cache: 'no-store' } : {});
      const data = await handleResponse(res);
      
      if (currentFetchId !== fetchId.current || !data) return;

      const payload = data.data;
      const isPagination = path === '/stations';
      const list: Station[] = isPagination ? (payload?.stations || []) : (Array.isArray(payload) ? payload : []);
      
      setStations(prev => {
        if (!append) return list;
        const existingUrls = new Set(prev.map(s => s.url));
        const uniqueNew = list.filter(s => !existingUrls.has(s.url));
        return [...prev, ...uniqueNew];
      });
      
      if (isPagination) {
        setNextCursor(payload?.next_cursor ?? null);
        setHasMore(payload?.next_cursor !== null && list.length >= 24);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (currentFetchId === fetchId.current) {
        setError('Signal lost — terminal offline.');
      }
    } finally {
      if (currentFetchId === fetchId.current) {
        setLoading(false);
        isFetching.current = false;
      }
    }
  }, [query, country, nextCursor]);

  const isFirstLoad = useRef(true);

  /* ─── Signal Observer: Auto-fetch on any signal change ─── */
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    fetchStations({ resetCursor: true });
  }, [query, country, refreshPulse, fetchStations]);

  /* ─── Shuffle (Pulse Trigger) - Rate Limit: 20req/10s ─── */
  const fetchRandom = useCallback(() => {
    if (cooldown > 0) return;
    // Instant reset for user feedback
    setStations([]);
    setNextCursor(0);
    setQuery('');
    setCountry('');
    setRefreshPulse(p => p + 1);
    setCooldown(1);
  }, [cooldown]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const sanitized = q.trim().replace(/[<>\\"'`;()]/g, '').slice(0, 100);
      setQuery(sanitized);
      setNextCursor(0);
    }, 400); 
  }, []);

  const filterByCountry = useCallback((c: string | null) => {
    setCountry(c === 'All Countries' || !c ? '' : c);
    setQuery(''); 
    setNextCursor(0);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchStations({ append: true });
    }
  }, [loading, hasMore, fetchStations]);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setCountry('');
    setNextCursor(0);
  }, []);

  return {
    stations, countries, stats, loading, error,
    query, country, nextCursor, total, hasMore, cooldown,
    search, filterByCountry, fetchRandom, loadMore, reset,
  };
}
