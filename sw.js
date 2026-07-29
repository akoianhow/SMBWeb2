const CACHE_NAME = 'smbweb2-cache-v3-consistent-header';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './services.html',
  './appointments.html',
  './profile.html',
  './badge.html',
  './search.html',
  './product.html',
  './styles.css',
  './appointments.css',
  './script.js',
  './appointments.js',
  './profile.js',
  './badge.css',
  './badge.js',
  './manifest.json',
  './assets/sarapmagbike-logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install Event: Cache all critical static pages and assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate for static resources, live bypass for SMBSystem API
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // CRITICAL: Always bypass cache for API calls to prevent negative inventory and booking discrepancies
  if (
    requestUrl.pathname.includes('/api/') || 
    requestUrl.hostname.includes('sarapmagbike.com') || 
    requestUrl.port === '5088' ||
    requestUrl.hostname.includes('smbsystem')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "You are currently offline. Real-time availability requires internet access." }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Handle static assets with Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for document navigation when completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
