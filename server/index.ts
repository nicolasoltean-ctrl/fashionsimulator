/**
 * Production server: serves the built app from dist/ and the import proxy.
 * Build first with `npm run build`, then `npm start`.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { apiMiddleware } from './proxy.ts';

const dist = resolve(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT) || 4173;
const api = apiMiddleware();

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

createServer((req, res) => {
  void api(req, res, () => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://app.invalid').pathname);
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    const hashed = /\/assets\//.test(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
  });
}).listen(port, () => {
  console.log(`Atelier is running at http://localhost:${port}`);
});
