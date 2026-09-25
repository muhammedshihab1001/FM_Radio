// Local production-like server for Lighthouse CI: serves a build of the app and
// answers /api/* from the test fixtures, so audits never touch the real API.
//   node scripts/mock-server.mjs [--build] [--port 4180]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4180;
const outDir = resolve('node_modules/.lhci-dist');

if (args.includes('--build')) {
  Object.assign(process.env, {
    VITE_API_BASE_URL: `http://localhost:${port}/api`,
    VITE_ADMIN_USER: 'lhci-user',
    VITE_ADMIN_PASS: 'lhci-pass',
    VITE_ADMIN_KEY: 'lhci-key',
  });
  const { build } = await import('vite');
  await build({ logLevel: 'warn', build: { outDir, emptyOutDir: true } });
}

// Node strips the fixture file's TypeScript types on import.
const { ESTONIA, STATIONS, COUNTRY_LIST, STATS } = await import('../tests/fixtures/stations.ts');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};
const ok = (data) => JSON.stringify({ success: true, data });

function api(path, query) {
  switch (path) {
    case '/stations': {
      const list = query.get('country') === 'Estonia' ? ESTONIA : STATIONS;
      return ok({ stations: list.slice(0, Number(query.get('limit') ?? 50)), next_cursor: null });
    }
    case '/stations/search':
      return ok(STATIONS.filter((s) => s.name.toLowerCase().includes((query.get('q') ?? '').toLowerCase())));
    case '/stations/random':
      return ok(STATIONS.slice(20, 44));
    case '/stations/trending':
      return ok(STATIONS.slice(0, 12));
    case '/countries':
      return ok(COUNTRY_LIST);
    case '/stats':
      return ok(STATS);
    case '/stations/click':
      return JSON.stringify({ success: true });
    default:
      return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) {
    const body = api(url.pathname.slice(4), url.searchParams);
    res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
    return res.end(body ?? JSON.stringify({ success: false, error: 'Not found' }));
  }
  let file = join(outDir, decodeURIComponent(url.pathname));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(outDir, 'index.html'); // SPA fallback
  }
  try {
    let data = await readFile(file);
    const immutable = url.pathname.startsWith('/assets/');
    const headers = {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    // Compress text like Vercel does (brotli, else gzip), so transfer sizes are realistic.
    const accept = String(req.headers['accept-encoding'] ?? '');
    if (/\.(js|css|html|json|webmanifest|svg)$/.test(file)) {
      if (accept.includes('br')) [data, headers['content-encoding']] = [brotliCompressSync(data), 'br'];
      else if (accept.includes('gzip')) [data, headers['content-encoding']] = [gzipSync(data), 'gzip'];
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => console.log(`mock server listening on http://localhost:${port}`));
