import { useState, useEffect, useCallback, useRef } from 'react';

const API = import.meta.env.VITE_API_BASE_URL;

export function useStations() {
  const [stations, setStations]   = useState([]);
  const [countries, setCountries] = useState([]);
  const [stats, setStats]         = useState(null);
  
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  
  const [query, setQuery]         = useState('');
  const [country, setCountry]     = useState('');
  
  const [nextCursor, setNextCursor] = useState(0);
  const [total, setTotal]         = useState(null);
  const [hasMore, setHasMore]     = useState(false);

  const debounceRef = useRef(null);

  /* ─── Fetch countries once ─── */
  useEffect(() => {
    fetch(`${API}/countries`)
      .then(r => r.ok ? r.json() : { countries: [] })
      .then(data => setCountries(Array.isArray(data.countries) ? data.countries : []))
      .catch(() => setCountries([]));
  }, []);

  /* ─── Fetch stats once ─── */
  useEffect(() => {
    fetch(`${API}/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => setStats(null));
  }, []);

  /* ─── Core fetch ─── */
  const fetchStations = useCallback(async (opts = {}) => {
    const { append = false, resetCursor = false } = opts;
    
    // For random endpoint, the param is 'cursor', for others it's 'last_id'
    const cursorToUse = resetCursor ? 0 : nextCursor;
    
    setLoading(true);
    if (!append) setError(null);

    try {
      let path = '/stations';
      const p = new URLSearchParams();

      if (!query && !country) {
        // 1. RANDOM (HOME PAGE)
        path = '/stations/random';
        // No cursor for random jump as per spec
      } else if (query && !country) {
        // 3. SEARCH
        path = '/stations/search'; 
        p.set('q', query);
        p.set('last_id', String(cursorToUse));
      } else {
        // 4. COUNTRY & 🔗 COMBINED
        path = '/stations';
        if (country) p.set('country', country);
        if (query) p.set('q', query);
        p.set('last_id', String(cursorToUse));
      }

      p.set('limit', '24');

      const url = `${API}${path}?${p}`;

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const list = data.stations ?? [];
      setStations(prev => append ? [...prev, ...list] : list);
      
      setTotal(data.total ?? null);
      
      // Support new Core API pagination wrapper or fallback to raw
      const incomingCursor = data.pagination?.next_cursor ?? data.next_cursor;
      
      setNextCursor(incomingCursor);

      // ─── Visibility Logic ───
      // If we are on Home Page (no filters), always allow "Load More" to get a fresh random batch.
      // Otherwise, depend on the API's pagination cursor.
      const isHome = !query && !country;
      setHasMore(isHome || (incomingCursor !== null && incomingCursor !== undefined && incomingCursor !== 0));
    } catch (err) {
      setError('Signal lost — terminal offline.');
    } finally {
      setLoading(false);
    }
  }, [query, country, nextCursor]);

  /* ─── Re-fetch whenever filters change ─── */
  useEffect(() => {
    fetchStations({ resetCursor: true });
  }, [query, country]); // eslint-disable-line

  /* ─── Dev-Triggered Random Fetch ─── */
  const fetchRandom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      setQuery('');
      setCountry('');
      
      const res = await fetch(`${API}/stations/random?cursor=0&limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      setStations(data.stations ?? data ?? []);
      setTotal(null);
      setNextCursor(0);
      setHasMore(false); // Disable infinite scroll for manual shuffle chunk
    } catch (err) {
      setError('Random scramble bypassed... network unstable.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── Filter Actions ─── */
  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Production Sanitization: Strip script tags, special chars etc.
      const sanitized = q.trim()
        .replace(/[<>\\"'`;()]/g, '') // Strip typical injection chars
        .slice(0, 100);             // Practical limit
      
      setQuery(sanitized);
      setNextCursor(0);
    }, 300);
  }, []);

  const filterByCountry = useCallback((c) => {
    setCountry(c === 'All Countries' ? '' : c);
    setQuery(''); // Reset query when switching country scope
    setNextCursor(0);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchStations({ append: true });
    }
  }, [loading, hasMore, fetchStations]);

  const reset = useCallback(() => {
    clearTimeout(debounceRef.current);
    setQuery('');
    setCountry('');
    setNextCursor(0);
  }, []);

  return {
    stations, countries, stats, loading, error,
    query, country, nextCursor, total, hasMore,
    search, filterByCountry, fetchRandom, loadMore, reset,
  };
}
