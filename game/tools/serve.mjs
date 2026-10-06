// Minimal static server (node built-ins). usage: node tools/serve.mjs [dir=.] [port=8123]
// Serves with correct MIME types (.webmanifest, .woff2, .mjs ...) and no-cache headers for local testing.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(game, process.argv[2] || '.');
const port = +(process.argv[3] || process.env.PORT || 8123);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`no index.html in ${dir}` + (dir.endsWith('dist') ? ' (run: npm run build)' : '')); process.exit(1); }
http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  let f = path.join(dir, path.normalize(p));
  if (!f.startsWith(dir)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, data) => {
    if (e) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + p); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
}).listen(port, () => console.log(`serving ${path.relative(process.cwd(), dir) || '.'} at http://localhost:${port}/`));
