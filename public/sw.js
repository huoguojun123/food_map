const CACHE_NAME = 'gourmetlog-v2'
const urlsToCache = ['/', '/manifest.json', '/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache.map(url => new Request(url)))
    })
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone)
          })
        }

        return networkResponse
      })
    })
  )
})
