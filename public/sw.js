// Minimal service worker so the app meets PWA install criteria.
// Network-first passthrough — no caching, so deploys are picked up immediately.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Default network handling. Required handler for installability.
});
