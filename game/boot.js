/* Marbot Masjid boot loader (classic script, runs before any module).
   - loading screen + progress (main.js dispatches 'game:progress' / 'game:ready' / 'game:error')
   - WebGL2 check with a friendly fallback, top-level error panel instead of a blank screen
   - save guard: 'Hapus Progres' stays deleted; debug URL params (?cam, ?stage, ?demo ...) run in a no-save sandbox
   - service worker registration + "new version" prompt (built output only), ?nosw escape hatch
   Everything here is optional for the game itself: src/main.js runs fine without it (e.g. tools/build-play.sh). */
(function () {
  'use strict';
  var doc = document, win = window, nav = navigator;
  var meta = doc.querySelector('meta[name="marbot-version"]');
  var VERSION = (meta && meta.content) || 'dev';
  win.MARBOT_VERSION = VERSION;

  var params; try { params = new URLSearchParams(location.search); } catch (e) { params = { has: function () { return false; }, get: function () { return null; }, forEach: function () {} }; }

  // ---- language: saved choice, else browser language (Indonesian first) ----
  var lang = 'id';
  try { var sv = JSON.parse(localStorage.getItem('marbot.save') || 'null'); if (sv && (sv.lang === 'en' || sv.lang === 'id')) lang = sv.lang; else if (!/^(id|ms|jv|su)\b/i.test(nav.language || 'id')) lang = 'en'; } catch (e) {}
  if (params.has('lang')) lang = params.get('lang') === 'en' ? 'en' : 'id';
  var T = {
    id: { loading: 'Memuat…', err: 'Terjadi kesalahan', errSub: 'Maaf, game berhenti. Coba muat ulang ya.', reload: 'Muat ulang', clear: 'Muat ulang tanpa cache',
          errBar: 'Terjadi kesalahan — muat ulang', update: 'Versi baru tersedia', updateBtn: 'Muat ulang', close: 'Tutup', sandbox: 'Mode uji — progres tidak disimpan',
          steps: { world: 'Menanam pepohonan…', audio: 'Menyetel bedug…', masjid: 'Menyiapkan masjid…', characters: 'Memanggil marbot…', animals: 'Menggiring kambing…', fx: 'Menabur kilauan…', progress: 'Menyusun tugas harian…', ui: 'Merapikan papan…' } },
    en: { loading: 'Loading…', err: 'Something went wrong', errSub: 'Sorry, the game stopped. Please reload.', reload: 'Reload', clear: 'Reload without cache',
          errBar: 'Something went wrong — reload', update: 'New version available', updateBtn: 'Reload', close: 'Close', sandbox: 'Test mode — progress is not saved',
          steps: { world: 'Planting trees…', audio: 'Tuning the bedug…', masjid: 'Preparing the masjid…', characters: 'Calling the marbot…', animals: 'Herding the goats…', fx: 'Sprinkling sparkles…', progress: 'Writing today\'s tasks…', ui: 'Tidying the board…' } }
  }[lang];

  var $ = function (id) { return doc.getElementById(id); };
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, fn) { var b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }

  // ---- save guard ----
  // 1. 'Hapus Progres' (ui.js: reset(); location.reload()) must stay deleted. While the reload unloads the page, main.js
  //    still saves the in-memory state (visibilitychange/pagehide), so once marbot.save has been removed nothing on this
  //    page may write it again. (Code that resets must reload; a reset without a reload would stop saving for this visit.)
  // 2. Debug sandbox: URL params that only developers use must never change a player's real save. Opt-in: only the params
  //    the game itself reads as debug switches (plus ?dev) turn it on. Player params (?q, ?quality, ?lang, ?nosw,
  //    ?fixeddpr) and anything unknown (utm_*, fbclid, igshid, si, ref, ttclid ... from shared links) are ignored.
  //    tools/build.mjs adds every param src/ reads to this list in dist/boot.js, so new debug switches are covered too.
  var DEBUG_PARAMS = 'act anim at autowalk cam carry clean crowd custom cutaway decor demo dev dirt dist event fill freeze grow hint hour hourspeed hungry introhold joy lineup night nt panel pen phase pitch pose prayer prayfast prayopen show skip slots stage tab warp weather yaw'.split(' '); // build:debug-params
  var isDebug = {}; for (var i = 0; i < DEBUG_PARAMS.length; i++) isDebug[DEBUG_PARAMS[i]] = 1;
  var sandbox = []; params.forEach(function (_, k) { if (isDebug[k] === 1 && sandbox.indexOf(k) < 0) sandbox.push(k); });
  var KEY = 'marbot.save', wiped = false, LS = null;
  try { LS = win.localStorage; } catch (e) {}
  if (LS && win.Storage) {
    try {
      var SP = Storage.prototype, setItem = SP.setItem, removeItem = SP.removeItem, clear = SP.clear;
      SP.setItem = function (k) { if (this === LS && String(k) === KEY && (wiped || sandbox.length)) return; return setItem.apply(this, arguments); };
      SP.removeItem = function (k) { if (this === LS && String(k) === KEY) { if (sandbox.length) return; wiped = true; } return removeItem.apply(this, arguments); };
      SP.clear = function () {
        if (this === LS && sandbox.length) { var keep = this.getItem(KEY); clear.call(this); if (keep !== null) setItem.call(this, KEY, keep); return; }
        if (this === LS) wiped = true;
        return clear.call(this);
      };
    } catch (e) {}
  }
  if (sandbox.length) {
    win.__marbotSandbox = sandbox;
    try { console.info('[marbot] debug params (' + sandbox.join(', ') + '): sandbox mode, progress is not saved'); } catch (e) {}
    // Visible for people; hidden under automation so screenshot tools (tools/shot.mjs) stay clean.
    if (!nav.webdriver) { var badge = el('div', 'boot-sandbox', T.sandbox); badge.id = 'bootSandbox'; badge.setAttribute('role', 'status'); doc.body.appendChild(badge); }
  }

  // ---- service worker helpers (scope-limited: on github.io every project site of an account shares one origin) ----
  var isNative = !!(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
  var swOK = 'serviceWorker' in nav && /^https?:$/.test(location.protocol) && !isNative;
  var SCOPE = ''; try { SCOPE = new URL('./', doc.baseURI).href; } catch (e) {}
  var TAG = '|' + (SCOPE ? new URL(SCOPE).pathname : '/');            // cache names end with the scope path (see sw.js)
  function ownCache(k) { return k.indexOf('marbot-') === 0 && k.slice(-TAG.length) === TAG; }
  function ownReg() {
    if (!swOK) return Promise.resolve(null);
    return nav.serviceWorker.getRegistrations().then(function (rs) { for (var j = 0; j < rs.length; j++) if (rs[j].scope === SCOPE) return rs[j]; return null; });
  }
  function dropSW() {                                 // unregister this game's worker and delete its caches (never the save)
    var jobs = [];
    try { if (swOK) jobs.push(ownReg().then(function (r) { return r && r.unregister(); })); } catch (e) {}
    try { if (win.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.filter(ownCache).map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    return Promise.all(jobs).catch(function () {});
  }
  function clearAndReload() { dropSW().then(function () { location.reload(); }); }
  // Reload, but first activate an update that is already downloaded and waiting (a plain reload keeps the old worker,
  // so a broken cached build could never be replaced from the error panel).
  function smartReload() {
    if (!swOK || !nav.serviceWorker.controller) return location.reload();
    ownReg().then(function (r) {
      if (!r || !r.waiting) return location.reload();
      var t = setTimeout(clearAndReload, 5000);
      nav.serviceWorker.addEventListener('controllerchange', function () { clearTimeout(t); location.reload(); });
      r.waiting.postMessage({ type: 'SKIP_WAITING' });
    }).catch(function () { location.reload(); });
  }

  // ?nosw escape hatch, handled before the game loads (so it also rescues a cached build that hangs or fails at boot):
  // drop the worker + caches, reload once uncontrolled, and run this visit from the network without a service worker.
  var hold = false;
  if (swOK && params.has('nosw')) {
    var again = false;
    try { again = Date.now() - (+sessionStorage.getItem('marbot.nosw') || 0) < 15000; } catch (e) {}
    var dropping = dropSW();
    if (nav.serviceWorker.controller && !again) {
      hold = true;
      try { sessionStorage.setItem('marbot.nosw', String(Date.now())); } catch (e) {}
      dropping.then(function () { location.reload(); });
    }
  }

  var boot = $('boot'), bar = $('bootBar'), label = $('bootLabel'), pb = $('bootProgress');
  var ver = $('bootVer'); if (ver) ver.textContent = VERSION === 'dev' ? '' : 'v' + VERSION;
  if (label) label.textContent = T.loading;

  // ---- progress ----
  var shown = 0, target = 0.04, ready = false, failed = false, softFail = false;
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
  var lastStep = Date.now();
  win.addEventListener('game:progress', function (e) {
    var d = e.detail || {}, f = 0.3 + 0.65 * ((d.done || 0) / (d.total || 1)); lastStep = Date.now();
    target = Math.max(target, f); setP(Math.max(shown, f));
    if (label && d.next) label.textContent = T.steps[String(d.next).split('/').pop()] || T.loading;
  });
  function finish() {
    // A panel raised by the watchdog (slow device, error pending) gives way if the game does start after all.
    if (ready || (failed && !softFail)) return;
    ready = true; failed = false; setP(1);
    if (boot) { boot.classList.add('done'); setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700); }
    if (pending) softError(pending);                 // something failed while loading but the game still started
    registerSW();
    keepSave();
  }
  win.addEventListener('game:ready', finish);

  // ---- panels ----
  function fatal(title, sub, detail, withReload) {
    if (failed) return; failed = true; clearInterval(trickle);
    var box = $('bootMsg'); if (!box) return;
    if (boot) boot.classList.add('msg');
    box.innerHTML = '';
    box.appendChild(el('h1', '', title));
    for (var j = 0; j < sub.length; j++) box.appendChild(el('p', j ? 'en' : '', sub[j]));
    if (detail) box.appendChild(el('code', '', String(detail).slice(0, 1500)));
    if (withReload) {
      var row = el('div', 'row');
      row.appendChild(btn(T.reload, 'primary', smartReload));
      row.appendChild(btn(T.clear, 'ghost', clearAndReload));
      box.appendChild(row);
    }
  }
  var barShown = false;
  function softError(detail) {                       // after the game is running: small, dismissible
    if (barShown) return; barShown = true;
    var b = el('div', 'boot-toast err'); b.setAttribute('role', 'alert');
    b.appendChild(el('span', '', T.errBar));
    b.appendChild(btn(T.reload, 'primary', smartReload));
    b.appendChild(btn('×', 'x', function () { b.parentNode && b.parentNode.removeChild(b); barShown = false; }));
    b.title = String(detail || '').slice(0, 600);
    doc.body.appendChild(b);
  }
  // "message @ file:line:col" + the top stack frame, with URLs shortened to the game folder (readable on a phone screenshot).
  function short(s) { return SCOPE ? String(s).split(SCOPE).join('') : String(s); }
  function describe(x, file, line, col) {
    try {
      var msg = x && x.message != null ? String(x.message) : String(x);
      if (x && x.name && x.name !== 'Error' && msg.indexOf(x.name) !== 0) msg = x.name + ': ' + msg;
      var where = file ? short(file) + (line ? ':' + line + (col ? ':' + col : '') : '') : '';
      var top = '', ls = x && x.stack ? String(x.stack).split('\n') : [];
      for (var j = 0; j < ls.length; j++) { var l = ls[j].replace(/^\s+|\s+$/g, ''); if (/:\d+(:\d+)?\)?$/.test(l)) { top = short(l.replace(/^at /, '')); break; } }
      return msg + (where ? '\n@ ' + where : '') + (top && (!where || top.indexOf(where) < 0) ? '\n' + top : '');
    } catch (e) { return 'error'; }
  }
  function benign(msg) { return /ResizeObserver loop|NotAllowedError|AbortError|play\(\) request was interrupted/i.test(msg || ''); }
  function hardFail(msg) {                            // the game cannot start: replace the loader with a panel
    if (/WebGL|webglcontext|context.*(lost|creat)/i.test(msg)) return noWebGL(msg);
    fatal(T.err, [T.errSub, lang === 'id' ? 'Something went wrong — please reload.' : 'Terjadi kesalahan — muat ulang.'], msg, true);
  }
  // Errors while loading are not always fatal (main.js skips a broken module), so they are held until we know:
  // the game starts -> small dismissible bar; it never gets going -> full panel (see the watchdog below).
  var pending = null;
  function onFail(msg) {
    if (benign(msg)) return;
    if (ready) return softError(msg);
    if (!pending) pending = msg;
  }
  var watchdog = setInterval(function () {
    if (ready || failed) return clearInterval(watchdog);
    var idle = Date.now() - lastStep;
    if (pending && idle > 20000) { softFail = true; hardFail(pending); }
    else if (idle > 45000 && label && !$('bootSlow')) {   // very slow device or a hang: offer a way out, keep loading
      var b = btn(T.reload, 'ghost', smartReload); b.id = 'bootSlow';
      label.parentNode.insertBefore(b, label.nextSibling);
    }
  }, 1000);
  win.addEventListener('error', function (e) {
    if (e.filename && !/^https?:|^capacitor:/.test(e.filename)) return;            // extensions etc.
    if (!e.error && /^Script error\.?$/.test(e.message || '')) return;              // opaque cross-origin
    onFail(describe(e.error || e.message, e.filename, e.lineno, e.colno));
  });
  win.addEventListener('unhandledrejection', function (e) { if (!ready) onFail(describe(e.reason)); });   // after start: console only
  // main.js catches a module whose init throws and keeps going without it; surface that instead of a silent gap.
  win.addEventListener('game:error', function (e) { var d = e.detail || {}; onFail('module ' + (d.name || '?') + ' failed: ' + (d.message || 'error') + (d.where ? '\n' + short(d.where) : '')); });

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

  // ---- ask the browser to keep the save (eviction under storage pressure / inactivity) ----
  // Chrome and Safari decide silently; Firefox would show a permission prompt, so there only for the installed app.
  function keepSave() {
    try {
      if (isNative || sandbox.length || !nav.storage || !nav.storage.persist) return;
      var installed = (win.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)').matches) || nav.standalone === true;
      if (!installed && /Firefox\//.test(nav.userAgent)) return;
      (nav.storage.persisted ? nav.storage.persisted() : Promise.resolve(false)).then(function (p) { if (!p) return nav.storage.persist(); }).catch(function () {});
    } catch (e) {}
  }

  // ---- service worker (built output only; never on file:, in Capacitor, or with ?nosw) ----
  function registerSW() {
    if (!swOK || params.has('nosw')) return;
    if (VERSION === 'dev') return;                    // source tree: no precache list, never cache dev files
    var accepted = false;
    nav.serviceWorker.addEventListener('controllerchange', function () { if (accepted) { accepted = false; location.reload(); } });
    nav.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      if (!reg) return;
      function offer(w) {
        if (!w || !nav.serviceWorker.controller || $('bootUpdate')) return;
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

  // ---- Android (Capacitor) back button, only if @capacitor/app is installed: close panels first, press twice to leave ----
  var App = isNative && win.Capacitor.Plugins && win.Capacitor.Plugins.App;
  if (App && App.addListener) {
    var lastBack = 0;
    App.addListener('backButton', function () {
      var now = Date.now();
      if (now - lastBack < 1600) { if (App.minimizeApp) App.minimizeApp(); else App.exitApp(); return; }
      lastBack = now;
      try { win.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {}   // ui.js closes open panels
      var h = el('div', 'boot-toast'); h.textContent = lang === 'en' ? 'Press back again to leave' : 'Tekan kembali sekali lagi untuk keluar';
      doc.body.appendChild(h); setTimeout(function () { h.parentNode && h.parentNode.removeChild(h); }, 1600);
    });
  }

  // ---- go ----
  if (hold) return;                                   // ?nosw: reloading without the service worker
  if (params.has('nogl') || !hasWebGL2()) { noWebGL(); return; }
  var fallback, load;
  // import() is wrapped so a very old browser gets the friendly message instead of a syntax error.
  try { load = new Function('u', 'return import(u)'); } catch (e) { noWebGL('ES modules unsupported'); return; }
  load(new URL('src/main.js', doc.baseURI).href).then(function () {
    // main.js finished its top-level work; 'game:ready' normally follows on the first frame.
    target = 0.98; fallback = setTimeout(finish, 8000);
  }, function (e) { hardFail(describe(e)); });
  win.addEventListener('game:ready', function () { clearTimeout(fallback); });
})();
