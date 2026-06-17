const CACHE = 'pwa-shell-v1';
const ASSETS = ['/', '/index.html', '/app.js', '/manifest.json'];

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

  // Try cache first, then network
  event.respondWith(caches.match(event.request).then(r=> r || fetch(event.request)));
});
