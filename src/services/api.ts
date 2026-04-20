import { Station, Statistics, CountryNode } from '../types/terminal';

const API = import.meta.env.VITE_API_BASE_URL;
const REQ_TIMEOUT = 12000; // 12 seconds

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
      throw new Error('Signal Timeout — API Hub Unreachable');
    }
    throw error;
  }
}

export async function fetchStations(cursor: string | number = 0, country: string = '') {
  const p = new URLSearchParams();
  p.set('last_id', String(cursor));
  if (country) p.set('country', country);
  p.set('limit', '50');

  const res = await fetchWithTimeout(`${API}/stations?${p}`);
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Signal Format (Non-JSON)' }));
  
  if (!json.success) throw new Error(json.error || 'Signal Lost — Terminal Offline');
  return json.data; 
}

export async function fetchRandom() {
  const res = await fetchWithTimeout(`${API}/stations/random`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Signal Format (Non-JSON)' }));
  if (!json.success) throw new Error(json.error || 'Signal Lost — Terminal Offline');
  return json.data; 
}

export async function searchStations(q: string) {
  const res = await fetchWithTimeout(`${API}/stations/search?q=${encodeURIComponent(q)}&limit=50`);
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Signal Format (Non-JSON)' }));
  if (!json.success) throw new Error(json.error || 'Signal Lost — Terminal Offline');
  return json.data; 
}

export async function fetchTrending() {
  const res = await fetchWithTimeout(`${API}/stations/trending`);
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Signal Format (Non-JSON)' }));
  if (!json.success) throw new Error(json.error || 'Signal Lost — Terminal Offline');
  return json.data || [];
}

export async function fetchCountries(): Promise<CountryNode[]> {
  try {
    const res = await fetchWithTimeout(`${API}/countries`);
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function fetchStats(): Promise<Statistics | null> {
  try {
    const res = await fetchWithTimeout(`${API}/stats`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function trackClick(id: string | number) {
  try {
    fetch(`${API}/stations/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      keepalive: true
    });
  } catch (e) {
    console.warn('Click tracking deferred.');
  }
}

export async function fetchAdminStatus(key: string) {
  const res = await fetchWithTimeout(`${API}/admin/d1/status`, {
    headers: { 'x-admin-key': key }
  });
  const json = await res.json().catch(() => ({ success: false, error: 'Invalid Admin Signal' }));
  if (!json.success) throw new Error(json.error || 'Unauthorized Protocol Access');
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
