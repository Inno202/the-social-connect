// Scripted offline check against the production build (service worker on) and the local emulators.
// Run: VITE_USE_EMULATORS=true npm run build && npx vite preview --port 4173 & node tests/e2e/offline-check.mjs
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4173';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) process.exitCode = 1; };

async function signIn(page, email, next) {
  await page.goto(`${BASE}/account?next=${next}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('msb-test-pass');
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'));
}

// 1. A customer's tickets open without signal.
const buyer = await b.newContext();
const p = await buyer.newPage();
await signIn(p, 'finance@msb.test', '/cart');
await p.evaluate(() => localStorage.setItem('msb-cart-v1', JSON.stringify([{ eventId: 'demo-test-activation-2026', typeId: 'free', qty: 1 }])));
await p.goto(`${BASE}/checkout`);
await p.getByLabel('Everyone on these tickets is 18 or older.').check();
await p.getByLabel(/I accept the/).check();
await p.getByRole('button', { name: 'Continue' }).click();
await p.getByRole('button', { name: 'Get my free tickets' }).click();
await p.getByRole('link', { name: 'View my tickets' }).click();
await p.locator('main ul li button').first().waitFor();
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload();
await p.locator('main ul li button').first().click();
const code = (await p.locator('dialog[open]').locator('dd.font-mono').textContent()).trim();
ok(Boolean(await p.evaluate(() => navigator.serviceWorker.controller)), 'service worker controls the page');
await buyer.setOffline(true);
await p.reload();
await p.locator('main ul li button').first().waitFor({ timeout: 15000 });
ok(await p.getByText('Test Activation (demo event)').first().isVisible(), 'My tickets reloads and shows the ticket with no network');
await p.locator('main ul li button').first().click();
ok(await p.locator('dialog[open]').getByRole('img', { name: 'Ticket QR code' }).isVisible(), 'the QR code shows offline');

// 2. The door scanner keeps working without signal and syncs later.
const door = await b.newContext();
const s = await door.newPage();
await signIn(s, 'scanner@msb.test', '/scan');
await s.goto(`${BASE}/scan`);
await s.locator('#scan-event').selectOption('demo-test-activation-2026');
await s.getByText(/\d+ in · \d+ tickets/).waitFor();
await s.getByRole('button', { name: 'Type' }).click();
await door.setOffline(true);
await s.getByLabel('Ticket code').fill(code);
await s.getByRole('button', { name: 'Check ticket' }).click();
const r = s.getByTestId('scan-result');
await r.waitFor();
ok((await r.getAttribute('data-ok')) === 'true', 'offline: ticket admitted from the saved list');
ok(await s.getByText('No signal').isVisible(), 'offline notice shows');
await s.waitForTimeout(3500);
await s.getByLabel('Ticket code').fill(code);
await s.getByRole('button', { name: 'Check ticket' }).click();
await r.waitFor();
ok((await r.textContent()).includes('Already scanned'), 'offline: second scan of the same ticket refused');
await door.setOffline(false);
await s.waitForTimeout(4000);
await buyer.setOffline(false);
await p.goto(`${BASE}/tickets`);
await p.getByText('Used').first().waitFor({ timeout: 15000 }).then(() => ok(true, 'scan synced after signal returned (ticket shows Used)'), () => ok(false, 'scan synced after signal returned'));
await b.close();
