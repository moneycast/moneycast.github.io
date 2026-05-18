const CACHE_NAME = 'moneycast-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon-512x512.png',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/store.js',
  './assets/js/views/crud.js',
  './assets/js/views/sales.js',
  './assets/js/utils/whatsapp.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // We catch errors so the SW installs even if some files are missing initially
        return cache.addAll(urlsToCache).catch(err => console.warn('Cache warning:', err));
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
