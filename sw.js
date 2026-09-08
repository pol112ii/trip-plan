/* 오프라인 캐시 — 비행기 모드에서도 앱이 열리도록 */
const V = 'trip-plan-v1';
const CORE = ['./', './index.html', './styles.css', './app.js', './data.js', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 지도 타일 · CDN: 네트워크 우선 + 캐시 백업 (오프라인에서 본 곳은 다시 보임)
  if (url.origin !== location.origin){
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V + '-ext').then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // 앱 파일: 캐시 우선
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    const copy = res.clone();
    caches.open(V).then(c => c.put(req, copy)).catch(() => {});
    return res;
  })));
});
