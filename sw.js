const CACHE = "skycast-v8";

const FILES = [
  "/",
  "/index.html",
  "/sports.html",
  "/settings.html",
  "/css/base.css",
  "/css/layout.css",
  "/css/variables.css",
  "/css/responsive.css",
  "/css/components.css",

  "/js/main.js",
  "/js/ui.js",
  "/js/api.js",
  "/js/radar.js",
  "/js/sports.js",
  "/js/sports-page.js",
  "/js/settings.js",
  "/js/settings-page.js",
  "/js/notifications.js",
  "/js/notification-rules.js",
  "/js/sports-notification-rules.js",
  "/js/utils.js",

  "/manifest.json",

  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(FILES);
    })
  );
});

// Remove old cache versions so storage doesn't grow forever across deploys.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // API responses must stay network-only: never substitute the app shell for JSON.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation is network-first, with a cached page as the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/index.html")),
    );
    return;
  }

  // For static same-origin assets, prefer the versioned cache and fetch on a miss.
  if (url.origin === self.location.origin && request.method === "GET") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
