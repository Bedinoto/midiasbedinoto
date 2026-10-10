const CACHE_NAME = 'adcast-cache-v7';
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
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Reduzir Egress do Supabase Storage
  if (url.href.includes('/storage/v1/object/public/')) {
    // IMPORTANTE: Se houver Range header, NÃO interceptamos.
    // Isso evita o erro de tela preta em vídeos, pois o navegador gerencia o streaming.
    if (event.request.headers.get('range')) {
      return; 
    }

    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => fetch(event.request));
        });
      })
    );
    return;
  }

  // Navegação: Tenta rede, se falhar tenta index.html (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Padrão: Busca normal
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
