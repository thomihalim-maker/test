/* Marbot Masjid service worker: offline play.
   The BUILD line below is rewritten by tools/build.mjs (version, cache name, full precache list).
   In the source tree it is inert: boot.js never registers it while the version is 'dev'. */
const BUILD = {"version":"dev","cache":"marbot-dev","files":[]};

const SCOPE = self.registration.scope;
const abs = (p) => new URL(p, SCOPE).href;
// CacheStorage is per origin, and on github.io every project site of an account shares one origin. Cache names end with
// this scope's path, so another copy of the game (a staging repo, a renamed one) never deletes this copy's files.
// boot.js builds the same suffix for "Muat ulang tanpa cache" and ?nosw.
const TAG = '|' + new URL(SCOPE).pathname;
const CACHE = BUILD.cache + TAG;
const INDEX = abs('index.html');
const LIVE = new Set([abs('version.json')]);   // always from the network: shows what is deployed right now

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const existed = await caches.has(CACHE);
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(BUILD.files.map(async (p) => {
        // cache:'reload' skips the HTTP cache so a new version never precaches stale files.
        const req = new Request(abs(p), { cache: 'reload' });
        let res = await fetch(req);
        if (!res.ok) throw new Error(`precache ${p}: HTTP ${res.status}`);
        // Some hosts redirect index.html -> ./ (Cloudflare Pages answers 308). A redirected response cannot be served
        // to a navigation, so store a plain copy of the final response under the requested URL.
        if (res.redirected) res = new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
        await cache.put(req, res);
      }));
    } catch (err) {
      if (!existed) await caches.delete(CACHE);   // no half-filled cache left behind; the browser retries the install later
      throw err;
    }
    // First install activates right away (there is no old version to protect). Updates wait until the
    // page asks (SKIP_WAITING after the player taps "Muat ulang") or until every tab/app is closed,
    // so a running game never mixes files from two versions.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('marbot-') && k.endsWith(TAG) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// A navigation that is not precached falls back to the game only when it looks like a page (./, ./index.html, ./x/);
// files such as icons/og-image.png opened in a tab come from the network as themselves.
const isPage = (pathname) => { const last = pathname.slice(pathname.lastIndexOf('/') + 1); return last === '' || /\.html?$/i.test(last) || !last.includes('.'); };

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(SCOPE)) return;   // let the network handle it
  if (LIVE.has(url.origin + url.pathname)) return;
  const nav = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Query params (?cam=..., ?q=low) map onto the same cached page.
    const hit = await cache.match(req, { ignoreSearch: nav });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (!nav && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (nav && isPage(url.pathname)) { const page = await cache.match(INDEX); if (page) return page; }   // offline
      throw err;
    }
  })());
});
