// Cine service worker v2. The v1 incident taught us two rules:
// 1. NEVER serve navigations or the app shell cache-first — pages go network-first
//    and the cache is only an offline fallback, so a new deploy always wins.
// 2. Version the caches; activation deletes anything from other versions.
// Cache-first is only used for content that cannot go stale by design:
// /_next/static/* (content-hashed, immutable) and TMDB poster images.
const VERSION = "cine-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = `${VERSION}-images`;
const APP_ROOT = "/apps/cine";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => Promise.allSettled([cache.add(APP_ROOT)])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("cine-") && !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(APP_ROOT)) || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") void cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname === "image.tmdb.org") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Immutable, content-hashed build assets: safe to serve cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Last catalog readable offline; fresh data always preferred.
  if (url.pathname === "/api/cine/catalog") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // App navigations: network-first so deploys are picked up immediately.
  if (request.mode === "navigate" && url.pathname.startsWith(APP_ROOT)) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});
