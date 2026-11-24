import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Hosts like GitHub Pages cannot send security headers, so the Content-Security-Policy goes in a
 * <meta> tag in production builds (firebase.json still sends it as a header if Firebase Hosting is used).
 */
function cspMeta(env: Record<string, string>): Plugin {
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost';
  const emu = env.VITE_USE_EMULATORS === 'true';
  const local = emu ? ' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*' : '';
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://apis.google.com https://www.gstatic.com https://www.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com",
    `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://${authDomain} https://api.cloudinary.com https://res.cloudinary.com https://www.google.com https://fonts.googleapis.com https://fonts.gstatic.com${local}`,
    `frame-src https://${authDomain} https://accounts.google.com https://www.google.com${emu ? ' http://127.0.0.1:* http://localhost:*' : ''}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(emu ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env } as Record<string, string>;
  // "/" locally and on a custom domain; "/<repository>/" on GitHub Pages (set by the deploy workflow).
  const base = env.VITE_BASE || '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      cspMeta(env),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        manifest: {
          name: 'MSB Events',
          short_name: 'MSB Events',
          description: 'Events, tickets and photos from MSB Events, Matjhabeng.',
          theme_color: '#0B0B0C',
          background_color: '#0B0B0C',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          // The app shell, the ticket pages and the posters are kept on the phone so tickets open without signal.
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
          globIgnores: ['**/brand/hero-*', 'posters/*.jpg', '404.html'],
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [/^\/__/],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://res.cloudinary.com',
              handler: 'CacheFirst',
              options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.includes('/brand/') || url.pathname.endsWith('.jpg'),
              handler: 'CacheFirst',
              options: { cacheName: 'local-images', expiration: { maxEntries: 60 } },
            },
          ],
        },
      }),
    ],
    server: { host: '127.0.0.1', port: 5173 },
    preview: { host: '127.0.0.1', port: 4173 },
    build: { chunkSizeWarningLimit: 900 },
  };
});
