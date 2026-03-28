const CACHE_NAME = 'shixu-cache-v4.0.2'; 
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './shixu.png',
    './lunar.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] 预缓存核心资产');
            for (let asset of ASSETS_TO_CACHE) {
                try {
                    await cache.add(asset);
                    console.log(`[SW] ✅ 缓存成功: ${asset}`);
                } catch (error) {
                    console.error(`[SW] ❌ 缓存失败: ${asset}`, error);
                }
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] 清除过期缓存: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // 只缓存成功的响应
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    return new Response('拾绪：您已断开网络连接，且未缓存此资源。', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});