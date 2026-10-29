/* SEN Ballistics service worker.

   STABLE ENTRY: the app IS index.html (no redirect). The installed PWA launches index.html,
   whose URL never changes between releases — this is what keeps the install current instead of
   pinned to an old versioned filename.

   STRATEGY:
   - HTML documents (index.html): NETWORK-FIRST — a fresh deploy is picked up on the next launch
     when online; falls back to the cached copy when offline.
   - Icons + Google Fonts: cache-first / stale-while-revalidate (rarely change, fine offline).

   RELEASE CHECKLIST (every version): bump CACHE below in the same commit as the new index.html.
   Nothing else in the PWA kit changes. Keep a versioned copy of the build for the archive if
   wanted, but index.html is the canonical app the PWA serves. */
const CACHE = 'sen-ballistics-v2.7.0';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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

const isHTML = req =>
  req.mode === 'navigate' ||
  req.destination === 'document' ||
  req.url.endsWith('.html');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin && isHTML(req)) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
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
