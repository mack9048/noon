// Noon Learn service worker: lets the web app install and open offline.
// - App files (JS, CSS, fonts, icons) are cached after first use.
// - Pages load from the network first and fall back to the cached app when offline.
// - API calls (another domain) are never cached, so data is always fresh and private.
const VERSION = 'noon-v5';
// Only the app's own pages and files are handled. Everything else (the Noon Learn / Noon Buds
// websites on the same domain, their pages, CSS and images) is left alone.
const APP_PAGE = /^\/(login|welcome|join|signup|forgot|account|student|teacher|admin|super|guest|parent|app\.html)(\/|$)|^\/(admission|apply)\/[^/]+\/?$/;
const APP_FILE = /^\/(_expo\/|icons\/|assets\/(node_modules|assets)\/)/;
const SHELL = ['/app.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    if (!APP_PAGE.test(url.pathname)) return;
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/app.html', copy)); } return res; })
        .catch(() => caches.match('/app.html')),
    );
    return;
  }

  if (!APP_FILE.test(url.pathname)) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
