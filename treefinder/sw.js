// Offline support: app files network-first, map tiles and data cache-first.
const SHELL = 'shell-v1';
const DATA = 'tiles-v1';
const SHELL_FILES = ['./', 'index.html', 'app.js', 'analysis.js', 'worker.js', 'manifest.webmanifest', 'icon.svg'];
const CACHE_FIRST_HOSTS = [
  'basemap.nationalmap.gov', 'gis.blm.gov', 's3.amazonaws.com', 'tiles.macrostrat.org',
  'overpass-api.de', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  if (CACHE_FIRST_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
  }
});
