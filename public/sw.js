// This dashboard is always meant to show fresh data — every page and API
// route here is force-dynamic — so this service worker deliberately caches
// nothing. It exists only so stricter PWA installability checks (a
// registered service worker with a fetch handler) are satisfied; every
// request still goes straight to the network exactly as if no service
// worker were installed at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
