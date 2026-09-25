import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Never load the real .env: tests get fixed, fake values below.
  envDir: r('./tests/setup'),
  resolve: {
    alias: {
      'virtual:pwa-register/react': r('./tests/setup/pwa-register-mock.ts'),
    },
  },
  test: {
    environment: './tests/setup/jsdom-env.ts',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    env: {
      VITE_API_BASE_URL: 'https://api.test',
      VITE_ADMIN_USER: 'test-admin',
      VITE_ADMIN_PASS: 'test-pass',
      VITE_ADMIN_KEY: 'test-key',
    },
    // Full-app integration tests (boot + 30 cards + user-event) need headroom on slow CI runners.
    testTimeout: 20_000,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      // Kept under node_modules/.cache (already git-ignored).
      reportsDirectory: 'node_modules/.cache/coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/types/**'],
      reporter: ['text-summary', 'text', 'html', 'json-summary', 'lcov'],
      thresholds: {
        lines: 70,
        'src/utils/**': { lines: 85 },
        'src/services/**': { lines: 85 },
        'src/hooks/**': { lines: 80 },
      },
    },
  },
});
