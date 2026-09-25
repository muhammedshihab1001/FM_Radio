import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE, COUNTRY_LIST, ESTONIA, STATIONS, STATS, envelope } from '../fixtures/stations';
import type { Station } from '../../src/types/terminal';

export const api = (path: string) => `${API_BASE}${path}`;

/** Keyset pagination over `list`, mirroring the deployed Worker: it reads only `last_id` (ids greater than it). */
export function page(list: Station[], url: URL) {
  const cursor = Number(url.searchParams.get('last_id') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const rest = list.filter((s) => Number(s.id) > cursor);
  const stations = rest.slice(0, limit);
  const last = stations[stations.length - 1];
  return { stations, next_cursor: rest.length > limit && last ? Number(last.id) : null };
}

export const byCountry = (country: string | null) =>
  country === 'Estonia' ? ESTONIA : STATIONS.filter((s) => !country || s.country === country);

/** Every request the app makes is spied on here, so tests can assert on the calls. */
export const calls: URL[] = [];

/** A recorded GET override that answers with `{ success: true, data }`. */
export const respond = (path: string, data: unknown) =>
  http.get(api(path), ({ request }) => {
    calls.push(new URL(request.url));
    return HttpResponse.json(envelope(data));
  });

export const handlers = [
  http.get(api('/stations'), ({ request }) => {
    const url = new URL(request.url);
    calls.push(url);
    return HttpResponse.json(envelope(page(byCountry(url.searchParams.get('country')), url)));
  }),
  http.get(api('/stations/search'), ({ request }) => {
    const url = new URL(request.url);
    calls.push(url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return HttpResponse.json(envelope(STATIONS.filter((s) => s.name.toLowerCase().includes(q))));
  }),
  http.get(api('/stations/random'), ({ request }) => {
    calls.push(new URL(request.url));
    return HttpResponse.json(envelope(STATIONS.slice(20, 44)));
  }),
  http.get(api('/stations/trending'), ({ request }) => {
    calls.push(new URL(request.url));
    return HttpResponse.json(envelope(STATIONS.slice(0, 12)));
  }),
  http.get(api('/countries'), () => HttpResponse.json(envelope(COUNTRY_LIST))),
  http.get(api('/stats'), () => HttpResponse.json(envelope(STATS))),
  http.post(api('/stations/click'), () => HttpResponse.json({ success: true })),
  http.get(api('/admin/d1/status'), ({ request }) =>
    request.headers.get('x-admin-key') === 'test-key'
      ? HttpResponse.json(
          envelope({ reads_today: 1200, limit: 5000, remaining: 3800, percentage: '24.0', can_query: true }),
        )
      : HttpResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  ),
];

export const server = setupServer(...handlers);
