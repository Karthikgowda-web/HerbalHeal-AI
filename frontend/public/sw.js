const CACHE_NAME = 'herbalheal-cache-v1';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch Event - Network First Strategy with /models Exclusion
self.addEventListener('fetch', (event) => {
  // 1. We only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 2. EXCLUSION RULE: Never cache or intercept requests to the /models directory
  if (url.pathname.includes('/models')) {
    return; // Pass through to network normally
  }

  // 3. NETWORK FIRST STRATEGY
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If we have a valid network response, cache it and return it
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});
