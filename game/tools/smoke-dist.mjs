// End-to-end smoke test of the production build in headless Chromium (software GL: slow, be patient).
// Serves dist/ under a sub-path (/test/, like GitHub Pages), then checks: page boots, loading screen goes away,
// no console errors, manifest + icons are 200, the service worker controls the page, an offline reload still
// boots the game, the WebGL fallback and the fatal-error panel render. Saves a screenshot of the running game.
// usage: node tools/smoke-dist.mjs [out.png]        (run `npm run build` first)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(game, 'dist');
const shot = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'marbot-smoke.png'));
const BASE = '/test/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
let bumped = false;   // simulates a new deploy: same files, new version + cache name
const bump = (p, d) => {
  if (!bumped) return d;
  if (p.endsWith('sw.js')) return d.toString().replace(/"version":"([^"]+)"/, '"version":"$1-next"').replace(/"cache":"([^"]+)"/, '"cache":"$1-next"');
  if (p.endsWith('index.html')) return d.toString().replace(/(<meta name="marbot-version" content=")([^"]+)/, '$1$2-next');
  return d;
};
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith(BASE)) { r.writeHead(404).end(); return; }
  let p = path.join(dist, u.slice(BASE.length)); if (p.endsWith('/') || p === dist) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(bump(p, d)); });
}).listen(0);
const origin = `http://localhost:${srv.address().port}`;
const url = origin + BASE;

const results = []; let failed = 0;
const ok = (name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) failed++; console.log(results.at(-1)); };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const pg = await ctx.newPage();
const logs = [];
pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
pg.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
pg.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText || ''}`));
const booted = async (label) => {
  const t = Date.now();
  await pg.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('done') || document.getElementById('boot').classList.contains('msg'), null, { timeout: 240000 });
  const st = await pg.evaluate(() => ({ msg: document.getElementById('boot')?.classList.contains('msg') ? document.getElementById('bootMsg').innerText : '', mods: Object.keys(window.__ctx?.modules || {}), ver: window.MARBOT_VERSION }));
  ok(`${label}: loading screen hidden, game booted`, !st.msg && st.mods.length >= 8, `${((Date.now() - t) / 1000).toFixed(1)}s, modules [${st.mods.join(',')}], v${st.ver}${st.msg ? ', panel: ' + st.msg : ''}`);
};

try {
  // 1. online first load (under the /test/ sub-path)
  await pg.goto(url, { timeout: 240000 });
  await booted('online load');
  for (const f of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/icon.svg']) {
    const r = await pg.request.get(url + f); ok(`GET ${f}`, r.status() === 200, `${r.status()} ${r.headers()['content-type']}`);
  }
  const man = await pg.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const j = await (await fetch(l.href)).json(); return { name: j.name, start: new URL(j.start_url, l.href).href, icons: j.icons.length }; });
  ok('manifest parses, start_url inside sub-path', man.name === 'Marbot Masjid' && man.start === url, JSON.stringify(man));

  // 2. service worker installs, precaches and takes control (clients.claim on first install)
  const sw = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 600 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
    const keys = await caches.keys(); const c = keys.find((k) => k.startsWith('marbot-'));
    return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller, cache: c, entries: c ? (await (await caches.open(c)).keys()).length : 0 };
  });
  ok('service worker controls page', sw.controlled && sw.scope === url, `scope ${sw.scope}, cache ${sw.cache} (${sw.entries} entries)`);

  // 3. offline reload still boots the full game
  await ctx.setOffline(true);
  const errsBefore = logs.length;
  await pg.reload({ timeout: 240000 });
  await booted('offline reload');
  const onLine = await pg.evaluate(() => navigator.onLine);
  ok('browser reports offline during reload', onLine === false, 'navigator.onLine=' + onLine);

  // 4. start the game and screenshot it
  // (DOM click: the pulsing button never counts as 'stable' for Playwright's actionability checks)
  if (await pg.evaluate(() => { const b = document.getElementById('tPlay'); if (b) b.click(); return !!b; })) await pg.waitForTimeout(9000);
  await pg.screenshot({ path: shot, timeout: 180000 });
  ok('screenshot saved', fs.existsSync(shot), shot);
  ok('no console errors / failed requests (online + offline)', !logs.some((l) => /^\[(error|pageerror|requestfailed)\]/.test(l)), logs.filter((l) => /^\[(error|pageerror|requestfailed)\]/.test(l)).join(' | '));

  // 5. WebGL fallback page (offline, served by the SW: also proves ?query navigations hit the cache)
  const p2 = await ctx.newPage();
  await p2.goto(url + '?nogl', { timeout: 120000 });
  await p2.waitForSelector('#boot.msg', { timeout: 60000 });
  const fb = await p2.$eval('#bootMsg', (n) => n.innerText);
  ok('WebGL fallback message (offline, ?nogl)', /WebGL 2/.test(fb) && /Perangkat/.test(fb) && /device/.test(fb), fb.split('\n')[0]);
  await p2.close();
  await ctx.setOffline(false);

  // 6. update flow: a new deploy installs in the background, waits, offers "Versi baru tersedia", reloads on tap
  bumped = true;
  const v1 = await pg.evaluate(() => window.MARBOT_VERSION);
  await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await pg.waitForSelector('#bootUpdate', { timeout: 120000 });
  const still = await pg.evaluate(() => window.MARBOT_VERSION);
  ok('update prompt shown, running game untouched', still === v1, await pg.$eval('#bootUpdate', (n) => n.innerText.replace(/\s+/g, ' ')));
  await Promise.all([pg.waitForEvent('load', { timeout: 240000 }), pg.evaluate(() => document.querySelector('#bootUpdate button.primary').click())]);
  await booted('after update');
  const after = await pg.evaluate(async () => ({ v: window.MARBOT_VERSION, caches: (await caches.keys()).filter((k) => k.startsWith('marbot-')) }));
  ok('new version active, old cache removed', after.v === v1 + '-next' && after.caches.length === 1 && after.caches[0].endsWith('-next'), JSON.stringify(after));
  ok('no console errors after update', !logs.some((l) => /^\[(error|pageerror|requestfailed)\]/.test(l)), logs.filter((l) => /^\[(error|pageerror|requestfailed)\]/.test(l)).join(' | '));
} catch (e) {
  ok('smoke run', false, e.message.split('\n')[0]);
}

// 6. fatal error panel when a core file cannot load (fresh context, service workers blocked)
try {
  const c3 = await b.newContext({ viewport: { width: 800, height: 600 }, serviceWorkers: 'block' });
  await c3.route('**/three.module.js', (r) => r.abort());
  const p3 = await c3.newPage();
  await p3.goto(url, { timeout: 120000 });
  await p3.waitForSelector('#boot.msg', { timeout: 60000 });
  const t = await p3.$eval('#bootMsg', (n) => n.innerText);
  ok('error panel when three.js fails to load', /Terjadi kesalahan/.test(t) && !!(await p3.$('#bootMsg button.primary')), t.split('\n').slice(0, 2).join(' / '));
  await c3.close();
} catch (e) { ok('error panel test', false, e.message.split('\n')[0]); }

await b.close(); srv.close();
console.log('\nconsole errors/warnings seen:\n' + (logs.length ? logs.map((l) => '  ' + l).join('\n') : '  (none)'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
