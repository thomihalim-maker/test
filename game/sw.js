/* Marbot Masjid service worker: offline play.
   The BUILD line below is rewritten by tools/build.mjs (version, cache name, full precache list).
   In the source tree it is inert: boot.js never registers it while the version is 'dev'. */
const BUILD = {"version":"dev","cache":"marbot-dev","files":[]};

const CACHE = BUILD.cache;
const SCOPE = self.registration ? self.registration.scope : self.location.href;
const abs = (p) => new URL(p, SCOPE).href;
const INDEX = abs('index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache:'reload' skips the HTTP cache so a new version never precaches stale files.
    await cache.addAll(BUILD.files.map((p) => new Request(abs(p), { cache: 'reload' })));
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
    await Promise.all(keys.filter((k) => k.startsWith('marbot-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(SCOPE)) return;   // let the network handle it
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const nav = req.mode === 'navigate';
    // Debug/query params (?cam=..., ?q=low) map onto the same cached page.
    const hit = await cache.match(req, { ignoreSearch: nav }) || (nav ? await cache.match(INDEX) : undefined);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (nav) { const page = await cache.match(INDEX); if (page) return page; }
      throw err;
    }
  })());
});
