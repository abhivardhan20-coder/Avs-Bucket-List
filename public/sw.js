/**
 * AV's Bucket List - Service Worker
 * Provides offline resilience, static asset caching, and stale-while-revalidate for images
 */

const CACHE = 'av-v1';
const OFFLINE_URL = '/offline.html';

// ✅ Install event: cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        '/',
        '/offline.html',
        '/index.html'
      ])
    )
  );
  self.skipWaiting();
});

// ✅ Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ✅ Fetch event: serve from cache with fallback, use stale-while-revalidate for images
self.addEventListener('fetch', event => {
  // Navigate requests: try network first, fall back to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Image requests: stale-while-revalidate (serve cached, fetch fresh in background)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        const fresh = fetch(event.request).then(response => {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Other requests: try cache first, then network
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => caches.match(OFFLINE_URL))
    )
  );
});
