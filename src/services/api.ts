import { Station, Statistics, CountryNode } from '../types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;

export async function fetchStations(cursor: string | number = 0, country: string = '') {
  const p = new URLSearchParams();
  p.set('last_id', String(cursor));
  if (country) p.set('country', country);
  p.set('limit', '24');

  const res = await fetch(`${API}/stations?${p}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Signal Error');
  return json.data; // { stations, next_cursor }
}

export async function fetchRandom() {
  const res = await fetch(`${API}/stations/random`, { cache: 'no-store' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Signal Error');
  return json.data; // Array of stations
}

export async function searchStations(q: string) {
  const res = await fetch(`${API}/stations/search?q=${encodeURIComponent(q)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Signal Error');
  return json.data; // Array of stations
}

export async function fetchTrending() {
  const res = await fetch(`${API}/stations/trending`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchCountries(): Promise<CountryNode[]> {
  const res = await fetch(`${API}/countries`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchStats(): Promise<Statistics | null> {
  const res = await fetch(`${API}/stats`);
  const json = await res.json();
  return json.data || null;
}

/**
 * Trending Click Tracking
 */
export async function trackClick(id: string | number) {
  try {
    await fetch(`${API}/stations/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  } catch (e) {
    console.warn('Click tracking failed offline.');
  }
}

/**
 * Admin: Stream Management
 */
export async function addDeadStream(url: string, key: string) {
  const res = await fetch(`${API}/admin/dead/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key
    },
    body: JSON.stringify({ url })
  });
  return res.json();
}

export async function restoreStream(url: string, key: string) {
  const res = await fetch(`${API}/admin/dead/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key
    },
    body: JSON.stringify({ url })
  });
  return res.json();
}

export async function cleanupDeadStreams(key: string) {
  const res = await fetch(`${API}/admin/dead/cleanup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key
    }
  });
  return res.json();
}
