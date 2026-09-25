// Deterministic fixture data shared by unit (MSW) and E2E (Playwright route) tests.
// Never touches the real API or real streams.
import type { Station, CountryNode, Statistics } from '../../src/types/terminal';

export const API_BASE = 'https://api.test';

/** Stream URLs served by the E2E fixture server (tests/e2e/fixtures/streams). */
export const STREAMS = {
  mp3: '/fixtures/streams/tone.mp3',
  hls: '/fixtures/streams/hls/index.m3u8',
  broken: '/fixtures/streams/does-not-exist.mp3',
  insecure: 'http://insecure.radio.test/live.mp3',
} as const;

const COUNTRIES = ['Estonia', 'Germany', 'Japan', 'Egypt', 'Brazil', 'United States', 'France', 'India'] as const;

const SPECIAL_NAMES: Partial<Station>[] = [
  { name: 'إذاعة القرآن الكريم', country: 'Egypt', city: 'القاهرة', codec: 'MP3', bitrate: 128 },
  { name: '東京 ジャズ FM 放送局', country: 'Japan', city: '東京', codec: 'AAC', bitrate: 192 },
  { name: '🎷 Smooth Jazz 24/7 🌙', country: 'United States', codec: 'MP3', bitrate: 256, genre: 'jazz' },
  {
    name: 'Radio Station With An Extraordinarily Long Name That Keeps Going Well Past Any Sensible Card Width FM',
    country: 'Germany',
    city: 'Berlin-Charlottenburg-Wilmersdorf',
    codec: 'AAC+',
    bitrate: 320,
  },
  { name: '北京音乐广播', country: 'China', codec: 'AAC', bitrate: 64 },
  { name: 'Rádio Brasil Açaí ção', country: 'Brazil', city: 'São Paulo', codec: 'MP3', bitrate: 128 },
];

export function makeStation(i: number, overrides: Partial<Station> = {}): Station {
  const special = SPECIAL_NAMES[i];
  return {
    id: 1000 + i,
    name: `Fixture Radio ${i + 1}`,
    url: `https://streams.radio.test/station-${i + 1}.mp3`,
    country: COUNTRIES[i % COUNTRIES.length],
    bitrate: [64, 96, 128, 192, 256, 320][i % 6],
    codec: ['MP3', 'AAC', 'AAC+', 'OGG'][i % 4],
    votes: 500 - i,
    clickcount: 1000 - i * 7,
    ...special,
    ...overrides,
  };
}

/** 60 stations: varied countries, long names, Arabic, CJK and emoji names. */
export const STATIONS: Station[] = Array.from({ length: 60 }, (_, i) => makeStation(i));

export const ESTONIA: Station[] = Array.from({ length: 30 }, (_, i) =>
  makeStation(100 + i, { name: `Eesti Raadio ${i + 1}`, country: 'Estonia', city: i % 2 ? 'Tallinn' : 'Tartu' }),
);

export const COUNTRY_LIST: CountryNode[] = [
  { country: 'Global', count: 363000 },
  { country: 'Estonia', count: 48 },
  { country: 'Germany', count: 5400 },
  { country: 'Japan', count: 900 },
  { country: 'Egypt', count: 210 },
  { country: 'Brazil', count: 3100 },
  { country: 'United States', count: 9800 },
  { country: 'France', count: 2600 },
  { country: 'India', count: 1200 },
];

export const STATS: Statistics = { total_stations: 872268, total_countries: 189 };

export const envelope = <T>(data: T) => ({ success: true, data });
