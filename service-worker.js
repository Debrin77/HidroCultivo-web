/**
 * HidroCultivo — Service Worker mínimo (PWA + TWA Bubblewrap).
 * Precache: shell offline básico. APIs (Open-Meteo, etc.) siempre red.
 */
const CACHE_NAME = 'hidrocultivo-shell-v1';
const PRECACHE_URLS = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[HidroCultivo SW] precache', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Documento: red primero; si falla (offline), sirve el shell cacheado
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto: red (sin estrategia agresiva — evita romper APIs y fuentes)
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
