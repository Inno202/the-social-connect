// Writes static HTML for the public pages so they load fast and can be indexed.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = join(process.cwd(), 'dist');
const { render, PUBLIC_ROUTES } = await import(pathToFileURL(join(process.cwd(), 'dist-ssr', 'entry-server.js')).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');
// GitHub Pages serves 404.html for unknown paths: the app then opens the right page (cart, tickets, dashboard).
writeFileSync(join(dist, '404.html'), template);
let n = 0;
for (const route of PUBLIC_ROUTES) {
  const html = template.replace('<!--app-->', render(route));
  const dir = route === '/' ? dist : join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  n++;
}
rmSync(join(process.cwd(), 'dist-ssr'), { recursive: true, force: true });
console.log(`Pre-rendered ${n} public pages.`);
