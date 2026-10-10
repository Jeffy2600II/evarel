/* Path: app-v11/sw.js | Purpose: Service Worker ของ Evarel
   - แคช app shell ให้เปิดเร็ว + ใช้ได้ตอนออฟไลน์
   - รับ Web Push (ต่อกับ /api/push ฝั่ง Worker ในขั้น F)
   Layer: install/activate (จัดแคช) -> fetch (cache-first) -> push/notificationclick */

const VERSION = 'evarel-v28-ai';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/app.css',
  './js/app.js',
  './js/route.js',
  './js/boot.js',
  './vendor/fullcalendar.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: เปิดจากแคชทันที (เร็ว + ออฟไลน์ได้) แล้วดึงฉบับใหม่เบื้องหลังเสมอ
   ครั้งถัดไปจะได้ของใหม่ และถ้าไฟล์หลักเปลี่ยนจะแจ้งหน้าเว็บให้ผู้ใช้กดรีเฟรช */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  /* งานเบื้องหลังต้องผูกกับ event ทันที (ก่อนมี await ใดๆ) ไม่งั้นเบราว์เซอร์อาจปิด SW ก่อนอัปเดตแคชเสร็จ */
  let bg;
  const done = new Promise(r => { bg = r; });
  e.waitUntil(done);
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(e.request);
    /* อ่านฉบับเก่าไว้เทียบก่อนส่ง hit ให้หน้า (body อ่านได้ครั้งเดียว) */
    const oldText = hit && /\.(js|css|html)$|\/$/.test(url.pathname) ? await hit.clone().text().catch(() => null) : null;
    const net = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
      if (!res.ok) return res;
      /* response ที่ผ่าน redirect (เช่น /index.html -> /) เบราว์เซอร์ห้ามใช้ตอบ navigation จากแคช (ERR_FAILED) จึงไม่เก็บ */
      if (res.redirected) {
        /* ล้าง redirected flag: ห่อ body เป็น Response ใหม่ แล้วค่อยส่งให้หน้า (ถ้าส่งตัวเดิม เบราว์เซอร์ปฏิเสธ navigation) */
        return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
      }
      /* เขียนแคชก่อนเสมอ แล้วค่อยเทียบ ถ้าเทียบพังก็ไม่กระทบการอัปเดต */
      const copy = res.clone();
      await cache.put(e.request, res.clone());
      try {
        if (oldText !== null && (await copy.text()) !== oldText) (await self.clients.matchAll()).forEach(c => c.postMessage({ type: 'update-ready' }));
      } catch (err) { console.warn('SW compare fail', err); }
      return res;
    }).catch(err => { console.warn('SW refresh fail', url.pathname, err); return null; });
    net.finally(() => bg());
    if (hit && !hit.redirected) return hit;
    const fresh = await net;
    return fresh || (await cache.match('./index.html')) || new Response('ออฟไลน์', { status: 503 });
  })().catch(err => { bg(); throw err; }));
});

/* ---------- Web Push (ขั้น F จะมี Cron ยิงมา) ---------- */
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Evarel', {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || 'evarel',
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
