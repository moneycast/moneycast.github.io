const CACHE_NAME = 'cardscan-cache-v1';
const ASSETS = [
    'index.html',
    'tailwind.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Interceptar la petición POST que hace el sistema operativo cuando se comparte un archivo
    if (event.request.method === 'POST' && url.pathname.endsWith('index.html') && url.searchParams.get('shared') === '1') {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                const file = formData.get('media');
                if (file) {
                    const cache = await caches.open('shared-data');
                    await cache.put('/shared-image', new Response(file));
                }
            } catch (err) {
                console.error("Error capturando archivo en Service Worker:", err);
            }
            // Redirigir usando código HTTP 303 (Obligatorio para Web Share Target en POST)
            return Response.redirect('index.html?shared=1', 303);
        })());
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            });
        })
    );
});