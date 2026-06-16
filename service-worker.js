const CACHE_NAME = 'remesas-pwa-v3';
const SHARED_IMAGE_CACHE = 'remesas-shared-image-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/app.js',
  './manifest.json',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
];

// Instalar el Service Worker y guardar recursos en caché
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== SHARED_IMAGE_CACHE)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ── Handle Web Share Target POST ──
  if (event.request.method === 'POST' && url.pathname.endsWith('index.html')) {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // ── Normal cache-first strategy ──
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (imageFile && imageFile instanceof File) {
      // Store the shared image in a dedicated cache slot
      const cache = await caches.open(SHARED_IMAGE_CACHE);
      await cache.put(
        '/shared-image',
        new Response(imageFile, {
          headers: { 'Content-Type': imageFile.type || 'image/jpeg' }
        })
      );
    }
  } catch (err) {
    console.error('[SW] Share target error:', err);
  }

  // Redirect to the app with a flag so it knows to process the shared image
  return Response.redirect('./index.html#send?shared=1', 303);
}

