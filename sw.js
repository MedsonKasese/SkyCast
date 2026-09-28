const CACHE = "skycast-v5";

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
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match("/index.html"))
  );
});
