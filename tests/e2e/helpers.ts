import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const SHOTS = 'docs/screenshots';
export const STAFF_PASSWORD = 'msb-test-pass';
export const WIDTHS = [1280, 390, 360] as const;

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function settle(page: Page, ms = 700) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(ms);
}

/** No sideways scrolling, and controls are at least 44px in both directions. */
export async function checkLayout(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: page scrolls sideways by ${overflow}px`).toBe(0);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.btn, .icon-btn, .chip, [role=tab], header a, footer a, main button')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('.sr-only') && (r.width < 43.5 || r.height < 43.5);
      })
      .map((el) => `${el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`),
  );
  expect(small, `${label}: controls smaller than 44px`).toEqual([]);
}

export async function checkA11y(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), `${label}: accessibility`).toEqual([]);
}

export async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: `${SHOTS}/${name}.jpg`, fullPage, type: 'jpeg', quality: 82 });
}

export async function signIn(page: Page, email: string, password = STAFF_PASSWORD, next = '/dashboard') {
  await page.goto(`/account?next=${next}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'));
}
