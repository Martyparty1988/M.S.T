
const CACHE_NAME = 'solar-work-count-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/translations.ts',
  '/hooks/useLocalStorage.ts',
  '/context/AppContext.tsx',
  '/context/I18nContext.tsx',
  '/context/ThemeContext.tsx',
  '/components/BottomNav.tsx',
  '/components/Loader.tsx',
  '/components/Toast.tsx',
  '/components/Modal.tsx',
  '/components/SkeletonCard.tsx',
  '/components/TableMap.tsx',
  '/components/ManageTeamModal.tsx',
  '/components/EditWorkerModal.tsx',
  '/components/QuickLogTablesModal.tsx',
  '/pages/PlanPage.tsx',
  '/pages/AttendancePage.tsx',
  '/pages/RecordsPage.tsx',
  '/pages/PayrollPage.tsx',
  '/pages/StatsPage.tsx',
  '/pages/SettingsPage.tsx'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response.
            // Opaque responses (from no-cors requests, e.g. CDNs) have status 0, so we allow them for caching runtime.
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }
            
            // Note: We don't cache runtime API calls or CDN calls here to keep it simple,
            // but the App Shell files listed in urlsToCache will be served from cache.
            return networkResponse;
          }
        ).catch(error => {
          console.log('Fetch failed:', error);
        });
      })
  );
});
