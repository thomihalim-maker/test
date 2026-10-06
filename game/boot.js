/* Marbot Masjid boot loader (classic script, runs before any module).
   - loading screen + progress (main.js dispatches 'game:progress' / 'game:ready')
   - WebGL2 check with a friendly fallback, top-level error panel instead of a blank screen
   - debug-param sandbox (?demo, ?stage, ... never overwrite the real save)
   - service worker registration + "new version" prompt (built output only)
   Everything here is optional for the game itself: src/main.js runs fine without it (e.g. tools/build-play.sh). */
(function () {
  'use strict';
  var doc = document, win = window;
  var meta = doc.querySelector('meta[name="marbot-version"]');
  var VERSION = (meta && meta.content) || 'dev';
  win.MARBOT_VERSION = VERSION;

  var params; try { params = new URLSearchParams(location.search); } catch (e) { params = { has: function () { return false; }, forEach: function () {} }; }

  // ---- language: saved choice, else browser language (Indonesian first) ----
  var lang = 'id';
  try { var sv = JSON.parse(localStorage.getItem('marbot.save') || 'null'); if (sv && (sv.lang === 'en' || sv.lang === 'id')) lang = sv.lang; else if (!/^(id|ms|jv|su)\b/i.test(navigator.language || 'id')) lang = 'en'; } catch (e) {}
  if (params.has('lang')) lang = params.get('lang') === 'en' ? 'en' : 'id';
  var T = {
    id: { loading: 'Memuat…', err: 'Terjadi kesalahan', errSub: 'Maaf, game berhenti. Coba muat ulang ya.', reload: 'Muat ulang', clear: 'Muat ulang tanpa cache',
          errBar: 'Terjadi kesalahan — muat ulang', update: 'Versi baru tersedia', updateBtn: 'Muat ulang', close: 'Tutup',
          steps: { world: 'Menanam pepohonan…', audio: 'Menyetel bedug…', masjid: 'Menyiapkan masjid…', characters: 'Memanggil marbot…', animals: 'Menggiring kambing…', fx: 'Menabur kilauan…', progress: 'Menyusun tugas harian…', ui: 'Merapikan papan…' } },
    en: { loading: 'Loading…', err: 'Something went wrong', errSub: 'Sorry, the game stopped. Please reload.', reload: 'Reload', clear: 'Reload without cache',
          errBar: 'Something went wrong — reload', update: 'New version available', updateBtn: 'Reload', close: 'Close',
          steps: { world: 'Planting trees…', audio: 'Tuning the bedug…', masjid: 'Preparing the masjid…', characters: 'Calling the marbot…', animals: 'Herding the goats…', fx: 'Sprinkling sparkles…', progress: 'Writing today\'s tasks…', ui: 'Tidying the board…' } }
  }[lang];

  var $ = function (id) { return doc.getElementById(id); };
  var boot = $('boot'), bar = $('bootBar'), label = $('bootLabel'), pb = $('bootProgress');
  var ver = $('bootVer'); if (ver) ver.textContent = VERSION === 'dev' ? '' : 'v' + VERSION;
  if (label) label.textContent = T.loading;

  // ---- progress ----
  var shown = 0, target = 0.04, ready = false, failed = false;
  function setP(f) {
    shown = f;
    if (bar) bar.style.transform = 'scaleX(' + Math.max(0.02, Math.min(1, f)).toFixed(3) + ')';
    if (pb) pb.setAttribute('aria-valuenow', String(Math.round(f * 100)));
  }
  var trickle = setInterval(function () {            // creep while the module graph downloads
    if (ready || failed) return clearInterval(trickle);
    if (target < 0.3) target += (0.3 - target) * 0.06;
    if (shown < target) setP(shown + (target - shown) * 0.35);
  }, 120);
  win.addEventListener('game:progress', function (e) {
    var d = e.detail || {}, f = 0.3 + 0.65 * ((d.done || 0) / (d.total || 1));
    target = Math.max(target, f); setP(Math.max(shown, f));
    if (label && d.next) label.textContent = T.steps[String(d.next).split('/').pop()] || T.loading;
  });
  function finish() {
    if (ready || failed) return; ready = true; setP(1);
    if (boot) { boot.classList.add('done'); setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700); }
    registerSW();
  }
  win.addEventListener('game:ready', finish);

  // ---- panels ----
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, fn) { var b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function clearAndReload() {
    var jobs = [];
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    try { if (win.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('marbot-') === 0; }).map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  }
  function fatal(title, sub, detail, withReload) {
    if (failed) return; failed = true; clearInterval(trickle);
    var box = $('bootMsg'); if (!box) return;
    if (boot) boot.classList.add('msg');
    box.innerHTML = '';
    box.appendChild(el('h1', '', title));
    for (var i = 0; i < sub.length; i++) box.appendChild(el('p', i ? 'en' : '', sub[i]));
    if (detail) box.appendChild(el('code', '', String(detail).slice(0, 240)));
    if (withReload) {
      var row = el('div', 'row');
      row.appendChild(btn(T.reload, 'primary', function () { location.reload(); }));
      row.appendChild(btn(T.clear, 'ghost', clearAndReload));
      box.appendChild(row);
    }
  }
  var barShown = false;
  function softError(detail) {                       // after the game is running: small, dismissible
    if (barShown) return; barShown = true;
    var b = el('div', 'boot-toast err'); b.setAttribute('role', 'alert');
    b.appendChild(el('span', '', T.errBar));
    b.appendChild(btn(T.reload, 'primary', function () { location.reload(); }));
    b.appendChild(btn('×', 'x', function () { b.parentNode && b.parentNode.removeChild(b); barShown = false; }));
    b.title = String(detail || '').slice(0, 300);
    doc.body.appendChild(b);
  }
  function describe(x) { try { return x && (x.stack || x.message) ? (x.message || String(x)) : String(x); } catch (e) { return 'error'; } }
  function benign(msg) { return /ResizeObserver loop|NotAllowedError|AbortError|play\(\) request was interrupted/i.test(msg || ''); }
  function onFail(msg) {
    if (benign(msg)) return;
    if (ready) return softError(msg);
    if (/WebGL|webglcontext|context.*(lost|creat)/i.test(msg)) return noWebGL(msg);
    fatal(T.err, [T.errSub, lang === 'id' ? 'Something went wrong — please reload.' : 'Terjadi kesalahan — muat ulang.'], msg, true);
  }
  win.addEventListener('error', function (e) {
    if (e.filename && !/^https?:|^capacitor:/.test(e.filename)) return;            // extensions etc.
    if (!e.error && /^Script error\.?$/.test(e.message || '')) return;              // opaque cross-origin
    onFail(describe(e.error || e.message));
  });
  win.addEventListener('unhandledrejection', function (e) { if (!ready) onFail(describe(e.reason)); else try { console.warn('[marbot] unhandled rejection', e.reason); } catch (_) {} });

  function noWebGL(detail) {
    fatal('WebGL 2 tidak tersedia', [
      'Perangkat atau browser ini belum bisa menjalankan game 3D. Coba buka di Chrome, Firefox, Edge, atau Safari versi terbaru, dan pastikan akselerasi perangkat keras (hardware acceleration) aktif.',
      'This device or browser cannot run the 3D game (WebGL 2 is unavailable). Please try the latest Chrome, Firefox, Edge or Safari with hardware acceleration enabled.'
    ], detail, !!detail);
  }
  function hasWebGL2() {
    try {
      if (!win.WebGL2RenderingContext) return false;
      var c = doc.createElement('canvas'), gl = c.getContext('webgl2');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  // ---- debug sandbox: dev/test URL params must never overwrite a player's real progress ----
  var PLAYER_PARAMS = { q: 1, quality: 1, lang: 1, nosw: 1, fixeddpr: 1, utm_source: 1, utm_medium: 1, utm_campaign: 1, fbclid: 1, gclid: 1 };
  var debug = [];
  params.forEach(function (_, k) { if (!PLAYER_PARAMS[k]) debug.push(k); });
  if (debug.length && win.Storage) {
    try {
      var set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'marbot.save' && this === win.localStorage) return; return set.call(this, k, v); };
      win.__marbotSandbox = debug;
      console.info('[marbot] debug params (' + debug.join(', ') + '): sandbox mode, progress is not saved');
    } catch (e) {}
  }

  // ---- service worker (built output only; never on file:, in Capacitor, or with ?nosw) ----
  var isNative = !!(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || isNative) return;
    if (params.has('nosw')) {                          // escape hatch: drop any installed worker + caches
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      if (win.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { if (k.indexOf('marbot-') === 0) caches.delete(k); }); }).catch(function () {});
      return;
    }
    if (VERSION === 'dev') return;                    // source tree: no precache list, never cache dev files
    var accepted = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (accepted) { accepted = false; location.reload(); } });
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      function offer(w) {
        if (!w || !navigator.serviceWorker.controller || $('bootUpdate')) return;
        var b = el('div', 'boot-toast'); b.id = 'bootUpdate'; b.setAttribute('role', 'status');
        b.appendChild(el('span', '', T.update));
        b.appendChild(btn(T.updateBtn, 'primary', function () { accepted = true; w.postMessage({ type: 'SKIP_WAITING' }); b.parentNode && b.parentNode.removeChild(b); }));
        b.appendChild(btn('×', 'x', function () { b.parentNode && b.parentNode.removeChild(b); }));
        doc.body.appendChild(b);
      }
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed') offer(w); });
      });
      // Long-lived sessions (installed PWA left open): look for updates when the app comes back.
      doc.addEventListener('visibilitychange', function () { if (!doc.hidden) reg.update().catch(function () {}); });
    }).catch(function (e) { try { console.warn('[marbot] service worker registration failed', e); } catch (_) {} });
  }

  // ---- go ----
  if (params.has('nogl') || !hasWebGL2()) { noWebGL(); return; }
  var fallback, load;
  // import() is wrapped so a very old browser gets the friendly message instead of a syntax error.
  try { load = new Function('u', 'return import(u)'); } catch (e) { noWebGL('ES modules unsupported'); return; }
  load(new URL('src/main.js', doc.baseURI).href).then(function () {
    // main.js finished its top-level work; 'game:ready' normally follows on the first frame.
    target = 0.98; fallback = setTimeout(finish, 8000);
  }, function (e) { onFail(describe(e)); });
  win.addEventListener('game:ready', function () { clearTimeout(fallback); });
})();
