// Scans the built bundle for secrets. Exits 1 if any is found.
//   node scripts/check-secrets.mjs [distDir]
// Values of VITE_ADMIN_* are read from the environment / .env (via Vite's loadEnv)
// and only reported as found / not found — never printed.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const dist = process.argv[2] ?? 'dist';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const secretNames = ['VITE_ADMIN_USER', 'VITE_ADMIN_PASS', 'VITE_ADMIN_KEY'];
const patterns = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['Stripe live key', /sk_live_[0-9a-zA-Z]{16,}/],
  ['GitHub token', /gh[pousr]_[0-9A-Za-z]{30,}/],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{10,}/],
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|css|html|json|webmanifest|map)$/.test(name)) files.push(p);
  }
};
walk(dist);
const text = files.map((f) => [f, readFileSync(f, 'utf8')]);

let leaks = 0;
for (const name of secretNames) {
  const value = env[name];
  if (!value || value.length < 3) {
    console.log(`${name}: not set — skipped`);
    continue;
  }
  const hits = text.filter(([, t]) => t.includes(value)).map(([f]) => f);
  console.log(`${name}: ${hits.length ? `FOUND in ${hits.join(', ')}` : 'not in bundle'}`);
  leaks += hits.length ? 1 : 0;
}
for (const [label, re] of patterns) {
  const hits = text.filter(([, t]) => re.test(t)).map(([f]) => f);
  if (hits.length) {
    console.log(`${label}: FOUND in ${hits.join(', ')}`);
    leaks += 1;
  }
}
console.log(leaks ? `\n${leaks} secret(s) shipped to the browser.` : '\nNo secrets found in the bundle.');
process.exit(leaks ? 1 : 0);
