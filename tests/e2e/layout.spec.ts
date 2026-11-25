import { test, expect, type Browser } from '@playwright/test';
import { WIDTHS, heightFor, checkA11y, checkLayout, loadLazy, settle, shot, signIn, watchErrors } from './helpers';

/** Every public page, at every width: layout rules + accessibility. */
const PUBLIC = [
  ['/', 'home'],
  ['/events', 'events'],
  ['/events?show=past', 'events-past'],
  ['/events/spring-blow-2026', 'event-page'],
  ['/events/soulful-blow-december-2026', 'event-page-tables'],
  ['/events/demo-test-night-2026', 'event-page-demo'],
  ['/events/demo-test-night-2026/tickets', 'tickets'],
  ['/gallery', 'gallery'],
  ['/about', 'about'],
  ['/vendors', 'vendors'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
  ['/cookies', 'cookies'],
  ['/account', 'sign-in'],
  ['/account?mode=signup', 'sign-up'],
  ['/cart', 'cart-empty'],
  ['/no-such-page', 'not-found'],
] as const;

const SHOT_PAGES = new Set(['home', 'events', 'event-page', 'tickets', 'gallery', 'about', 'vendors', 'terms', 'sign-in', 'sign-up', 'not-found']);

test.describe.configure({ mode: 'serial' });

for (const w of WIDTHS) {
  test(`public pages at ${w}px: layout rules and accessibility`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: w === 390 || w === 1280 ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    for (const [path, name] of PUBLIC) {
      await page.goto(path);
      await settle(page, 1000);
      await checkLayout(page, `${path} @${w}`);
      await checkA11y(page, `${path} @${w}`);
      if ((w === 390 || w === 1280) && SHOT_PAGES.has(name)) {
        await loadLazy(page);
        await shot(page, `${name}-${w === 390 ? 'phone' : 'desktop'}`);
      }
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('200% browser zoom (a 1280px window shows 640 CSS px): nothing scrolls sideways or gets cut off', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [path] of PUBLIC) {
    await page.goto(path);
    await settle(page, 800);
    await checkLayout(page, `${path} @200%`);
  }
  await ctx.close();
});

test('larger text setting on the phone (root text 125%): pages still fit', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    // Emulates a phone set to larger text: the browser's default size grows from 16px to 20px.
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = 'clamp(109.375%, calc(1.5vw + 78.125%), 125%)'; });
  });
  for (const path of ['/', '/events', '/events/spring-blow-2026', '/account?mode=signup', '/terms']) {
    await page.goto(path);
    await settle(page, 800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} with larger text`).toBe(0);
    const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(fs).toBeGreaterThan(17);
  }
  await ctx.close();
});

test('button group and chip group at 360px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('/events');
  await settle(page, 800);
  await page.locator('[data-chips]').first().screenshot({ path: 'docs/screenshots/group-chips-360.png' });
  await page.goto('/no-such-page');
  await settle(page, 600);
  await page.locator('.even-row').first().screenshot({ path: 'docs/screenshots/group-buttons-360.png' });
  await page.goto('/events/demo-test-night-2026');
  await settle(page, 800);
  await page.locator('[role=tablist]').screenshot({ path: 'docs/screenshots/group-tabs-360.png' });
  await page.goto('/account?mode=signup');
  await settle(page, 600);
  await shot(page, 'sign-up-360');
  await ctx.close();
});

async function rolePages(browser: Browser, email: string, paths: string[], tag: string) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await signIn(page, email);
    for (const p of paths) {
      await page.goto(p);
      await settle(page, 1200);
      await checkLayout(page, `${tag} ${p} @${w}`);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  }
}

test('signed in as each role, at every width', async ({ browser }) => {
  test.setTimeout(240_000);
  await rolePages(browser, 'super@msb.test', ['/dashboard/events', '/dashboard/events/demo-test-night-2026', '/dashboard/events/new', '/dashboard/reports', '/dashboard/gallery', '/dashboard/vendors', '/dashboard/users', '/dashboard/activity', '/profile', '/tickets'], 'super admin');
  await rolePages(browser, 'admin@msb.test', ['/dashboard/events', '/dashboard/reports', '/dashboard/gallery'], 'admin');
  await rolePages(browser, 'manager@msb.test', ['/dashboard/events', '/dashboard/gallery', '/dashboard/vendors'], 'event manager');
  await rolePages(browser, 'finance@msb.test', ['/dashboard/reports', '/scan'], 'finance');
  await rolePages(browser, 'scanner@msb.test', ['/dashboard', '/scan'], 'scanner');
});

test('dashboard and staff form dialog screenshots, and dialogs never touch the screen edge', async ({ browser }) => {
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone'], [360, '360']] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await signIn(page, 'super@msb.test', undefined, '/dashboard/events');
    await settle(page, 1200);
    if (tag !== '360') await shot(page, `dashboard-${tag}`, false);
    await page.goto('/dashboard/events/demo-test-night-2026');
    await settle(page, 1200);
    await page.getByRole('button', { name: 'Edit VIP table for 4' }).click();
    const dlg = page.locator('dialog[open]');
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(400);
    const b = await dlg.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(15.5);
    expect(w - (b!.x + b!.width)).toBeGreaterThanOrEqual(15.5);
    // Save and Cancel stay visible while the body scrolls.
    await expect(dlg.getByRole('button', { name: 'Save ticket type' })).toBeInViewport();
    await checkLayout(page, `ticket type dialog @${w}`);
    await shot(page, `staff-dialog-${tag}`, false);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await ctx.close();
  }
});

test('the phone back button closes an open viewer, dialog or menu before leaving the page', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('/gallery');
  await settle(page, 800);
  await page.getByRole('button', { name: /Open photo/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeHidden();
  expect(new URL(page.url()).pathname).toBe('/gallery');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#mobile-nav')).toBeHidden();
  expect(new URL(page.url()).pathname).toBe('/gallery');
  // Closing with the X does not leave an extra step behind.
  await page.getByRole('button', { name: /Open photo/ }).first().click();
  await page.getByRole('button', { name: 'Close viewer' }).click();
  await page.waitForTimeout(300);
  expect(new URL(page.url()).pathname).toBe('/gallery');
  await ctx.close();
});

test('home and events page: event posters are exactly the size of the gallery photos, at every width', async ({ browser }) => {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) } });
    const page = await ctx.newPage();
    await page.goto('/');
    await settle(page, 1200);
    const r = await page.evaluate(() => {
      const box = (el: Element) => { const b = el.getBoundingClientRect(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; };
      return {
        events: [...document.querySelectorAll('section[aria-labelledby=upcoming] [data-card] > div:first-child')].map(box),
        gallery: [...document.querySelectorAll('section[aria-labelledby=gallery-teaser] .grid > a')].map(box),
      };
    });
    expect(r.events.length, `@${w}`).toBeGreaterThan(0);
    for (const e of r.events) expect(e, `event poster vs gallery photo @${w}`).toEqual(r.gallery[0]);
    await page.goto('/events');
    await settle(page, 1000);
    const ev = await page.evaluate(() => [...document.querySelectorAll('[data-card-grid] [data-card] > div:first-child')].map((el) => { const b = el.getBoundingClientRect(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; }));
    expect(ev.length, `events page @${w}`).toBeGreaterThan(0);
    for (const e of ev) expect(e, `events page card vs home card @${w}`).toEqual(r.gallery[0]);
    await ctx.close();
  }
});

test('nav bar: Home, Events, Tickets, Gallery, About, Become a vendor; Sign in on the far right until signed in, then cart and profile', async ({ browser }) => {
  const NAV = ['Home', 'Events', 'Tickets', 'Gallery', 'About', 'Become a vendor'];
  const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const d = await desk.newPage();
  await d.goto('/');
  await settle(d, 800);
  const main = d.getByRole('navigation', { name: 'Main' });
  await expect(main.getByRole('link')).toHaveText(NAV);
  await expect(main.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  const banner = d.getByRole('banner');
  const signIn = banner.getByRole('link', { name: 'Sign in' });
  await expect(signIn).toBeVisible();
  await expect(banner.getByRole('link', { name: /^Cart/ })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: 'Profile' })).toHaveCount(0);
  // Sign in sits on the far right of the bar.
  const sb = (await signIn.boundingBox())!;
  expect(1280 - (sb.x + sb.width)).toBeLessThan(40);
  await d.goto('/events/spring-blow-2026');
  await expect(main.getByRole('link', { name: 'Events', exact: true })).toHaveAttribute('aria-current', 'page');
  await signInPage(d, 'manager@msb.test');
  await d.goto('/');
  await settle(d, 800);
  await expect(banner.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: /^Cart/ })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Profile' })).toBeVisible();
  await expect(main.getByRole('link')).toHaveText([...NAV, 'Dashboard']);
  await checkLayout(d, 'header signed in @1280');
  await desk.close();
  const phone = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const p = await phone.newPage();
  await p.goto('/');
  await settle(p, 800);
  await expect(p.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await p.getByRole('button', { name: 'Open menu' }).click();
  await expect(p.locator('#mobile-nav').getByRole('link')).toHaveText(NAV);
  await phone.close();
});

async function signInPage(page: import('@playwright/test').Page, email: string) {
  await signIn(page, email, undefined, '/tickets');
}
