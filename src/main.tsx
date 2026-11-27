import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
// Fonts are served from this site (not Google), latin letters only, so pages load faster and no visitor details go to a font host.
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-800-italic.css';
import './index.css';

// Stop the site being framed by other sites where the host cannot send headers.
if (window.top !== window.self) {
  try { window.top!.location.href = window.self.location.href; } catch { document.body.innerHTML = ''; }
}

const root = document.getElementById('root')!;
// Pre-rendered pages are replaced (not hydrated) so live data never fights the static copy. The static copy stays on
// screen (and its images keep loading) until React's first render swaps it out, so the page never flashes empty.
createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined);
  });
}
