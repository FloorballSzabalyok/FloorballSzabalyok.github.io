const CACHE_NAME = 'fb-quiz-v40'; /* VERZIÓ FRISSÍTVE A VÁLTOZTATÁS MIATT */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './database.json',
  './Floorball_Jatekszabalyok_2022_FINAL.pdf',
  './img/beginner_badge.png',
  './img/intermediate_badge.png',
  './img/expert_badge.png',
  './img/icon-192.png',
  './img/icon-512.png'
];

/**
 * INSTALL
 * - statikus assetek előtöltése
 * - ha egy-egy asset véletlenül hiányzik, nem dőljön össze az egész telepítés
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Nem kritikus, ha egy adott asset nem érhető el (pl. fejlesztés alatt)
          console.warn('[SW] Nem sikerült cache-elni:', asset, err);
        }
      }
    })()
  );

  // Azonnal átvesszük az irányítást, nem várunk a következő megnyitásra
  self.skipWaiting();
});

/**
 * FETCH
 * - Saját domainre:
 *    - database.json: network-first, cache fallback
 *    - minden más: cache-first, network fallback
 * - Külső domainek (Firebase, Umami, Google, stb.): pass-through (nincs cache)
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Csak a saját originre alkalmazzuk a cache stratégiánkat
  if (url.origin === self.location.origin) {
    // Kérdésbank: mindig a legfrissebb verziót próbáljuk lekérni, offline-ban cache fallback
    if (url.pathname.endsWith('/database.json') || url.pathname.endsWith('database.json')) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            // Ha jött válasz a hálózatról, frissítjük a cache-t
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return networkResponse;
          })
          .catch(() => {
            // Hálózati hiba / offline: fallback a cache-re
            return caches.match(request);
          })
      );
      return;
    }

    // Minden más saját-origin kérés: cache-first
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => {
          // Offline fallbackre itt most nincs külön logika,
          // de ha szeretnél egy külön offline-oldalt, itt lehetne bevezetni.
          return cached;
        });
      })
    );
  } else {
    // Külső domainek (Firebase, Umami, Google Fonts stb.) – nincs cache-be erőltetve
    // → normál fetch, így nem gyűjtünk feleslegesen 3rd party adatot cache-ben.
    event.respondWith(fetch(request));
  }
});

/**
 * ACTIVATE
 * - Régi cache-ek törlése
 * - Új SW azonnali aktiválása
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Régi cache törlése:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  // Azonnal aktiváljuk az új verziót minden nyitott lapon
  self.clients.claim();
});












