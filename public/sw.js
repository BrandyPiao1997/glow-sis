// Minimal GlowSis service worker (PWA installability).
// No offline caching yet — requests pass straight through to the network,
// so content is never stale. Push notifications are a later phase.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough: the browser handles the request normally.
  // (A fetch handler must exist for the app to be installable.)
});
