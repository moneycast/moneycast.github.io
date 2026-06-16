const CACHE_NAME = 'remesas-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/app.js',
  './manifest.json',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/tesseract.js@v4.0.2/dist/tesseract.min.js'
];

// Instalar el Service Worker y guardar recursos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activar y limpiar cachés antiguos
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

// Interceptar peticiones para servir desde caché si no hay red (Offline support)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolver la respuesta
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
