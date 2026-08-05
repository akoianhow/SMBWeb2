const STATIC_CACHE = 'smbweb2-static-v55-kapotpot-avatar-markers';
const CATALOG_CACHE = 'smbweb2-catalog-v3-kapotpot-finder';
const PRODUCT_IMAGE_CACHE = 'smbweb2-product-images-v1';
const ACTIVE_CACHES = new Set([STATIC_CACHE, CATALOG_CACHE, PRODUCT_IMAGE_CACHE]);

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const PRODUCT_IMAGE_MAX_AGE = 30 * DAY;
const PRODUCT_IMAGE_MAX_ENTRIES = 180;

const ASSETS_TO_CACHE = [
  './',
  './404.html',
  './index.html',
  './leaderboard.html',
  './coming-soon.html',
  './guest-order.html',
  './services.html',
  './service.html',
  './appointments.html',
  './events.html',
  './stories.html',
  './story.html',
  './orders.html',
  './profile.html',
  './badge.html',
  './survey.html',
  './search.html',
  './product.html',
  './styles.css',
  './appointments.css',
  './script.js',
  './guest-order.js',
  './appointments.js',
  './profile.js',
  './badge.css',
  './badge.js',
  './manifest.json',
  './assets/sarapmagbike-logo.png',
  './assets/gcash-mark.svg',
  './assets/category-bike-frames.jpg',
  './assets/category-parts-components.jpg',
  './assets/category-cycling-clothing.jpg',
  './assets/category-helmets-sunglasses.jpg',
  './assets/category-tires-tubes.jpg',
  './assets/category-services.jpg',
  './assets/sarapmagbadge-noob.png',
  './assets/sarapmagbadge-saks.png',
  './assets/sarapmagbadge-mamaw.png',
  './assets/sarapmagbadge-master.png',
  './assets/sarapmagbadge-budolero.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

function isCacheableResponse(response, contentType = '') {
  if (!response || response.status !== 200) return false;
  if (!contentType) return true;
  return String(response.headers.get('Content-Type') || '').toLowerCase().includes(contentType);
}

async function withCacheHeaders(response, values) {
  const headers = new Headers(response.headers);
  Object.entries(values).forEach(([name, value]) => headers.set(name, value));
  const exposedHeaders = new Set(
    String(headers.get('Access-Control-Expose-Headers') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  exposedHeaders.add('X-SMB-Cached-At');
  exposedHeaders.add('X-SMB-Cache-Status');
  headers.set('Access-Control-Expose-Headers', Array.from(exposedHeaders).join(', '));
  return new Response(await response.clone().arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function cachedAt(response) {
  const value = Date.parse(response?.headers.get('X-SMB-Cached-At') || '');
  return Number.isFinite(value) ? value : 0;
}

async function stampForCache(response) {
  return withCacheHeaders(response, {
    'X-SMB-Cached-At': new Date().toISOString()
  });
}

async function markCacheStatus(response, status) {
  return withCacheHeaders(response, {
    'X-SMB-Cache-Status': status
  });
}

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const overflow = keys.length - maximumEntries;
  if (overflow <= 0) return;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({ error: 'You are currently offline. Live availability requires internet access.' }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}

function catalogPolicy(pathname) {
  if (pathname === '/api/public/web-items') {
    return { freshFor: 2 * MINUTE, staleFor: 30 * MINUTE };
  }
  if (pathname === '/api/public/catalog/locations') {
    return { freshFor: 15 * MINUTE, staleFor: 60 * MINUTE };
  }
  if (pathname === '/api/public/loyalty/leaderboard') {
    return { freshFor: MINUTE, staleFor: 15 * MINUTE };
  }
  if (pathname === '/api/public/recent-purchases') {
    return { freshFor: MINUTE, staleFor: 15 * MINUTE };
  }
  if (pathname === '/api/public/site-status') {
    return { freshFor: 5 * MINUTE, staleFor: 15 * MINUTE };
  }
  return null;
}

async function fetchAndCacheCatalog(request) {
  const response = await fetch(request);
  if (!isCacheableResponse(response, 'application/json')) return response;
  const storedResponse = await stampForCache(response);
  const cache = await caches.open(CATALOG_CACHE);
  await cache.put(request, storedResponse.clone());
  return markCacheStatus(storedResponse, 'network');
}

async function catalogResponse(event, policy) {
  const request = event.request;
  const cache = await caches.open(CATALOG_CACHE);
  const cachedResponse = await cache.match(request);
  const age = cachedResponse ? Date.now() - cachedAt(cachedResponse) : Number.POSITIVE_INFINITY;

  if (cachedResponse && age <= policy.freshFor) {
    return markCacheStatus(cachedResponse, 'fresh-cache');
  }

  if (cachedResponse && age <= policy.staleFor) {
    event.waitUntil(fetchAndCacheCatalog(request).catch(() => undefined));
    return markCacheStatus(cachedResponse, 'stale-cache');
  }

  try {
    return await fetchAndCacheCatalog(request);
  } catch {
    return offlineApiResponse();
  }
}

async function productImageResponse(request) {
  const cache = await caches.open(PRODUCT_IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const storedAt = cachedAt(cachedResponse);
    if (!storedAt || Date.now() - storedAt <= PRODUCT_IMAGE_MAX_AGE) {
      return cachedResponse;
    }
  }
  if (cachedResponse) {
    await cache.delete(request);
  }

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response, 'image/') || response.type === 'opaque') {
      const storedResponse = response.type === 'opaque' ? response : await stampForCache(response);
      await cache.put(request, storedResponse.clone());
      await trimCache(PRODUCT_IMAGE_CACHE, PRODUCT_IMAGE_MAX_ENTRIES);
      return storedResponse;
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Product image unavailable offline' });
  }
}

function navigationCacheKey(request) {
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  const key = navigationCacheKey(request);
  const networkRequest = fetch(request).then(async (response) => {
    if (isCacheableResponse(response, 'text/html')) {
      await cache.put(key, response.clone());
    }
    return response;
  });
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Navigation timed out')), 3500);
  });

  try {
    return await Promise.race([networkRequest, timeout]);
  } catch {
    return (await cache.match(key))
      || (await cache.match('./index.html'))
      || new Response('SarapMagBike is temporarily unavailable.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  }
}

async function staticAssetResponse(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true }))
      || new Response('This resource is unavailable offline.', { status: 503 });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(ASSETS_TO_CACHE.map((asset) => cache.add(asset)));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('smbweb2-') && !ACTIVE_CACHES.has(cacheName))
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isTrustedApiHost = requestUrl.hostname === 'api.sarapmagbike.com'
    || requestUrl.hostname.includes('smbsystem')
    || (
      ['127.0.0.1', 'localhost'].includes(requestUrl.hostname)
      && requestUrl.port === '5088'
    );

  if (!isSameOrigin && !isTrustedApiHost) {
    return;
  }

  if (request.method !== 'GET') {
    event.respondWith(fetch(request).catch(offlineApiResponse));
    return;
  }

  if (isSameOrigin && request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (requestUrl.pathname.startsWith('/api/public/web-items/images/')) {
    event.respondWith(productImageResponse(request));
    return;
  }

  const policy = catalogPolicy(requestUrl.pathname);
  if (policy) {
    event.respondWith(catalogResponse(event, policy));
    return;
  }

  if (
    requestUrl.pathname.includes('/api/')
    || isTrustedApiHost
  ) {
    event.respondWith(fetch(request).catch(offlineApiResponse));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(staticAssetResponse(request));
  }
});
