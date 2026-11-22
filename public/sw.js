/**
 * RestroNex Progressive Web App Service Worker
 * Secure, privacy-conscious offline caching for restaurant POS and management.
 * 
 * SECURITY MANDATE:
 * Never cache sensitive customer data, payment information, credentials,
 * or private tenant records in public cache storage.
 */

const CACHE_VERSION = "restronex-v1.2.0";
const STATIC_CACHE_NAME = `restronex-static-${CACHE_VERSION}`;

// Pre-cached critical static shell assets
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/logo.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("restronex-") && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests (e.g. POST orders, payments, mutations)
  if (request.method !== "GET") {
    return;
  }

  // PRIVACY RULE: Never cache sensitive API endpoints or authentication routes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.includes("token") ||
    url.pathname.includes("session")
  ) {
    return;
  }

  // Static Assets (_next/static, images, fonts): Cache-first with network fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf|css)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // App Pages: Network-first with graceful offline fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => networkResponse)
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Offline placeholder or fallback
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
              <title>RestroNex — Offline</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAF9; color: #172B25; padding: 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
                .card { background: white; border: 1px solid #E5EBE7; border-radius: 1.5rem; padding: 2rem; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                h1 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #172B25; }
                p { font-size: 0.875rem; color: #718078; line-height: 1.5; margin-bottom: 1.5rem; }
                button { background: #16845B; color: white; border: none; font-weight: 700; font-size: 0.875rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="card">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">📡</div>
                <h1>Device is Offline</h1>
                <p>RestroNex requires an active connection for real-time order relay and encrypted billing. Please reconnect to Wi-Fi or cellular network.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
              </div>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      })
  );
});

// Listen for message to skip waiting when user accepts update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
