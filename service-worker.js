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

// Helper: log inside SW and forward logs to all clients
function swLog(...args) {
  try {
    console.log('[SW]', ...args);
    self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage({ swLog: args.map(a => typeof a === 'string' ? a : JSON.stringify(a)) })));
  } catch (e) {
    console.log('[SW] log error', e);
  }
}

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
  swLog('fetch for', event.request.method, url.pathname, 'headers:', event.request.headers.get('content-type'));

  // ── Handle Web Share Target POST (accept POSTs to index or any multipart/form-data within scope)
  if (event.request.method === 'POST') {
    const contentType = event.request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const isIndexPath = url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname === '';
    swLog('POST detected. isMultipart=', isMultipart, 'isIndexPath=', isIndexPath);
    if (isMultipart || isIndexPath) {
      event.respondWith(handleShareTarget(event.request));
      return;
    }
  }

  // ── Normal cache-first strategy ──
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

async function handleShareTarget(request) {
  swLog('handleShareTarget start');
  try {
    const formData = await request.formData();
    swLog('formData keys:', [...formData.keys()]);
    const imageFile = formData.get('image');
    swLog('imageFile:', imageFile && imageFile.name, imageFile && imageFile.size);

    if (imageFile && imageFile instanceof File) {
      const cache = await caches.open(SHARED_IMAGE_CACHE);
      await cache.put(
        '/shared-image',
        new Response(imageFile, {
          headers: { 'Content-Type': imageFile.type || 'image/jpeg' }
        })
      );
      swLog('cached shared image');
    }
  } catch (err) {
    console.error('[SW] Share target error:', err);
    swLog('Share target error:', String(err));
  }

  swLog('opening client /index.html?shared=1');
  try {
    await self.clients.openWindow('/index.html?shared=1');
  } catch (e) {
    swLog('openWindow failed', String(e));
  }
  // Return a simple 200 so fetch callers don't see network-abort errors
  return new Response('', { status: 200, statusText: 'OK' });
}

