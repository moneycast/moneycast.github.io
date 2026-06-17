const CACHE = 'pwa-shell-v1';
const ASSETS = [
  '/', '/index.html', '/app.js', '/manifest.json',
  'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract-core.wasm.js',
  'https://cdn.jsdelivr.net/npm/tessdata@4.0.0/eng.traineddata.gz'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);

  if(event.request.method === 'POST' && url.pathname === '/share-target'){
    event.respondWith((async ()=>{
      try{
        const formData = await event.request.formData();
        const file = formData.get('image');
        if(file && file.size){
          const arr = await file.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(arr);
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
          }
          const b64 = btoa(binary);
          const dataUrl = `data:${file.type};base64,${b64}`;
          const target = '/?sharedImage=' + encodeURIComponent(dataUrl);
          await clients.openWindow(target);
          return Response.redirect(target, 303);
        }
      }catch(err){
        console.error('share-target error', err);
      }
      return Response.redirect('/', 303);
    })());
    return;
  }

  // Try cache first, then network; cache fetched assets for offline fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if(networkResponse && networkResponse.status === 200 && event.request.method === 'GET'){
          caches.open(CACHE).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(()=> cached);
      return cached || fetchPromise;
    })
  );
});
