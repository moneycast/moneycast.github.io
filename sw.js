const CACHE_NAME = 'pwa-shell-v1';
const OFFLINE_URL = './index.html';
const CACHE_FILES = ['./index.html', './manifest.json', './sw.js'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME && key !== 'shared-data')
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method === 'POST' && url.pathname.includes('index.html') && url.searchParams.get('shared') === '1') {
        event.respondWith((async () => {
            const formData = await event.request.formData();
            const file = formData.get('media');
            if (file) {
                const cache = await caches.open('shared-data');
                await cache.put('/shared-image', new Response(file));
            }
            return Response.redirect('./index.html?shared=1', 303);
        })());
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return response;
            }).catch(() => caches.match(event.request));
        })
    );
});
