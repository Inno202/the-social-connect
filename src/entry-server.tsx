import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { STATIC_EVENTS } from './lib/data';

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StaticRouter>,
  );
}

export const PUBLIC_ROUTES = ['/', '/about', '/events', '/gallery', '/terms', '/privacy', '/cookies', ...STATIC_EVENTS.map((e) => `/events/${e.id}`)];
