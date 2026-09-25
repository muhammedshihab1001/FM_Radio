import { Station, Statistics, CountryNode, BrowseNode, TopMetric, StationFilters, StationPage } from '../types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;
const REQ_TIMEOUT = 12000; // 12 seconds
const NON_JSON = { success: false, error: 'Invalid Signal Format (Non-JSON)' };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQ_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Signal Timeout — Network Hub Unreachable');
    }
    throw error;
  }
}

// Every Worker response is { success: true, data } or { success: false, error } with a 4xx/5xx status.
async function unwrap(res: Response, fallback = 'Signal Lost — Global Network Offline') {
  const json = await res.json().catch(() => NON_JSON);
  if (!json.success) {
    const message = json.error || fallback;
    // 20 requests / 10 s per IP.
    throw new Error(res.status === 429 ? `Rate limited (429): ${message}` : message);
  }
  return json.data;
}

async function getData(path: string, init?: RequestInit) {
  return unwrap(await fetchWithTimeout(`${API}${path}`, init));
}

// Lists are plain arrays; tolerate the { stations } page shape too.
const toStationList = (data: any): Station[] =>
  Array.isArray(data) ? data : Array.isArray(data?.stations) ? data.stations : [];

/**
 * GET /stations — one page. `cursor` is opaque ("12345" for D1, "rb:48" for Radio Browser):
 * pass `next_cursor` back exactly as received; 0 / empty means the first page.
 * `source_switched` means the Worker moved from D1 to Radio Browser mid-scroll, so this page
 * starts Radio Browser's list from the top.
 */
export async function fetchStations(cursor: string | number = 0, country: string = ''): Promise<StationPage> {
  const p = new URLSearchParams();
  if (cursor !== 0 && cursor !== '' && cursor !== '0') {
    p.set('cursor', String(cursor));
    // The deployed Worker still pages on `last_id` only (with `cursor` alone it returns page 1 again);
    // the new contract accepts either, so send both until every deployment reads `cursor`.
    p.set('last_id', String(cursor));
  }
  if (country) p.set('country', country);
  p.set('limit', '50');

  const data = await getData(`/stations?${p}`);
  const page: StationPage = {
    ...data,
    stations: toStationList(data),
    next_cursor: data?.next_cursor ?? null,
  };
  if (page.source === 'fallback-cache' && !page.warning) {
    page.warning = 'Showing saved stations — the live directory is unavailable right now.';
  }
  return page;
}

/** GET /stations/random — a fresh random batch each call (API default 24, max 50). */
export async function fetchRandom(limit?: number): Promise<Station[]> {
  const q = limit === undefined ? '' : `?limit=${clamp(limit, 1, 50)}`;
  // API returns a plain array normally, or { stations: [], next_cursor: null } on quota fallback.
  return toStationList(await getData(`/stations/random${q}`, { cache: 'no-store' }));
}

/** GET /stations/search by name prefix (3+ characters). Results may be either station shape. */
// Returned untyped on purpose: useStations keeps pages and plain lists in one variable and
// narrows with Array.isArray itself.
export async function searchStations(q: string): Promise<any> {
  return toStationList(await getData(`/stations/search?q=${encodeURIComponent(q)}&limit=50`));
}

// Browse rows: /tags → { tag }, /languages → { language, code }, /codecs → { codec },
// Radio Browser → { name, stationcount }.
const toBrowseList = (data: any): BrowseNode[] =>
  (Array.isArray(data) ? data : [])
    .map((n: any): BrowseNode => {
      const node: BrowseNode = {
        name: String(n?.name ?? n?.tag ?? n?.language ?? n?.codec ?? ''),
        count: Number(n?.count ?? n?.stationcount ?? 0),
      };
      if (n?.code) node.code = String(n.code);
      return node;
    })
    .filter((n: BrowseNode) => n.name);

/**
 * GET /stations/search with filters. `tag` / `language` force Radio Browser results;
 * `order` is only accepted alongside them, and a bare `q` needs 3+ characters.
 */
export async function searchStationsFiltered(filters: StationFilters): Promise<Station[]> {
  const rbOnly = Boolean(filters.tag || filters.language);
  if (!rbOnly && (filters.q?.trim().length ?? 0) < 3) return [];

  const params: StationFilters = {
    ...filters,
    q: filters.q?.trim() || undefined,
    order: rbOnly ? filters.order : undefined,
    bitrate_min: filters.bitrate_min === undefined ? undefined : clamp(filters.bitrate_min, 0, 1000),
    limit: clamp(filters.limit ?? 50, 1, 50),
  };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return toStationList(await getData(`/stations/search?${p}`));
}

/** GET /stations/top — Radio Browser's global top list by votes or clicks. */
export async function fetchTopStations(by: TopMetric = 'votes', limit = 50): Promise<Station[]> {
  return toStationList(await getData(`/stations/top?by=${by}&limit=${clamp(limit, 1, 50)}`));
}

/** GET /station?id= — the id is passed back exactly as given (number or "rb:<uuid>"). */
export async function fetchStationById(id: string | number): Promise<Station | null> {
  try {
    const data = await getData(`/station?id=${encodeURIComponent(String(id))}`);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function fetchBrowseList(path: string): Promise<BrowseNode[]> {
  try {
    return toBrowseList(await getData(path));
  } catch {
    return [];
  }
}

/** GET /tags — `limit` is clamped 1–300 (omit for the API default). */
export const fetchTags = (limit?: number) =>
  fetchBrowseList(limit === undefined ? '/tags' : `/tags?limit=${clamp(limit, 1, 300)}`);
/** GET /languages and /codecs always return the full list. */
export const fetchLanguages = () => fetchBrowseList('/languages');
export const fetchCodecs = () => fetchBrowseList('/codecs');

// Streams that answered `supported: false` can never give a title; don't ask again.
const noTitleStreams = new Set<string>();

/** GET /nowplaying — the live title, or null. Edge-cached 20 s, so polling every 15–30 s is fine. */
export async function fetchNowPlaying(streamUrl: string): Promise<string | null> {
  if (noTitleStreams.has(streamUrl)) return null;
  try {
    const data = await getData(`/nowplaying?url=${encodeURIComponent(streamUrl)}`, { cache: 'no-store' });
    if (data && typeof data === 'object' && data.supported === false) noTitleStreams.add(streamUrl);
    const title = typeof data === 'string' ? data : data?.title ?? data?.song ?? null;
    return title ? String(title) : null;
  } catch {
    return null;
  }
}

/** GET /stations/trending — ranked by this app's own click data. */
export async function fetchTrending(): Promise<Station[]> {
  const res = await fetchWithTimeout(`${API}/stations/trending`);
  return toStationList(await unwrap(res, 'Signal Lost — Terminal Offline'));
}

/** GET /countries — `code` is present only for Radio Browser rows. */
export async function fetchCountries(): Promise<CountryNode[]> {
  try {
    const data = await getData('/countries');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchStats(): Promise<Statistics | null> {
  try {
    return (await getData('/stats')) ?? null;
  } catch {
    return null;
  }
}

/** POST /stations/click — fire-and-forget; buffered server-side, never awaited by the UI. */
export async function trackClick(id: string | number) {
  try {
    await fetch(`${API}/stations/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: String(id) }),
      keepalive: true
    });
  } catch {
    console.warn('Click tracking deferred.');
  }
}

export async function fetchAdminStatus(key: string) {
  const res = await fetchWithTimeout(`${API}/admin/d1/status`, {
    headers: { 'x-admin-key': key }
  });
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Admin Signal' }));
  if (!json.success) throw new Error(json.error || 'Unauthorized Administrative Protocol Access');
  return json.data;
}

export async function addDeadStream(url: string, key: string) {
  const res = await fetchWithTimeout(`${API}/admin/dead/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ url })
  });
  return res.json();
}

export async function restoreStream(url: string, key: string) {
  const res = await fetchWithTimeout(`${API}/admin/dead/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ url })
  });
  return res.json();
}

export async function cleanupDeadStreams(key: string) {
  const res = await fetchWithTimeout(`${API}/admin/dead/cleanup`, {
    method: 'POST',
    headers: { 'x-admin-key': key }
  });
  return res.json();
}

export async function resetD1Counter(key: string) {
  const res = await fetchWithTimeout(`${API}/admin/d1/reset`, {
    headers: { 'x-admin-key': key }
  });
  return res.json();
}
