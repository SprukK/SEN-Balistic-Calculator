/* SEN Ballistics service worker.

   STABLE ENTRY: the app IS index.html (no redirect). The installed PWA launches index.html,
   whose URL never changes between releases — this is what keeps the install current instead of
   pinned to an old versioned filename.

   STRATEGY:
   - HTML documents (index.html): NETWORK-FIRST — a fresh deploy is picked up on the next launch
     when online; falls back to the cached copy when offline, or when the network hasn't answered
     within 3 s (weak signal at the range). Only OK responses replace the cached copy (V2.16.6
     D-11/D-12); install bypasses the browser's HTTP cache so a new CACHE never holds the old
     build (D-13).
   - Icons + Google Fonts: cache-first / stale-while-revalidate (rarely change, fine offline).

   RELEASE CHECKLIST (every version): bump CACHE below in the same commit as the new index.html.
   Nothing else in the PWA kit changes. Keep a versioned copy of the build for the archive if
   wanted, but index.html is the canonical app the PWA serves. */
const CACHE = 'sen-ballistics-v2.16.6';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

/* V1.25.1 (CORE-09): Main and the Lab app share the sprukk.github.io origin, so they share ONE
   CacheStorage. Delete only Main's own old caches (sen-ballistics-*, legacy sen-calc-*) — the old
   "everything but CACHE" filter wiped the Lab probe's offline cache (sen-ble-probe-*) on every
   Main release. */
const OWN_CACHE = k => k.startsWith('sen-ballistics-') || k.startsWith('sen-calc-');

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => OWN_CACHE(k) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NAV_TIMEOUT_MS = 3000;

const isHTML = req =>
  req.mode === 'navigate' ||
  req.destination === 'document' ||
  req.url.endsWith('.html');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin && isHTML(req)) {
    const cached = () => caches.match(req).then(hit => hit || caches.match('./index.html'));
    const net = fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    });
    e.respondWith(new Promise(resolve => {
      let done = false;
      const answer = r => { if (!done) { done = true; resolve(r); } };
      const timer = setTimeout(() => cached().then(hit => { if (hit) answer(hit); }), NAV_TIMEOUT_MS);
      net.then(res => { clearTimeout(timer); answer(res); },
               () => { clearTimeout(timer); cached().then(answer); });
    }));
    if (e.waitUntil) e.waitUntil(net.catch(() => {}));   // a late answer still refreshes the cache
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
