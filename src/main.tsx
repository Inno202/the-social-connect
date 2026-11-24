import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

// Stop the site being framed by other sites where the host cannot send headers.
if (window.top !== window.self) {
  try { window.top!.location.href = window.self.location.href; } catch { document.body.innerHTML = ''; }
}

const root = document.getElementById('root')!;
// Pre-rendered pages are replaced (not hydrated) so live data never fights the static copy.
root.innerHTML = '';
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
