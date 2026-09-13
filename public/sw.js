// TenetBid Service Worker — PWA offline support + fast repeat loads.
//
// Strategy:
// - App shell / static assets: cache-first (instant repeat loads)
// - Navigations (HTML): network-first with offline fallback
// - API calls: network-only (never cache dynamic/auth data)
// - Images/uploads: cache-first with size cap

const VERSION = 'v3';
const SHELL_CACHE = `tenet-shell-${VERSION}`;
const ASSET_CACHE = `tenet-assets-${VERSION}`;
const IMAGE_CACHE = `tenet-images-${VERSION}`;

// Precache the minimal app shell
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
];

// A tiny offline fallback page (inline — no extra request needed)
const OFFLINE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — TenetBid</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
.box{max-width:360px}.icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#94a3b8;line-height:1.5;margin:0 0 20px}
button{background:#f97316;color:#fff;border:0;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}</style></head>
<body><div class="box"><div class="icon">📡</div><h1>You're offline</h1>
<p>TenetBid needs an internet connection for live tender data. Your cached pages still work — try reconnecting.</p>
<button onclick="location.reload()">Retry</button></div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache API / auth / uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  // Navigations: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // Images: cache-first (cap entries to avoid bloat)
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, res.clone());
              // Trim cache at 120 entries
              cache.keys().then((keys) => {
                if (keys.length > 120) cache.delete(keys[0]);
              }).catch(() => {});
            }).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Static assets (JS/CSS/fonts): cache-first — instant repeat loads
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, res.clone())).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
