// Writes static HTML for the public pages so they load fast and can be indexed.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = join(process.cwd(), 'dist');
const { render, head, SITE, PUBLIC_ROUTES } = await import(pathToFileURL(join(process.cwd(), 'dist-ssr', 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');
// GitHub Pages serves 404.html for unknown paths: the app then opens the right page (cart, tickets, dashboard).
writeFileSync(join(dist, '404.html'), template.replace('<!--head-->', ''));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let n = 0;
for (const route of PUBLIC_ROUTES) {
  const h = head(route);
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(h.title)}</title>`)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<!--head-->', h.html)
    .replace('<!--app-->', render(route));
  const dir = route === '/' ? dist : join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  n++;
}
// Sitemap of the public pages, and a robots file that keeps private pages out of search results.
// Note: on a github.io project address search engines only read robots.txt at the domain root, so it takes
// effect once the site has its own domain; submit sitemap.xml in Google Search Console meanwhile.
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_ROUTES.map((r) => `  <url><loc>${SITE}${r === '/' ? '/' : `${r}/`}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(
  join(dist, 'robots.txt'),
  ['User-agent: *', ...['/dashboard', '/scan', '/cart', '/checkout', '/profile', '/tickets', '/account', '/claim', '/vendors/applications'].map((p) => `Disallow: ${new URL(SITE).pathname.replace(/\/$/, '')}${p}`), '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'),
);
rmSync(join(process.cwd(), 'dist-ssr'), { recursive: true, force: true });
console.log(`Pre-rendered ${n} public pages.`);
