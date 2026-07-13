const CACHE_NAME = "cine-shell-v1";
const IMAGE_CACHE = "cine-images-v1";
const APP_ROOT = "/apps/cine";
const SHELL = [APP_ROOT, "/cine.webmanifest", "/apps/cine/apple-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("cine-") && key !== CACHE_NAME && key !== IMAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(APP_ROOT)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

// TMDB posters/backdrops are immutable per URL, so cache-first keeps them offline.
async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") void cache.put(request, response.clone());
    return response;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname === "image.tmdb.org") {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Offline read of the last catalog the user loaded.
  if (url.pathname === "/api/cine/catalog") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === "navigate" && url.pathname.startsWith(APP_ROOT)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/cine.webmanifest" ||
    url.pathname === "/apps/cine/apple-icon"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
