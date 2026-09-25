import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Resolved here, at config-build time: the generated service worker is a
  // standalone script (generateSW mode serializes runtimeCaching functions/
  // regexes by their literal source), so it cannot read import.meta.env or
  // close over a variable from this file at runtime. A RegExp's source is
  // plain data, so baking the real API origin into one here is the correct,
  // supported way to give the SW a rule that matches it.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  let apiOriginPattern = /^$/; // matches nothing if the env var is unset/invalid
  try {
    const origin = new URL(env.VITE_API_BASE_URL).origin;
    apiOriginPattern = new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  } catch {
    // No valid VITE_API_BASE_URL at build time — the app already shows its
    // own "not configured" screen for this; the SW just won't have an API
    // rule, which is safe (no rule = NetworkOnly by default, nothing cached).
  }

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the SW ourselves via the virtual:pwa-register/react hook
      // (in UpdateToast.tsx) so a real "Refresh" toast can be shown instead
      // of the plugin's default silent auto-reload. injectRegister: false
      // stops it from also injecting its own registration script.
      injectRegister: false,
      // Precache ONLY the built app shell — JS, CSS, HTML, fonts, icons.
      // Nothing audio-related is ever part of the build output, so this
      // can't accidentally sweep in a stream file.
      includeAssets: ['apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png'],
      manifest: {
        name: 'Nebula Cast FM',
        short_name: 'Nebula FM',
        description: 'Live radio from 189 countries, streamed straight from your phone or desktop.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#06060B',
        theme_color: '#06060B',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only — the default glob already excludes anything not in
        // the build output, but stated explicitly for clarity.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          // Radio streams and playlists: NEVER cached, NEVER intercepted by
          // anything the SW might otherwise do to a cross-origin GET. This is
          // the one rule that keeps playback correct — everything else in this
          // config is secondary to it.
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'audio' ||
              request.destination === 'video' ||
              /\.(mp3|aac|ogg|flac|opus|wav|m3u8?|pls|ts)(\?|$)/i.test(url.pathname) ||
              request.headers.has('range'),
            handler: 'NetworkOnly',
          },
          // The station directory API: always fresh, exactly like today — the
          // service worker must never decide what "offline data" looks like.
          {
            urlPattern: apiOriginPattern,
            handler: 'NetworkOnly',
          },
          // Google Fonts: stylesheet + font files, cached first since they're
          // versioned/immutable in practice.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: '/',
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: false },
  };
});
