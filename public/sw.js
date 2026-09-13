// Deliberately minimal: this site's prices, stock and cart are always
// live, so nothing here caches page HTML or API responses — that would
// risk showing a stale price or an out-of-date cart. The only job of
// this service worker is (a) making the site installable as an app, and
// (b) showing a friendly offline page instead of the browser's default
// error when there's no navigation available offline.
const OFFLINE_CACHE = "atg-mall-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});
