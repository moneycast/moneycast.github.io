self.addEventListener('install', (e) => {
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method === 'POST' && url.pathname.includes('index.html') && url.searchParams.get('shared') === '1') {
        // Interceptar compartir imagen y guardarla en la caché local para el hilo principal
        event.respondWith((async () => {
            const formData = await event.request.formData();
            const file = formData.get('media');
            if (file) {
                const cache = await caches.open('shared-data');
                await cache.put('/shared-image', new Response(file));
            }
            return Response.redirect('index.html?shared=1', 303);
        })());
        return;
    }
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});