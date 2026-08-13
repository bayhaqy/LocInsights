/**
 * LocInsights Service Worker — PWA with offline shell caching.
 *
 * Strategy:
 *   • Pre-cache the app shell on install (logo, manifest, key CSS)
 *   • Network-first for API calls (so fresh data when online; cache fallback offline)
 *   • Cache-first for static assets (logo, fonts, leaflet tiles, _next/static)
 *   • Stale-while-revalidate for navigation requests (HTML pages)
 *
 * Offline capabilities:
 *   ✓ App shell loads (logo, layout, navigation)
 *   ✓ Last-viewed Dashboard, Map Explorer, Opportunities data is cached
 *   ✓ Field survey form works offline
 *   ✗ Fresh API data requires network (will use cached if available)
 *   ✗ AI chat requires network (calls external Z.AI API)
 *   ✗ ML predictions require network (calls HuggingFace Space)
 */

const CACHE_VERSION = 'v3'
const CACHE_NAME = `locinsight-${CACHE_VERSION}`
const SURVEY_CACHE = `locinsight-survey-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/logo-white.png',
  '/logo-icon.png',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/survey',
  '/locinsights.apk',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
]

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Don't fail install if any single resource fails to cache
          })
        )
      )
    )
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.includes(CACHE_VERSION) && !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle GET
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ---- Skip cross-origin requests for non-cached hosts (e.g. HuggingFace, external APIs) ----
  // except for unpkg leaflet CDN which we want to cache
  const isSameOrigin = url.origin === self.location.origin
  const isLeafletCDN = url.origin === 'https://unpkg.com'
  const isMapTile = /tile\.openstreetmap|cartocdn|basemaps/.test(url.href)

  if (!isSameOrigin && !isLeafletCDN && !isMapTile) {
    // Let external requests pass through normally (network-only)
    return
  }

  // ---- Network-first for API calls (so fresh data when online) ----
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET responses for offline fallback
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    )
    return
  }

  // ---- Cache-first for map tiles (they're versioned and immutable) ----
  if (isMapTile) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
      })
    )
    return
  }

  // ---- Stale-while-revalidate for navigation (HTML pages) ----
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
            }
            return response
          })
          .catch(() => cached || caches.match('/'))
        return cached || fetchPromise
      })
    )
    return
  }

  // ---- Cache-first for static assets (_next/static, images, fonts, leaflet CDN) ----
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && (isSameOrigin || isLeafletCDN)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
        }
        return response
      })
    })
  )
})

// Allow page to trigger immediate activation (skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
