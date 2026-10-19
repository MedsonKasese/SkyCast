const CACHE = "skycast-v10";
const CACHE_PREFIX = "skycast-";

const FILES = [
  "/",
  "/index.html",
  "/forecast.html",
  "/sports.html",
  "/settings.html",
  "/css/base.css",
  "/css/layout.css",
  "/css/variables.css",
  "/css/responsive.css",
  "/css/components.css",
  "/css/settings.css",

  "/js/main.js",
  "/js/ui.js",
  "/js/forecast-details.js",
  "/js/forecast-page.js",
  "/js/skeletons.js",
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
  "/js/storage.js",

  "/manifest.json",

  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(FILES);
    }),
  );
});

// Remove old cache versions so storage doesn't grow forever across deploys.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (request.mode === "navigate" && url.pathname === "/forecast.html") {
        const forecastPage = await cache.match("/forecast.html");
        if (forecastPage) return forecastPage;
      }

      try {
        return await fetch(request);
      } catch (error) {
        if (request.mode === "navigate") {
          const fallback = await cache.match("/index.html");
          if (fallback) return fallback;
        }
        throw error;
      }
    }),
  );
});
