/**
 * LocInsight Service Worker — Phase 3 PWA.
 *
 * Caches the /survey page and key API responses for offline use.
 * Field surveyors can collect data without internet, then sync when back online.
 */
const CACHE_NAME = 'locinsight-survey-v1'
const PRECACHE_URLS = [
  '/survey',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle GET
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Network-first for API calls (so fresh data when online)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    })
  )
})

// Background sync for queued survey submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'survey-sync') {
    event.waitUntil(syncSurveys())
  }
})

async function syncSurveys() {
  // Open the IndexedDB and pull queued submissions
  // (the survey page writes here when offline)
  const db = await openDB()
  const tx = db.transaction('pending-surveys', 'readonly')
  const all = await tx.objectStore('pending-surveys').getAll()
  for (const survey of all) {
    try {
      const res = await fetch('/api/locinsight/field-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      })
      if (res.ok) {
        const delTx = db.transaction('pending-surveys', 'readwrite')
        await delTx.objectStore('pending-surveys').delete(survey.id)
      }
    } catch (e) {
      // will retry on next sync
      break
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('locinsight-surveys', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('pending-surveys')) {
        db.createObjectStore('pending-surveys', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
