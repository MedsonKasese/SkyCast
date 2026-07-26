const CACHE = "skycast-v1";

const FILES = [
  "/",
  "/index.html",
  "../css/base.css",
  "../css/layout.css",
  "../css/variables.css",
  "../css/responsive.css",

  "../js/main.js",
  "../js/ui.js",
  "../js/api.js",

  "/manifest.json",  

  "../icons/icon-192.png",
  "../icons/icon-512.png"

];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(FILES);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
     .then((response) => response || 
     fetch(event.request))
  );
});
