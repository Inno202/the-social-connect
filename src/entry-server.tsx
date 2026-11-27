import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { STATIC_EVENTS } from './lib/data';
import { headFor } from './lib/seo';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** `url` is the route without the base path, e.g. "/events". */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={BASE + url} basename={BASE || undefined}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StaticRouter>,
  );
}

export const PUBLIC_ROUTES = ['/', '/about', '/events', '/gallery', '/vendors', '/terms', '/privacy', '/cookies', ...STATIC_EVENTS.map((e) => `/events/${e.id}`)];

/** Full site address with base path, no trailing slash (e.g. https://inno202.github.io/the-social-connect). */
export const SITE = (import.meta.env.VITE_SITE_ORIGIN || 'http://localhost:4173').replace(/\/$/, '') + BASE;
export const head = (route: string) => headFor(route, SITE);
