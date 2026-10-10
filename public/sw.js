const CACHE_NAME = 'adcast-cache-v8';
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
  // Ignora requisições não-GET (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. Otimização de Egress para mídias do Supabase Storage
  if (url.href.includes('/storage/v1/object/public/')) {
    // Range requests (streaming nativo de vídeo) não devem ser cacheados pelo Service Worker
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
          // Se falhou e não tem cache, relança
          if (cachedResponse) return cachedResponse;
          throw err;
        }
      })
    );
    return;
  }

  // 2. Navegação SPA (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        throw new Error('Offline and no cached index.html');
      })
    );
    return;
  }

  // 3. Demais recursos estáticos: deixa o navegador fazer o fetch padrão
  // Se quisermos offline para app shell:
  // Mas NUNCA falhar uma requisição com Response vazia se caches.match for undefined!
  // Logo, simplesmente não interceptamos ou fazemos Network-First com fallback seguro:
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw new Error(`Network failure for ${event.request.url}`);
    })
  );
});
