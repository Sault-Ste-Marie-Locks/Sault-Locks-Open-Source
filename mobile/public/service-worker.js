const CACHE_NAME = 'sault-locks-mobile-20260707-kayak-type-fix';
const APP_SHELL = [
  '/mobile/offline.html',
  '/mobile/pair.html',
  '/mobile/index.html',
  '/mobile/new-entry.html',
  '/mobile/logs.html',
  '/mobile/recreational-boat.html',
  '/mobile/returning-boat.html',
  '/mobile/tour-boat.html',
  '/mobile/government-boat.html',
  '/mobile/commercial-boat.html',
  '/mobile/kayak.html',
  '/mobile/lock-reversal.html',
  '/mobile/lock-test.html',
  '/mobile/assets/app.js',
  '/mobile/assets/style.css',
  '/mobile/assets/theme-boot.js',
  '/mobile/assets/icon-192.png',
  '/mobile/assets/icon-512.png',
  '/mobile/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => null)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  if(req.mode === 'navigate'){
    event.respondWith(fetch(req).catch(() => caches.match('/mobile/offline.html')));
    return;
  }

  if(url.pathname.startsWith('/mobile/assets/') || url.pathname === '/mobile/manifest.json'){
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
      return res;
    }).catch(() => cached)));
  }
});
