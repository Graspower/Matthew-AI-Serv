const CACHE_NAME = 'matthew-ai-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/globals.css',
  // Consider adding other critical static assets if necessary
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add all URLs to cache. If any fetch fails, the SW installation fails.
        // Using { cache: 'reload' } to bypass HTTP cache for these initial assets.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch(err => {
        console.error('Failed to cache urls during install:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-first strategy for HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/') || new Response("You are offline. Some content may not be available.", { status: 503, statusText: "Service Unavailable", headers: { 'Content-Type': 'text/plain' }});
            });
        })
    );
    return;
  }

  // Cache-first strategy for other assets (CSS, JS, images etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Serve from cache
        }
        // Not in cache, fetch from network, then cache
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response
            if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(() => {
           // If fetch fails (e.g. offline), and not in cache, browser will handle the error.
           // Optionally, return a generic fallback for specific asset types if available and cached.
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensures the new service worker takes control immediately.
  return self.clients.claim();
});
