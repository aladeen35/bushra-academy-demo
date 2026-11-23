// Albushra Literature service worker: app shell cached; content network-first with cache fallback (offline reading of opened chapters).
const CACHE = "lit-v1";
const SHELL = ["./", "./index.html", "./css/app.css?v=1", "./js/app.js?v=1", "./manifest.webmanifest", "./assets/logo-full.webp", "./assets/mark.webp", "./assets/icon-192.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("lit-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const scope = new URL(self.registration.scope);
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (e.request.method !== "GET" || (!fonts && (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)))) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: !fonts })) || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
