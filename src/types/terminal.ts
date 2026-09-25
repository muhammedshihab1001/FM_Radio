/** Where a station row came from: D1 rows carry only id/name/url/country/bitrate/codec. */
export type StationSource = 'db' | 'radio-browser';

/**
 * A station in either API shape. `id` is a number for D1 rows and "rb:<uuid>" for Radio Browser
 * rows — key lists with String(id) and send it back to the API exactly as received.
 * Everything below `url` is optional: D1 rows have no favicon, homepage, tags, language,
 * votes, clickcount or countrycode.
 */
export interface Station {
  id: string | number;
  name: string;
  url: string;
  country?: string;
  countrycode?: string;
  city?: string;
  bitrate?: number | string;
  codec?: string;
  genre?: string;
  favicon?: string;
  homepage?: string;
  tags?: string;
  language?: string;
  votes?: number;
  clickcount?: number;
  source?: StationSource;
}

/** GET /stations page. `next_cursor` is opaque; null means the end of the list. */
export interface StationPage {
  stations: Station[];
  next_cursor: string | number | null;
  /** 'fallback-cache' = stale data (everything else was down), 'none' = nothing available. */
  source?: StationSource | 'fallback-cache' | 'none';
  /** The Worker switched from D1 to Radio Browser mid-scroll; this page starts Radio Browser's list. */
  source_switched?: boolean;
  warning?: string;
  error?: string;
}

export interface Statistics {
  total_stations?: number;
  total_countries?: number;
  /** Only when source is 'radio-browser'. */
  total_tags?: number;
  total_languages?: number;
  source?: string;
  last_updated?: string;
  total?: number;
  active?: number;
  countries?: number;
  stations?: number;
  clicks?: number;
}

export interface CountryNode {
  country: string;
  count: number;
  /** ISO code — only present on Radio Browser rows. */
  code?: string;
}

export interface BrowseNode {
  name: string;
  count: number;
  /** Language code, when the API gives one. */
  code?: string;
}

export type TopMetric = 'votes' | 'clicks';

export interface StationFilters {
  q?: string;
  tag?: string;
  language?: string;
  codec?: string;
  bitrate_min?: number;
  order?: string;
  limit?: number;
}

export type PlayerStatus = 'idle' | 'connecting' | 'playing' | 'buffering' | 'error' | 'mixed-content' | 'stalled' | 'recovering';
