// Screenshot tool for builders and critics.
// node tools/shot.mjs <out.png> [query] [waitMs] [w] [h] [dpr] [--js "<code run in page after load>"] [--js2 "<code>" --wait2 ms]
// Defaults: phone landscape 844x390 @ dpr 3 (iPhone 14). Query example: "scene=level1&unlock".
// Starts its own static server on a free port. Prints console errors (must be zero).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const js = flag('--js'), js2 = flag('--js2'), wait2 = Number(flag('--wait2') || 800);
const [out = 'shot.png', query = '', waitMs = '2500', w = '844', h = '390', dpr = '3'] = args;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, hasTouch: true, isMobile: true });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:${port}/index.html?${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 }).catch(() => errors.push('timeout waiting for __ready'));
if (js) { try { await page.evaluate(js); } catch (e) { errors.push('js: ' + e.message); } }
await page.waitForTimeout(+waitMs);
if (js2) { try { await page.evaluate(js2); } catch (e) { errors.push('js2: ' + e.message); } await page.waitForTimeout(wait2); }
await page.screenshot({ path: out });
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors', '\nsaved', out);
await browser.close(); server.close();
