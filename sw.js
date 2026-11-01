/* خدمة بسيطة للتثبيت: الشبكة أولاً، والنسخة المخزّنة إذا انقطع النت */
const C = 'app-v1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { const copy = res.clone(); caches.open(C).then((c) => c.put(r, copy)).catch(() => {}); return res; }).catch(() => caches.match(r)));
});
