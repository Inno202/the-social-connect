import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { STATIC_EVENTS } from './lib/data';

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
