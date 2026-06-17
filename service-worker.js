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
  swLog('fetch for', event.request.method, url.pathname, 'accept:', event.request.headers.get('accept'), 'content-type:', event.request.headers.get('content-type'));

  // ── Handle Web Share Target POST (accept POSTs with multipart/form-data)
  if (event.request.method === 'POST') {
    const contentType = event.request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    swLog('POST detected. isMultipart=', isMultipart, 'pathname=', url.pathname);
    if (isMultipart) {
      event.respondWith(handleShareTarget(event.request));
      return;
    }
  }

  // ── Navigation fallback for app shell
  const accept = event.request.headers.get('accept') || '';
  const isHtmlNavigation = event.request.method === 'GET' && accept.includes('text/html');
  if (isHtmlNavigation) {
    const indexRequest = new Request(new URL('index.html', self.registration.scope).href);
    event.respondWith(
      caches.match(indexRequest).then(response => response || fetch(event.request))
    );
    return;
  }

  // ── Normal cache-first strategy
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
      const sharedImageRequest = new Request(new URL('shared-image', self.registration.scope).href);
      await cache.put(
        sharedImageRequest,
        new Response(imageFile, {
          headers: { 'Content-Type': imageFile.type || 'image/jpeg' }
        })
      );
      swLog('cached shared image at', sharedImageRequest.url);
    }
  } catch (err) {
    console.error('[SW] Share target error:', err);
    swLog('Share target error:', String(err));
  }

  const indexRequest = new Request(new URL('index.html', self.registration.scope).href);
  const cachedIndex = await caches.match(indexRequest);
  if (cachedIndex) {
    swLog('returning cached index.html for share target');
    return cachedIndex;
  }

  swLog('fetching index.html for share target');
  return fetch(indexRequest);
}

