const CACHE_NAME = 'adcast-cache-v9';
const MEDIA_CACHE_NAME = 'adcast-media-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== MEDIA_CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Otimização e cache offline exclusivamente para mídias do Supabase Storage
  if (url.href.includes('/storage/v1/object/public/')) {
    // Range requests (streaming de vídeo) são tratados nativamente pelo navegador
    if (event.request.headers.get('range')) {
      return;
    }

    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          if (cachedResponse) return cachedResponse;
          throw err;
        }
      })
    );
    return;
  }

  // Para todo o resto (scripts, css, html, fontes), NÃO intercepta.
  // Deixa o navegador usar o fluxo nativo da rede e cache HTTP sem risco de tela preta.
});
