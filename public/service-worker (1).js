// ─── KACORP BUDGET · Service Worker ────────────────────────────────────────
// Stratégie : Cache-First pour les assets statiques,
//             Network-First pour les requêtes API/réseau.
// L'app fonctionne 100% hors-ligne une fois installée.

const CACHE_NAME = "kacorp-budget-v1";

// Fichiers à mettre en cache au premier chargement
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo-kacorp.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Installation : précache des assets essentiels ──────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installation…");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Précache des assets");
        // On utilise { cache: "reload" } pour bypasser le cache HTTP
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: "reload" }))
          )
        );
      })
      .then(() => self.skipWaiting()) // Active immédiatement sans attendre
  );
});

// ── Activation : supprime les anciens caches ───────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation…");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("[SW] Suppression ancien cache:", key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// ── Fetch : Cache-First avec fallback réseau ───────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et les extensions Chrome
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Requêtes vers des APIs externes → Network-First
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "api.anthropic.com"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Met en cache la réponse pour usage hors-ligne
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)) // Fallback cache si hors-ligne
    );
    return;
  }

  // Assets locaux → Cache-First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Retourne depuis le cache ET met à jour en arrière-plan
        const networkUpdate = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => {});
        return cached;
      }

      // Pas en cache → réseau, puis mise en cache
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Fallback hors-ligne → renvoie index.html (SPA)
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// ── Message : force la mise à jour du cache ────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
