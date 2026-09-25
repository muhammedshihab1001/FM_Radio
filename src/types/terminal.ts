export interface Station {
  id: string | number;
  name: string;
  url: string;
  country?: string;
  city?: string;
  bitrate?: number | string;
  codec?: string;
  genre?: string;
  votes?: number;
  clickcount?: number;
}

export interface Statistics {
  total_stations?: number;
  total_countries?: number;
  total?: number;
  active?: number;
  countries?: number;
  stations?: number;
  clicks?: number;
}

export interface CountryNode {
  country: string;
  count: number;
}

export type PlayerStatus = 'idle' | 'connecting' | 'playing' | 'buffering' | 'error' | 'mixed-content' | 'stalled' | 'recovering';

export interface BroadcastState {
  stations: Station[];
  loading: boolean;
  error: string | null;
  warning: string | null;
  query: string;
  country: string;
  nextCursor: number | string;
  total: number | null;
  hasMore: boolean;
  cooldown: number;
}
