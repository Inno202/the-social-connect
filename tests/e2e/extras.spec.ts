import { test, expect, type Browser } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { checkA11y, checkLayout, settle, shot, signIn, watchErrors } from './helpers';

const stamp = Date.now();
const giver = { name: 'Neo Giver', email: `giver${stamp}@msb.test`, password: 'blow-2026-test' };
const friend = { name: 'Kea Friend', email: `friend${stamp}@msb.test`, password: 'blow-2026-test' };

async function signUp(browser: Browser, who: typeof giver, next: string) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`/account?mode=signup&next=${encodeURIComponent(next)}`);
  await page.getByLabel('Your name').fill(who.name);
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password', { exact: true }).fill(who.password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'));
  await settle(page, 800);
  return { ctx, page };
}

test('event page: countdown, add to calendar, directions, WhatsApp and share', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto('/events/demo-test-night-2026');
  await settle(page, 1000);
  await expect(page.getByText('Starts in')).toBeVisible();
  const wa = page.getByRole('link', { name: 'WhatsApp' });
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/);
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add it there' })).toHaveAttribute('href', /calendar\.google\.com/);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar' }).click()]);
  mkdirSync('test-results', { recursive: true });
  await dl.saveAs('test-results/event.ics');
  const ics = readFileSync('test-results/event.ics', 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('SUMMARY:MSB Test Night');
  await checkLayout(page, 'event page with actions @1280');
  await checkA11y(page, 'event page with actions');
  await page.setViewportSize({ width: 360, height: 740 });
  await settle(page, 400);
  await checkLayout(page, 'event page with actions @360');
  await shot(page, 'event-actions-phone');
  // Home shows a countdown to the next event.
  await page.goto('/');
  await settle(page, 1000);
  await expect(page.getByText('Next up')).toBeVisible();
  await checkLayout(page, 'home with countdown @360');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('notify me when tickets go on sale, and staff see and export the list', async ({ browser }) => {
  const { ctx, page } = await signUp(browser, { ...giver, email: `notify${stamp}@msb.test` }, '/events/demo-coming-soon-2026');
  const errors = watchErrors(page);
  await expect(page.getByText('Tickets coming soon')).toBeVisible();
  await page.getByRole('button', { name: 'Notify me when tickets go on sale' }).click();
  await expect(page.getByRole('button', { name: /You will be notified/ })).toHaveAttribute('aria-pressed', 'true');
  await checkA11y(page, 'notify me');
  expect(errors).toEqual([]);
  await ctx.close();

  const staff = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const sp = await staff.newPage();
  await signIn(sp, 'manager@msb.test', undefined, '/dashboard/notify');
  await sp.goto('/dashboard/notify');
  await settle(sp, 1200);
  await expect(sp.getByText(`notify${stamp}@msb.test`)).toBeVisible();
  const [dl] = await Promise.all([sp.waitForEvent('download'), sp.getByRole('button', { name: 'Export CSV' }).click()]);
  expect(dl.suggestedFilename()).toBe('notify-demo-coming-soon-2026.csv');
  await checkLayout(sp, 'notify lists @1280');
  await checkA11y(sp, 'notify lists');
  await shot(sp, 'dashboard-notify');
  await staff.close();
});

test('send a ticket to a friend: new QR code for them, the old ticket stops working', async ({ browser }) => {
  // The giver gets a free activation ticket.
  const a = await signUp(browser, giver, '/events/demo-test-activation-2026/tickets');
  await a.page.getByRole('button', { name: 'Add one Free ticket ticket' }).click();
  await a.page.getByRole('link', { name: 'View cart' }).click();
  await a.page.getByRole('button', { name: 'Checkout' }).click();
  await a.page.getByLabel('Everyone on these tickets is 18 or older.').check();
  await a.page.getByLabel(/I accept the/).check();
  await a.page.getByRole('button', { name: 'Continue' }).click();
  await a.page.getByRole('button', { name: 'Get my free tickets' }).click();
  await expect(a.page.getByText('1 ticket was added')).toBeVisible();
  await a.page.goto('/tickets');
  await settle(a.page, 1200);
  await a.page.locator('main ul li button[aria-label^="Open ticket"]').first().click();
  const dlg = a.page.locator('dialog[open]');
  const oldCode = (await dlg.locator('dd.font-mono').textContent())!.trim();
  await dlg.getByRole('button', { name: 'Send to a friend' }).click();
  await dlg.getByRole('button', { name: 'Make a transfer link' }).click();
  const link = (await dlg.getByLabel('Transfer link').textContent())!.trim();
  expect(link).toMatch(/\/claim\/[A-Za-z0-9]{28}$/);
  await checkA11y(a.page, 'transfer link');
  await shot(a.page, 'ticket-transfer-link', false);

  // The friend opens the link, signs up and claims it.
  const path = new URL(link).pathname;
  const b = await signUp(browser, friend, path);
  await expect(b.page.getByText('From Neo Giver')).toBeVisible();
  await checkLayout(b.page, 'claim @1280');
  await checkA11y(b.page, 'claim');
  await b.page.getByRole('button', { name: 'Add to my tickets' }).click();
  await b.page.waitForURL('**/tickets');
  await settle(b.page, 1200);
  await b.page.locator('main ul li button[aria-label^="Open ticket"]').first().click();
  const newCode = (await b.page.locator('dialog[open]').locator('dd.font-mono').textContent())!.trim();
  expect(newCode).not.toBe(oldCode);
  await expect(b.page.locator('dialog[open]').getByText('Kea Friend')).toBeVisible();

  // The giver's ticket now shows as sent, and the same link cannot be used again.
  await a.page.reload();
  await settle(a.page, 1200);
  await expect(a.page.getByText('Sent to a friend').first()).toBeVisible();
  await b.page.goto(path);
  await settle(b.page, 800);
  await expect(b.page.getByText('Link already used')).toBeVisible();
  await a.ctx.close();
  await b.ctx.close();
});

test('a busy checkout shows the waiting room instead of an error, and the buyer can leave the line', async ({ browser }) => {
  const a = await signUp(browser, { ...giver, email: `queue${stamp}@msb.test` }, '/events/demo-test-activation-2026/tickets');
  await a.page.getByRole('button', { name: 'Add one Free ticket ticket' }).click();
  await a.page.getByRole('link', { name: 'View cart' }).click();
  await a.page.getByRole('button', { name: 'Checkout' }).click();
  await a.page.getByLabel('Everyone on these tickets is 18 or older.').check();
  await a.page.getByLabel(/I accept the/).check();
  await a.page.getByRole('button', { name: 'Continue' }).click();
  // Cut the database connection so the purchase cannot get through, as when the database is overloaded.
  await a.ctx.setOffline(true);
  await a.page.getByRole('button', { name: 'Get my free tickets' }).click();
  const room = a.page.getByRole('alertdialog');
  await expect(room).toBeVisible({ timeout: 20000 });
  await expect(room.getByRole('heading', { name: /You are in the line/ })).toBeVisible();
  await a.page.setViewportSize({ width: 390, height: 844 });
  await a.page.waitForTimeout(600);
  await shot(a.page, 'waiting-room-phone', false);
  await checkA11y(a.page, 'waiting room');
  await room.getByRole('button', { name: 'Leave the line' }).click();
  await expect(room).toBeHidden({ timeout: 25000 });
  await a.ctx.setOffline(false);
  await expect(a.page.getByText(/You left the line/).first()).toBeVisible();
  await a.ctx.close();
});

test('a signed-in vendor follows their application on the vendor page: reply, stall fee and payment', async ({ browser }) => {
  const v = await signUp(browser, { name: 'Lindi Vendor', email: `vendor${stamp}@msb.test`, password: 'blow-2026-test' }, '/vendors');
  const page = v.page;
  await expect(page.getByText(/You are signed in, so you can follow this application/)).toBeVisible();
  await page.getByLabel('Business or stall name').fill(`Lindi's Kota ${stamp}`);
  await page.getByLabel('Phone').fill('082 000 0000');
  await page.getByLabel('What you sell').selectOption('food');
  await page.getByLabel('Tell us about it').fill('Kotas and cold drinks, two people, own gazebo.');
  await page.getByRole('radio', { name: 'No' }).click();
  await page.getByLabel(/MSB Test Night/).check();
  await page.getByLabel(/MSB Events may keep these details/).check();
  await page.getByRole('button', { name: 'Send application' }).click();
  await expect(page.getByRole('heading', { name: /Application sent/ })).toBeVisible();
  await page.getByRole('button', { name: /Your applications/ }).click();
  const mine = page.locator('#my-applications');
  await expect(mine.getByText('Received')).toBeVisible();
  await expect(page).toHaveURL(/\/vendors$/);

  const staff = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sp = await staff.newPage();
  await signIn(sp, 'manager@msb.test', undefined, '/dashboard/vendors');
  await sp.goto('/dashboard/vendors');
  const card = sp.locator('li', { hasText: `Lindi's Kota ${stamp}` });
  await card.getByLabel('Message (optional)').fill('Stall 12, set-up from 10:00. Pay by EFT using your reference.');
  await card.getByLabel('Stall fee in rand (optional)').fill('1500');
  await card.getByRole('button', { name: 'Approve' }).click();
  await sp.getByRole('button', { name: 'Approved' }).click();
  const done = sp.locator('li', { hasText: `Lindi's Kota ${stamp}` });
  await expect(done.getByText('R1,500 · Not paid')).toBeVisible();
  await checkLayout(sp, 'vendors admin with reply @1280');
  await checkA11y(sp, 'vendors admin with reply');
  await shot(sp, 'dashboard-vendor-reply', false);

  // The vendor sees the reply and the fee on the vendor page.
  await page.goto('/vendors');
  await settle(page, 1200);
  await page.getByRole('button', { name: /Your applications \(1\)/ }).click();
  await expect(mine.getByText('Approved')).toBeVisible();
  await expect(mine.getByText('Stall 12, set-up from 10:00. Pay by EFT using your reference.')).toBeVisible();
  await expect(mine.getByText('R1,500')).toBeVisible();
  await expect(mine.getByText('Not paid yet')).toBeVisible();
  await expect(mine.getByText(/^V-[A-Z0-9]{6}$/)).toBeVisible();
  await checkLayout(page, 'your applications @1280');
  await checkA11y(page, 'your applications');

  // Staff mark it paid; the vendor sees Paid.
  await done.getByRole('button', { name: 'Mark as paid' }).click();
  await expect(done.getByText('R1,500 · Paid')).toBeVisible();
  await staff.close();
  await expect(mine.getByText('Paid', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.setViewportSize({ width: 360, height: 740 });
  await settle(page, 400);
  await checkLayout(page, 'your applications @360');
  await shot(page, 'vendor-applications-phone');
  await v.ctx.close();
});
