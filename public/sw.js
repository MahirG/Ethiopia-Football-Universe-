// EFU offline shell: bounded same-origin caching, no mid-match takeover.
const SHELL_CACHE = 'efu-shell-v12-stability';
const ASSET_CACHE = 'efu-static-v12-stability';
const MAX_ASSET_ENTRIES = 60;
const MAX_ASSET_BYTES = 2 * 1024 * 1024;
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  // Deliberately avoid skipWaiting(): do not replace a worker during a live match.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('efu-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
      .map((key) => caches.delete(key)),
  )));
  // Avoid clients.claim(): existing match sessions retain their current worker.
});

async function cacheSafeAsset(request, response) {
  if (!response.ok || response.type === 'opaque') return;
  if (response.headers.get('cache-control')?.includes('no-store')) return;
  const bytes = Number(response.headers.get('content-length'));
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_ASSET_BYTES) return;
  const cache = await caches.open(ASSET_CACHE);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > MAX_ASSET_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_ASSET_ENTRIES)
      .map((key) => cache.delete(key)));
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Fresh shell on successful network requests, offline fallback on navigation only.
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match('./index.html');
      return cached || Response.error();
    }));
    return;
  }

  // Do not store APIs, signed URLs, media, or arbitrary GET responses.
  if (url.search || !/\.(?:js|css|svg|png|webp|ico|woff2?)$/i.test(url.pathname) ||
      url.pathname.includes('/api/')) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    // Bound offline assets to 60 items of up to 2 MiB each.
    const cacheCopy = response.clone();
    event.waitUntil(cacheSafeAsset(request, cacheCopy));
    return response;
  })());
});
