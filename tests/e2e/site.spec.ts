import { test, expect, chromium, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { SHOTS, checkA11y, checkLayout, settle, shot, signIn, watchErrors } from './helpers';

const fan = { name: 'Lerato Test', email: `fan${Date.now()}@msb.test`, password: 'blow-2026-test' };
let ticketCode = '';
let ticketCode2 = '';

test.describe.configure({ mode: 'serial' });

test('event line-up and gallery viewer', async ({ browser }) => {
  for (const [w, tag] of [[1280, 'desktop'], [390, 'phone']] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto('/events/spring-blow-2026');
    await settle(page, 1000);
    await page.getByRole('tab', { name: 'Line up' }).click();
    await expect(page.getByRole('button', { name: /more$/ })).toBeVisible();
    await shot(page, `event-lineup-${tag}`, false);
    await page.goto('/events/soulful-blow-december-2026');
    await settle(page, 800);
    await expect(page.getByRole('link', { name: 'Buy on Computicket' })).toHaveAttribute('href', /^https:\/\/www\.computicket\.com/);
    await page.goto('/gallery');
    await settle(page, 800);
    await page.getByRole('button', { name: /Open photo/ }).first().click();
    const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
    await expect(viewer).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(viewer.getByText(/^2 \/ \d+$/)).toBeVisible();
    await page.waitForTimeout(600);
    await shot(page, `gallery-viewer-${tag}`, false);
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await ctx.close();
  }
});

async function phoneShot(page: Page, name: string, fullPage = true) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await checkLayout(page, `${name} @390`);
  await shot(page, `${name}-phone`, fullPage);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(300);
  await checkLayout(page, `${name} @360`);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);
}

test('sign up, buy general tickets and a VIP table, claim a free ticket, download a ticket', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);

  await page.goto('/account?mode=signup&next=/events/demo-test-night-2026/tickets');
  await page.getByLabel('Your name').fill(fan.name);
  await page.getByLabel('Email').fill(fan.email);
  await page.getByLabel('Password', { exact: true }).fill(fan.password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/events/demo-test-night-2026/tickets');
  await settle(page, 1000);

  // Releases open in order; kids tickets are "coming soon".
  const r1 = page.locator('li', { hasText: '1st release' });
  await expect(r1.getByText('Sold out')).toBeVisible();
  await expect(page.locator('li', { hasText: '3rd release' }).getByText('Coming soon')).toBeVisible();
  await page.getByRole('button', { name: 'Add one 2nd release ticket' }).click();
  await page.getByRole('button', { name: 'Add one more 2nd release ticket' }).click();
  await page.getByRole('button', { name: 'Add one VIP table for 4 table' }).click();
  await expect(page.getByText('R3,400')).toBeVisible();
  await checkLayout(page, 'tickets @1280');
  await checkA11y(page, 'tickets');
  await page.getByRole('button', { name: 'VIP tables' }).click();
  await expect(page.getByText('Your account is ready.')).toBeHidden({ timeout: 8000 });
  await shot(page, 'tickets-vip-desktop', false);
  await phoneShot(page, 'tickets-vip', false);
  await page.getByRole('button', { name: 'All', exact: true }).click();

  await page.getByRole('link', { name: 'View cart' }).click();
  await settle(page);
  await expect(page.getByText('6 tickets')).toBeVisible();
  await checkA11y(page, 'cart');
  await shot(page, 'cart-desktop');
  await phoneShot(page, 'cart');

  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByText('Details', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/Confirm that everyone on these tickets is 18/)).toBeVisible();
  // Each seat of the VIP table gets a guest name (empty seats use the buyer's name).
  await expect(page.getByRole('heading', { name: /VIP table for 4: guests/i })).toBeVisible();
  await page.getByLabel('Seat 2', { exact: true }).fill('Thabo Guest');
  await page.getByLabel('Everyone on these tickets is 18 or older.').check();
  await page.getByLabel(/I accept the/).check();
  await checkLayout(page, 'checkout details @1280');
  await shot(page, 'checkout-desktop');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(400);
  await checkLayout(page, 'checkout details @360');
  await shot(page, 'checkout-360');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await shot(page, 'checkout-phone');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('No payment is taken.')).toBeVisible();
  await shot(page, 'checkout-pay-desktop', false);
  await page.getByRole('button', { name: 'Confirm and get tickets' }).click();
  await expect(page.getByRole('heading', { name: /Your tickets are ready/ })).toBeVisible();
  await expect(page.getByText('6 tickets were added')).toBeVisible();

  // Free activation ticket: same flow, R0, still a QR code.
  await page.goto('/events/demo-test-activation-2026');
  await page.getByRole('link', { name: 'Get free tickets' }).click();
  await page.getByRole('button', { name: 'Add one Free ticket ticket' }).click();
  await page.getByRole('link', { name: 'View cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Everyone on these tickets is 18 or older.').check();
  await page.getByLabel(/I accept the/).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get my free tickets' }).click();
  await expect(page.getByText('1 ticket was added')).toBeVisible();

  await page.getByRole('link', { name: 'View my tickets' }).click();
  await settle(page, 1500);
  const cards = page.locator('main ul li button[aria-label^="Open ticket"]');
  await expect(cards).toHaveCount(7);
  await expect(cards.first()).toContainText('Test Activation'); // newest first
  await checkA11y(page, 'my tickets');
  await shot(page, 'my-tickets-desktop');
  await phoneShot(page, 'my-tickets');

  // The guest name is on seat 2, and the owner can change it.
  await page.locator('main ul li button', { hasText: 'Seat 2 of 4' }).click();
  const seat = page.locator('dialog[open]');
  await expect(seat.getByText('Thabo Guest')).toBeVisible();
  await seat.getByRole('button', { name: 'Change name' }).click();
  await seat.getByLabel('Name on this ticket').fill('Thabo Mokoena');
  await seat.getByRole('button', { name: 'Save' }).click();
  await expect(seat.getByText('Thabo Mokoena')).toBeVisible();
  await seat.getByRole('button', { name: 'Close' }).click();

  // Open a general ticket, read its code, download the PDF.
  await page.locator('main ul li button', { hasText: '2nd release' }).first().click();
  const modal = page.locator('dialog[open]');
  await expect(modal).toBeVisible();
  ticketCode = (await modal.locator('dd.font-mono').textContent())!.trim();
  expect(ticketCode).toMatch(/_\d+$/);
  await page.waitForTimeout(500);
  await shot(page, 'ticket-open-desktop', false);
  const [download] = await Promise.all([page.waitForEvent('download'), modal.getByRole('button', { name: 'Download PDF ticket' }).click()]);
  mkdirSync('test-results', { recursive: true });
  await download.saveAs('test-results/ticket.pdf');
  await modal.getByRole('button', { name: 'Close' }).click();
  await page.locator('main ul li button', { hasText: '2nd release' }).nth(1).click();
  ticketCode2 = (await page.locator('dialog[open]').locator('dd.font-mono').textContent())!.trim();
  expect(ticketCode2).not.toBe(ticketCode);
  await page.locator('dialog[open]').getByRole('button', { name: 'Close' }).click();
  execFileSync('pdftoppm', ['-png', '-r', '150', '-singlefile', 'test-results/ticket.pdf', `${SHOTS}/pdf-ticket`]);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('door scanner: admit with the camera, refuse the second scan, one camera only', async () => {
  test.skip(!ticketCode, 'needs the ticket from the purchase test');
  mkdirSync('test-results', { recursive: true });
  for (const [w, h, tag] of [[390, 844, 'phone'], [1280, 900, 'desktop']] as const) {
    const code = tag === 'phone' ? ticketCode : ticketCode2;
    writeFileSync(`test-results/qr-${tag}.png`, await QRCode.toBuffer(`MSB1:${code}`, { width: 360, margin: 3 }));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', `test-results/qr-${tag}.png`, '-t', '4', '-r', '15', '-vf', 'scale=360:360,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p', `test-results/qr-${tag}.y4m`]);
    const browser = await chromium.launch({
      executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium',
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=test-results/qr-${tag}.y4m`],
    });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, permissions: ['camera'] });
    await ctx.addInitScript(() => {
      const live: MediaStreamTrack[] = [];
      (window as unknown as { __liveTracks: () => number }).__liveTracks = () => live.filter((t) => t.readyState === 'live').length;
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); live.push(...s.getTracks()); return s; };
    });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await signIn(page, 'scanner@msb.test', undefined, '/scan');
    await page.goto('/scan');
    await page.getByLabel('Event').selectOption('demo-test-night-2026');
    const result = page.getByTestId('scan-result');
    if (tag === 'phone') {
      await expect(result).toHaveAttribute('data-ok', 'true', { timeout: 20_000 });
      await expect(result).toContainText('Admit');
      await page.waitForTimeout(350);
      await shot(page, `scanner-admit-${tag}`, false);
      // Held in view: checked once only, so after the card slides away no new card appears.
      await expect(result).toBeHidden({ timeout: 6000 });
      await page.waitForTimeout(2500);
      await expect(result).toBeHidden();
      // Out of view for a moment, then back: refused as already scanned.
      await page.getByRole('button', { name: 'Type' }).click();
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Camera' }).click();
      await expect(result).toHaveAttribute('data-ok', 'false', { timeout: 20_000 });
      await expect(result).toContainText('Already scanned');
      await page.waitForTimeout(350);
      await shot(page, `scanner-refuse-${tag}`, false);
      // Quick mode switches never leave more than one camera running.
      for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: 'Type' }).click(); await page.getByRole('button', { name: 'Camera' }).click(); }
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => (window as unknown as { __liveTracks: () => number }).__liveTracks())).toBeLessThanOrEqual(1);
      await page.getByRole('button', { name: 'Type' }).click();
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => (window as unknown as { __liveTracks: () => number }).__liveTracks())).toBe(0);
      // Typed code for another event is refused as wrong event.
      await page.getByLabel('Event').selectOption('demo-test-activation-2026');
      await page.getByLabel('Ticket code').fill(ticketCode);
      await page.getByRole('button', { name: 'Check ticket' }).click();
      await expect(result).toContainText('Wrong event');
    } else {
      // Desktop: a second ticket is admitted, then the first (already used) ticket typed in is refused.
      await expect(result).toHaveAttribute('data-ok', 'true', { timeout: 20_000 });
      await page.waitForTimeout(350);
      await shot(page, `scanner-admit-${tag}`, false);
      await page.getByRole('button', { name: 'Type' }).click();
      await page.getByLabel('Ticket code').fill(ticketCode);
      await page.getByRole('button', { name: 'Check ticket' }).click();
      await expect(result).toHaveAttribute('data-ok', 'false');
      await expect(result).toContainText('Already scanned');
      await page.waitForTimeout(350);
      await shot(page, `scanner-refuse-${tag}`, false);
    }
    await checkLayout(page, `scanner @${w}`);
    expect(errors).toEqual([]);
    await ctx.close();
    await browser.close();
  }
});

test('staff roles see only their own areas', async ({ browser }) => {
  const cases: [string, string[], string[]][] = [
    ['super@msb.test', ['Events', 'Reports', 'Gallery', 'Users and roles', 'Activity'], []],
    ['admin@msb.test', ['Events', 'Reports', 'Gallery'], ['Users and roles', 'Activity']],
    ['manager@msb.test', ['Events', 'Reports', 'Gallery'], ['Users and roles', 'Activity']],
    ['finance@msb.test', ['Reports'], ['Events', 'Gallery', 'Users and roles']],
    ['scanner@msb.test', [], ['Events', 'Reports', 'Gallery']],
  ];
  for (const [email, yes, no] of cases) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await signIn(page, email);
    await settle(page, 1200);
    const nav = page.getByRole('navigation', { name: 'Dashboard' });
    for (const t of yes) await expect(nav.getByRole('link', { name: t, exact: true })).toBeVisible();
    for (const t of no) await expect(page.getByRole('navigation', { name: 'Dashboard' }).getByRole('link', { name: t, exact: true })).toHaveCount(0);
    if (email === 'scanner@msb.test') {
      await expect(page.getByRole('link', { name: 'Open door scanner' })).toBeVisible();
      await page.goto('/dashboard/users');
      await expect(page.getByText('This area is not part of your role.')).toBeVisible();
    }
    if (email === 'finance@msb.test') {
      await expect(page.getByRole('link', { name: 'Open door scanner' })).toHaveCount(0);
      await page.goto('/scan');
      await expect(page.getByText('The door scanner is for MSB door staff.')).toBeVisible();
    }
    if (email === 'super@msb.test') {
      await page.goto('/dashboard/events');
      await settle(page, 1200);
      await checkLayout(page, 'dashboard @1280');
      await checkA11y(page, 'dashboard events');
      await shot(page, 'dashboard-desktop', false);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await checkLayout(page, 'dashboard @390');
      await shot(page, 'dashboard-phone', false);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/dashboard/reports');
      await page.locator('#rep-ev').selectOption('demo-test-night-2026');
      await expect(page.getByText('Scanned in')).toBeVisible();
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export attendees (CSV)' }).click()]);
      await dl.saveAs('test-results/attendees.csv');
      await page.goto('/dashboard/activity');
      await expect(page.getByText(/scanned ticket in/i).first()).toBeVisible();
      await shot(page, 'dashboard-activity-desktop', false);
    }
    await ctx.close();
  }
  // A customer cannot open the dashboard.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, fan.email, fan.password, '/dashboard');
  await expect(page.getByText('The dashboard is for MSB Events staff.')).toBeVisible();
  await ctx.close();
});

test('event staff can duplicate an event and add a ticket type in the staff dialog', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, 'manager@msb.test', undefined, '/dashboard/events');
  await page.getByRole('button', { name: 'Duplicate Test Activation (demo event)' }).click();
  await expect(page.getByRole('heading', { name: 'Edit event' })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue(/\(copy\)/);
  await page.getByRole('button', { name: 'Add ticket type' }).click();
  const dlg = page.locator('dialog[open]');
  await dlg.getByRole('button', { name: 'Save ticket type' }).click();
  await expect(dlg.getByText(/Name this ticket type/)).toBeVisible();
  await expect(dlg.getByLabel('Name')).toBeFocused();
  await dlg.getByLabel('Group').fill('VIP tables');
  await dlg.getByLabel('Name').fill('VIP table for 8');
  await dlg.getByLabel('Price (R)').fill('6000');
  await dlg.getByLabel('Admits').fill('8');
  await dlg.getByRole('button', { name: 'Save ticket type' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByText('VIP tables: VIP table for 8')).toBeVisible();
  await page.getByRole('button', { name: 'Save event' }).click();
  await expect(page.getByText('Event saved.')).toBeVisible();
  await expect(page.getByText('Test Activation (demo event) (copy)')).toBeVisible();
  await ctx.close();
});
