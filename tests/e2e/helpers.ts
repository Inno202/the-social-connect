import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const SHOTS = 'docs/screenshots';
export const STAFF_PASSWORD = 'msb-test-pass';
export const WIDTHS = [1280, 768, 390, 360] as const;
export const heightFor = (w: number) => (w < 500 ? 844 : w < 1000 ? 1024 : 900);

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function settle(page: Page, ms = 700) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(ms);
}

/**
 * The Bokamoso layout rules, measured in the browser:
 * no sideways scroll; buttons and fields 48px tall, icon buttons exactly 44 x 44, other links 44px;
 * no text under 12px, and reading text (everything but eyebrow labels and graphics) at least 14px;
 * every .even-row line fills the full width; .even-cols columns are equal; cards side by side are equal height;
 * one h1; button text never cut off; every image has a size or a fixed-ratio frame; fields fill their column.
 */
export async function checkLayout(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const vis = (el: Element) => {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.sr-only,[hidden],dialog:not([open])');
    };
    const out: Record<string, string[]> = { overflow: [], small: [], text: [], evenRow: [], evenCols: [], cards: [], h1: [], clipped: [], img: [], field: [] };
    const sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (sw !== 0) out.overflow.push(`scrolls sideways by ${sw}px`);
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
    const size = (el: Element) => { const b = el.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`; };

    document.querySelectorAll('.btn').forEach((el) => { if (vis(el) && el.getBoundingClientRect().height < 47.5) out.small.push(`btn ${name(el)} ${size(el)}`); });
    document.querySelectorAll('.icon-btn').forEach((el) => { const b = el.getBoundingClientRect(); if (vis(el) && (Math.abs(b.width - 44) > 0.6 || Math.abs(b.height - 44) > 0.6)) out.small.push(`icon ${name(el)} ${size(el)}`); });
    document.querySelectorAll('.field').forEach((el) => { if (vis(el) && el.getBoundingClientRect().height < 47.5) out.small.push(`field ${name(el)} ${size(el)}`); });
    document.querySelectorAll('header a, footer a, nav a, main button, main a.btn, [role=tab]').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (vis(el) && !el.matches('.skip-link') && !el.closest('p,li > span,dd') && (b.width < 43.5 || b.height < 43.5)) out.small.push(`tap ${name(el)} ${size(el)}`);
    });

    // Text size floor: walk visible text nodes.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim()) continue;
      seen.add(el);
      if (!vis(el) || el.closest('svg,[aria-hidden="true"],script,style,noscript')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const decorative = !!el.closest('.eyebrow');
      if (fs < 11.95 || (!decorative && fs < 13.95)) out.text.push(`${name(el)} ${fs.toFixed(1)}px`);
    }

    // Even rows: each line reaches both edges of the row.
    document.querySelectorAll('.even-row').forEach((row) => {
      if (!vis(row)) return;
      const rb = row.getBoundingClientRect();
      const kids = [...row.children].filter(vis);
      const lines = new Map<number, DOMRect[]>();
      kids.forEach((k) => { const b = k.getBoundingClientRect(); const key = Math.round(b.top); lines.set(key, [...(lines.get(key) ?? []), b]); });
      lines.forEach((bs) => {
        const left = Math.min(...bs.map((b) => b.left));
        const right = Math.max(...bs.map((b) => b.right));
        if (left - rb.left > 1.5 || rb.right - right > 1.5) out.evenRow.push(`${name(row)}: a line does not fill the width`);
      });
    });
    document.querySelectorAll('.even-cols').forEach((row) => {
      if (!vis(row)) return;
      const ws = [...row.children].filter(vis).map((k) => k.getBoundingClientRect().width);
      if (ws.length && Math.max(...ws) - Math.min(...ws) > 1.5) out.evenCols.push(`${name(row)}: ${ws.map(Math.round).join('/')}`);
    });
    document.querySelectorAll('[data-card-grid], [data-card-grid] ~ *, ol:has(> li > [data-card])').forEach((grid) => {
      const cards = [...grid.querySelectorAll('[data-card]')].filter(vis);
      const rows = new Map<number, number[]>();
      cards.forEach((c) => { const b = c.getBoundingClientRect(); const key = Math.round(b.top); rows.set(key, [...(rows.get(key) ?? []), b.height]); });
      rows.forEach((hs) => { if (Math.max(...hs) - Math.min(...hs) > 1.5) out.cards.push(`cards in a row: ${hs.map(Math.round).join('/')}`); });
    });
    const h1s = [...document.querySelectorAll('h1')];
    if (h1s.length !== 1) out.h1.push(`${h1s.length} h1 elements`);
    document.querySelectorAll('.btn').forEach((el) => { if (vis(el) && el.scrollWidth > el.clientWidth + 1) out.clipped.push(`${name(el)} text is cut off`); });
    document.querySelectorAll('main img, dialog img').forEach((img) => {
      const i = img as HTMLImageElement;
      if (!vis(i)) return;
      const sized = i.getAttribute('width') && i.getAttribute('height');
      const framed = getComputedStyle(i.parentElement!).aspectRatio !== 'auto' || /aspect|size-|h-\[|h-full/.test(i.parentElement!.className + ' ' + i.className);
      if (!sized && !framed) out.img.push(`img ${i.alt || i.src.slice(-30)} has no size or frame`);
    });
    document.querySelectorAll('input.field, select.field, textarea.field').forEach((f) => {
      if (!vis(f)) return;
      const p = f.parentElement!;
      const pw = p.getBoundingClientRect().width - parseFloat(getComputedStyle(p).paddingLeft) - parseFloat(getComputedStyle(p).paddingRight);
      if (p.classList.contains('relative') || /flex|grid/.test(getComputedStyle(p).display)) return;
      if (f.getBoundingClientRect().width < pw - 1.5) out.field.push(`${name(f)} narrower than its column`);
    });
    return out;
  });
  for (const [k, v] of Object.entries(r)) expect(v, `${label}: ${k}`).toEqual([]);
}

export async function checkA11y(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), `${label}: accessibility`).toEqual([]);
}

export async function shot(page: Page, name: string, fullPage = true) {
  if (fullPage) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150); }
  await page.screenshot({ path: `${SHOTS}/${name}.jpg`, fullPage, type: 'jpeg', quality: 80 });
}

/** Scrolls through the page so lazy images load before a full-page screenshot. */
export async function loadLazy(page: Page) {
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(600);
}

export async function signIn(page: Page, email: string, password = STAFF_PASSWORD, next = '/dashboard') {
  await page.goto(`/account?next=${next}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/account'));
}
