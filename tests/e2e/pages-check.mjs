// Smoke test of the GitHub Pages build (sub-path, 404 fallback, CSP meta) against the local emulators.
// Build: VITE_BASE=/the-social-connect/ VITE_USE_EMULATORS=true npm run build
// Serve: node scripts/pages-server.mjs /the-social-connect/ 4174     Then: node tests/e2e/pages-check.mjs
import { chromium } from 'playwright';
const ROOT = 'http://127.0.0.1:4174/the-social-connect';
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) process.exitCode = 1; };
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of 404/.test(m.text())) problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(e.message));
page.on('response', (r) => { if (r.status() === 404 && !r.request().isNavigationRequest()) problems.push(`404 ${r.url()}`); });

for (const path of ['/', '/events', '/events/spring-blow-2026', '/gallery', '/about', '/terms']) {
  await page.goto(ROOT + path);
  await page.waitForTimeout(1500);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
  await page.waitForTimeout(800);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  ok(broken.length === 0, `${path}: all images load ${broken.join(' ')}`);
}
// Deep links that only exist in the app come through 404.html
await page.goto(`${ROOT}/events/demo-test-night-2026/tickets`);
await page.getByText('2nd release').waitFor({ timeout: 15000 }).then(() => ok(true, 'deep link to a tickets page opens through 404.html'), () => ok(false, 'deep link to tickets'));
await page.goto(`${ROOT}/cart`);
await page.getByRole('heading', { name: 'Your cart', exact: true }).waitFor().then(() => ok(true, 'deep link to the cart works'), () => ok(false, 'deep link to cart'));

// Google sign-in: the button is offered. (The popup itself needs apis.google.com, which the test sandbox blocks.)
await page.goto(`${ROOT}/account`);
ok(await page.getByRole('button', { name: 'Continue with Google' }).isVisible(), 'Continue with Google is offered on the sign-in page');
// Email sign-in and a staff page work under the sub-path
await page.getByLabel('Email').fill('manager@msb.test');
await page.getByLabel('Password', { exact: true }).fill('msb-test-pass');
await page.locator('form button[type=submit]').click();
await page.waitForURL('**/tickets');
await page.goto(`${ROOT}/dashboard/events`);
await page.getByRole('heading', { name: 'Events', exact: true }).waitFor().then(() => ok(true, 'dashboard opens under the sub-path after email sign-in'), () => ok(false, 'dashboard under sub-path'));
ok(problems.length === 0, `no console errors, CSP violations or missing files ${problems.slice(0, 5).join(' | ')}`);
await b.close();
