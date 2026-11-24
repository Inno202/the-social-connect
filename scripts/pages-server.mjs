// Serves dist/ the way GitHub Pages does: under /<base>/, folders -> index.html, unknown paths -> 404.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const BASE = process.argv[2] || '/the-social-connect/';
const PORT = Number(process.argv[3] || 4174);
const root = join(process.cwd(), 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('not found'); }
  let p = normalize(join(root, url.slice(BASE.length)));
  if (!p.startsWith(root)) { res.writeHead(400); return res.end(); }
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(await readFile(join(root, '404.html')));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`GitHub Pages-like server on http://127.0.0.1:${PORT}${BASE}`));
