// Kill switch: the previous Cine service worker cached the app shell/chunks and,
// after new deploys, could serve stale assets and break hydration. Browsers
// re-fetch the registered SW script on navigation and byte-compare it, so this
// updated version installs, unregisters itself, clears its caches and reloads
// open clients — healing devices that still have the old SW without any user
// action. The app no longer registers a service worker (PWA offline is on hold).
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("cine-")).map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        if ("navigate" in client) client.navigate(client.url);
      }
    })()
  );
});
