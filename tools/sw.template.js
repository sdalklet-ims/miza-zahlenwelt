/* Service Worker – wird beim Build von vite.config.ts mit Dateiliste und Version gefüllt.
 * Strategie: network-first mit 3 Sekunden Timeout, sonst Cache (so kommen Updates sofort beim nächsten Start an, und ohne Netz läuft es trotzdem). */
const VERSION = '__VERSION__'; // wird bei jedem Build neu gesetzt (Zeitstempel)
const FILES = __FILES__;
const CACHE = 'mia-' + VERSION;
const TIMEOUT_MS = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(['./', ...FILES].map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => (r.ok ? c.put(u, r) : undefined)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    const timer = setTimeout(() => fromCache().then((hit) => { if (hit && !done) { done = true; resolve(hit); } }), TIMEOUT_MS);
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        clearTimeout(timer);
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        if (!done) { done = true; resolve(res); }
      })
      .catch(() => {
        clearTimeout(timer);
        fromCache().then((hit) => { if (!done) { done = true; resolve(hit || Response.error()); } });
      });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});
