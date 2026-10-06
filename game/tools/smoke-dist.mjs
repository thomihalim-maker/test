// End-to-end smoke test of the production build in headless Chromium (software GL: slow, be patient, ~4 min).
// Serves dist/ under a sub-path (/test/, like GitHub Pages: /test -> 301 /test/, max-age=600) and checks: boot, title -> HUD,
// no console errors, manifest + icons, the service worker (scope, scoped cache name), files opened as pages
// (version.json, og-image) are not swallowed by the game page, offline reload, sandbox rules for URL params,
// 'Reset Progress', the update prompt, ?nosw, the WebGL fallback, the fatal-error panel, and a failing module during
// a slow load (watchdog panel gives way to a small error bar). Saves a screenshot of the running game.
// usage: node tools/smoke-dist.mjs [out.png]        (run `npm run build` first)
// env:   REDIRECT_INDEX=1  answer /test/index.html with 308 -> /test/ (Cloudflare Pages behaviour)
//        PHONE=1           390x844 touch phone, id-ID
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(game, 'dist');
const shot = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'marbot-smoke.png'));
const BASE = '/test/';
const REDIRECT_INDEX = !!process.env.REDIRECT_INDEX, PHONE = !!process.env.PHONE;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
let bumped = false;   // simulates a new deploy: same files, new version + cache name
const bump = (p, d) => {
  if (!bumped) return d;
  if (p.endsWith('sw.js')) return d.toString().replace(/"version":"([^"]+)"/, '"version":"$1-next"').replace(/"cache":"([^"]+)"/, '"cache":"$1-next"');
  if (p.endsWith('index.html')) return d.toString().replace(/(<meta name="marbot-version" content=")([^"]+)/, '$1$2-next');
  return d;
};
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === BASE.slice(0, -1)) { r.writeHead(301, { location: BASE }).end(); return; }
  if (!u.startsWith(BASE)) { r.writeHead(404).end(); return; }
  if (REDIRECT_INDEX && u.endsWith('/index.html')) { r.writeHead(308, { location: u.slice(0, -'index.html'.length) }).end(); return; }
  let p = path.join(dist, u.slice(BASE.length)); if (p.endsWith('/') || p === dist) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => {
    if (e) { r.writeHead(404).end(); return; }
    r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'max-age=600' }); r.end(bump(p, d));
  });
}).listen(0);
const origin = `http://localhost:${srv.address().port}`;
const url = origin + BASE;

const results = []; let failed = 0;
const ok = (name, pass, info = '') => { results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) failed++; console.log(results.at(-1)); };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const view = PHONE ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'id-ID' } : { viewport: { width: 1280, height: 720 } };
const ctx = await b.newContext(view);
const pg = await ctx.newPage();
const logs = [];
const errs = () => logs.filter((l) => /^\[(error|pageerror|requestfailed)\]/.test(l));
pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
pg.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
pg.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText || ''}`));
pg.on('response', (r) => { if (r.status() >= 400) logs.push(`[requestfailed] HTTP ${r.status()} ${r.url()}`); });
const bootDone = () => !document.getElementById('boot') || document.getElementById('boot').classList.contains('done') || document.getElementById('boot').classList.contains('msg');
const booted = async (label, page = pg) => {
  const t = Date.now();
  await page.waitForFunction(bootDone, null, { timeout: 240000, polling: 250 });
  const st = await page.evaluate(() => ({ msg: document.getElementById('boot')?.classList.contains('msg') ? document.getElementById('bootMsg').innerText : '', mods: Object.keys(window.__ctx?.modules || {}), ver: window.MARBOT_VERSION }));
  ok(`${label}: loading screen hidden, game booted`, !st.msg && st.mods.length >= 8, `${((Date.now() - t) / 1000).toFixed(1)}s, modules [${st.mods.join(',')}], v${st.ver}${st.msg ? ', panel: ' + st.msg : ''}`);
};
const stored = (page = pg) => page.evaluate(() => JSON.parse(localStorage.getItem('marbot.save') || 'null'));
const settle = async (page, cond, ms = 90000) => {   // survives navigations (evaluate throws while a page is replaced)
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 500))) { try { if (await page.evaluate(cond)) return true; } catch {} }
  return false;
};

try {
  // 1. online first load (under the /test/ sub-path, entered without the trailing slash)
  await pg.goto(url.slice(0, -1), { timeout: 240000 });
  await booted('online load');
  const t1 = await pg.evaluate(() => ({ url: location.href, play: document.getElementById('tPlay')?.textContent || '', sandbox: window.__marbotSandbox || null, label: !!document.getElementById('bootSandbox') }));
  ok('title screen, /test -> /test/, normal (saving) mode', t1.url === url && !!t1.play && !t1.sandbox && !t1.label, JSON.stringify(t1));
  for (const f of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/icon.svg', 'privacy.html', 'LICENSES.txt']) {
    const r = await pg.request.get(url + f); ok(`GET ${f}`, r.status() === 200, `${r.status()} ${r.headers()['content-type']}`);
  }
  const man = await pg.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const j = await (await fetch(l.href)).json(); return { name: j.name, start: new URL(j.start_url, l.href).href, icons: j.icons.length }; });
  ok('manifest parses, start_url inside sub-path', man.name === 'Marbot Masjid' && man.start === url, JSON.stringify(man));

  // 2. service worker installs, precaches and takes control (clients.claim on first install); cache name carries the scope
  const sw = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 600 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
    const keys = await caches.keys(); const c = keys.find((k) => k.startsWith('marbot-'));
    return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller, cache: c, entries: c ? (await (await caches.open(c)).keys()).length : 0 };
  });
  ok('service worker controls page, cache scoped to /test/', sw.controlled && sw.scope === url && /\|\/test\/$/.test(sw.cache || '') && sw.entries > 50, `scope ${sw.scope}, cache ${sw.cache} (${sw.entries} entries)`);

  // 3. files opened in a tab are the files, not the game page; version.json is never cached
  for (const [f, type] of [['version.json', /json/], ['icons/og-image.png', /image\/png/], ['privacy.html', /html/]]) {
    const p = await ctx.newPage(); const res = await p.goto(url + f, { timeout: 60000 });
    const ct = res.headers()['content-type'] || ''; const body = f.endsWith('.png') ? '' : (await res.text()).slice(0, 40).replace(/\s+/g, ' ');
    ok(`open ${f} while the service worker is active`, type.test(ct) && (f !== 'privacy.html' || /Privasi/.test(await p.title())), `${res.status()} ${ct}${res.fromServiceWorker() ? ' (from SW)' : ''} ${body}`);
    await p.close();
  }
  const vjCached = await pg.evaluate(async () => { await (await fetch('version.json')).text(); const c = (await caches.keys()).find((k) => k.startsWith('marbot-')); return !!(await (await caches.open(c)).match(new URL('version.json', document.baseURI).href)); });
  ok('version.json is fetched live (not cached)', !vjCached);

  // 4. offline reload still boots the full game
  await ctx.setOffline(true);
  await pg.reload({ timeout: 240000 });
  await booted('offline reload');
  const onLine = await pg.evaluate(() => navigator.onLine);
  ok('browser reports offline during reload', onLine === false, 'navigator.onLine=' + onLine);

  // 5. start the game: title -> HUD (DOM click: the pulsing button never counts as 'stable' for Playwright)
  const clicked = await pg.evaluate(() => { const b = document.getElementById('tPlay'); if (b) b.click(); return !!b; });
  const gone = clicked && await settle(pg, () => !document.getElementById('title'), 30000);
  const hud = await pg.evaluate(() => { const h = document.getElementById('hud'); const r = h?.getBoundingClientRect(); return { hud: !!h && !!r && r.width > 0 && getComputedStyle(h).display !== 'none', title: !!document.getElementById('title'), nodes: h ? h.querySelectorAll('*').length : 0 }; });
  ok('tap Start: title removed, HUD visible', clicked && gone && hud.hud && !hud.title, JSON.stringify(hud));
  await pg.waitForTimeout(9000);
  await pg.screenshot({ path: shot, timeout: 180000 });
  ok('screenshot saved', fs.existsSync(shot), shot);
  ok('progress saved (autosave)', !!(await stored()), JSON.stringify(await stored())?.slice(0, 60));
  ok('no console errors / failed requests (online + offline)', !errs().length, errs().join(' | '));

  // 6. WebGL fallback page (offline, served by the SW from the precached index.html, redirected or not)
  const p2 = await ctx.newPage();
  await p2.goto(url + 'index.html?nogl', { timeout: 120000 });
  await p2.waitForSelector('#boot.msg', { timeout: 60000 });
  const fb = await p2.$eval('#bootMsg', (n) => n.innerText);
  ok('WebGL fallback message (offline, index.html?nogl)', /WebGL 2/.test(fb) && /Perangkat/.test(fb) && /device/.test(fb), fb.split('\n')[0]);
  await p2.close();
  await ctx.setOffline(false);

  // 7. URL params: shared-link/tracking params keep saving; the game's debug switches run in a labelled no-save sandbox
  const probe = async (q, human) => {
    const p = await ctx.newPage();
    if (human) await p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
    await p.goto(url + q, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const r = await p.evaluate(() => {
      const K = 'marbot.save', before = localStorage.getItem(K);
      localStorage.setItem(K, '{"probe":1}'); const writes = localStorage.getItem(K) === '{"probe":1}';
      if (writes && before !== null) localStorage.setItem(K, before);   // restore (a removeItem would latch the reset guard)
      let kept = null;
      if (!writes) { localStorage.removeItem(K); kept = before !== null && localStorage.getItem(K) === before; }
      return { sandbox: window.__marbotSandbox || null, writes, kept, label: document.getElementById('bootSandbox')?.textContent || '' };
    });
    await p.close(); return r;
  };
  const share = await probe('?utm_source=ig&utm_medium=social&utm_content=link_in_bio&igshid=abc123&igsh=x&si=xyz&ref=wa&ttclid=1&msclkid=2&mibextid=3&fbclid=4&q=low', true);
  ok('shared-link params (utm_*, igshid, si, ref, ...): normal saving', !share.sandbox && share.writes && !share.label, JSON.stringify(share));
  const dbg = await probe('?cam=pen&hour=18', true);
  ok('debug params (?cam, ?hour): sandbox, save neither written nor removed, label shown', !!dbg.sandbox && !dbg.writes && dbg.kept && /Mode uji|Test mode/.test(dbg.label), JSON.stringify(dbg));
  const bot = await probe('?dev', false);
  ok('?dev: sandbox; label hidden under automation', !!bot.sandbox && !bot.writes && !bot.label, JSON.stringify(bot));

  // 8. 'Hapus Progres' (Settings, hold the button): the save stays deleted across the reload
  await pg.evaluate(async () => { const s = window.__ctx.state; s.day = 5; s.coins = 999; (await import(new URL('src/state.js', document.baseURI).href)).save(s); });
  const before = await stored();
  const hasSet = await pg.evaluate(() => { const s = document.getElementById('setBtn'); if (s) s.click(); return !!s; });
  const via = (hasSet && await pg.waitForSelector('#bReset', { state: 'attached', timeout: 20000 }).then(() => 'settings, hold button', () => '')) || 'state.reset() + reload';
  await Promise.all([pg.waitForEvent('load', { timeout: 240000 }), pg.evaluate(async () => {
    const r = document.getElementById('bReset');
    if (r) r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    else { (await import(new URL('src/state.js', document.baseURI).href)).reset(); location.reload(); }   // same calls as ui.js
  })]);
  await booted('after Reset Progress');
  const after = await stored();
  ok(`Reset Progress (${via}) clears the save for good`, before?.day === 5 && (!after || (after.day === 1 && after.coins !== 999)), `before day ${before?.day} coins ${before?.coins} -> after ${after ? `day ${after.day} coins ${after.coins}` : 'no save'}, button "${await pg.evaluate(() => document.getElementById('tPlay')?.textContent)}"`);

  // 9. update flow: a new deploy installs in the background, waits, offers "Versi baru tersedia", reloads on tap
  bumped = true;
  const v1 = await pg.evaluate(() => window.MARBOT_VERSION);
  await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await pg.waitForSelector('#bootUpdate', { timeout: 120000 });
  const still = await pg.evaluate(() => window.MARBOT_VERSION);
  ok('update prompt shown, running game untouched', still === v1, await pg.$eval('#bootUpdate', (n) => n.innerText.replace(/\s+/g, ' ')));
  await Promise.all([pg.waitForEvent('load', { timeout: 240000 }), pg.evaluate(() => document.querySelector('#bootUpdate button.primary').click())]);
  await booted('after update');
  const upd = await pg.evaluate(async () => ({ v: window.MARBOT_VERSION, caches: (await caches.keys()).filter((k) => k.startsWith('marbot-')) }));
  ok('new version active, old cache removed', upd.v === v1 + '-next' && upd.caches.length === 1 && upd.caches[0].includes('-next|/test/'), JSON.stringify(upd));

  // 10. ?nosw: drops this scope's worker + caches before the game loads, reloads uncontrolled, keeps the save
  const saveBefore = await stored();
  await pg.goto(url + '?nosw', { timeout: 240000 }).catch(() => {});   // boot.js replaces this navigation with a reload
  const free = await settle(pg, () => document.readyState === 'complete' && !navigator.serviceWorker.controller, 90000);
  await booted('?nosw');
  const ns = await pg.evaluate(async () => ({ controlled: !!navigator.serviceWorker.controller, regs: (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope), caches: (await caches.keys()).filter((k) => k.startsWith('marbot-')), save: localStorage.getItem('marbot.save') !== null }));
  ok('?nosw: no worker, no game caches, save kept', free && !ns.controlled && !ns.regs.length && !ns.caches.length && ns.save === !!saveBefore, JSON.stringify(ns));
  ok('no console errors after reset / update / nosw', !errs().length, errs().join(' | '));
} catch (e) {
  ok('smoke run', false, e.message.split('\n')[0]);
}
await ctx.close();   // the running game would otherwise compete for the (software) GPU with the next contexts

// 11. fatal error panel when a core file cannot load (fresh context, service workers blocked)
try {
  const c3 = await b.newContext({ viewport: { width: 800, height: 600 }, serviceWorkers: 'block' });
  await c3.route('**/three.module.js', (r) => r.abort());
  const p3 = await c3.newPage();
  await p3.goto(url, { timeout: 120000 });
  await p3.waitForSelector('#boot.msg', { timeout: 60000 });
  const t = await p3.$eval('#bootMsg', (n) => n.innerText);
  const code = await p3.$eval('#bootMsg code', (n) => ({ text: n.textContent, ws: getComputedStyle(n).whiteSpace })).catch(() => ({ text: '', ws: '' }));
  ok('error panel when three.js fails to load', /Terjadi kesalahan|Something went wrong/.test(t) && !!(await p3.$('#bootMsg button.primary')) && !!code.text && code.ws === 'pre-wrap', t.split('\n').slice(0, 2).join(' / ') + ' | ' + code.text.replace(/\n/g, ' ⏎ '));
  await c3.close();
} catch (e) { ok('error panel test', false, e.message.split('\n')[0]); }

// 12. a module fails during a slow load: the watchdog panel appears, then gives way when the game starts after all,
//     leaving the small error bar that names the module (main.js 'game:error').
try {
  const c4 = await b.newContext({ viewport: { width: 1000, height: 640 }, serviceWorkers: 'block' });
  await c4.route('**/src/fx/fx.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: "export async function init(){ throw new Error('smoke: fx init failed'); }" }));
  // hold the next module until the loader has been idle for 26 s after the failure (watchdog: error pending + 20 s idle)
  let fxFailedAt = 0;
  await c4.route('**/src/game/progress.js', async (r) => { for (let i = 0; i < 400 && !(fxFailedAt && Date.now() - fxFailedAt > 26000); i++) await new Promise((res) => setTimeout(res, 500)); await r.continue(); });
  const p4 = await c4.newPage();
  p4.on('console', (m) => { if (/module failed: fx\/fx/.test(m.text())) fxFailedAt = Date.now(); });
  const t0 = Date.now();
  await p4.goto(url, { timeout: 120000 });
  await p4.waitForSelector('#boot.msg', { timeout: 200000 });
  const panelAt = ((Date.now() - t0) / 1000).toFixed(0);
  await p4.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('done'), null, { timeout: 240000, polling: 500 });
  const st = await p4.evaluate(() => ({ mods: Object.keys(window.__ctx?.modules || {}), bar: document.querySelector('.boot-toast.err')?.title || '' }));
  ok('slow load + failed module: watchdog panel, then the game takes over', st.mods.length === 7 && !st.mods.includes('fx'), `panel at ${panelAt}s, game at ${((Date.now() - t0) / 1000).toFixed(0)}s, modules [${st.mods.join(',')}]`);
  ok('failed module reported in the error bar', /fx\/fx/.test(st.bar) && /smoke: fx init failed/.test(st.bar), st.bar.replace(/\n/g, ' ⏎ '));
  await c4.close();
} catch (e) { ok('failed-module test', false, e.message.split('\n')[0]); }

await b.close(); srv.close();
console.log('\nconsole errors/warnings seen (main page):\n' + (logs.length ? logs.map((l) => '  ' + l).join('\n') : '  (none)'));
console.log(`\n${results.length - failed}/${results.length} checks passed` + (REDIRECT_INDEX ? '  [REDIRECT_INDEX]' : '') + (PHONE ? '  [PHONE]' : ''));
process.exit(failed ? 1 : 0);
