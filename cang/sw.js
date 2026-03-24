// ==========================================
// 拾绪 PWA Service Worker (动静分离高可靠引擎)
// ==========================================

const CACHE_NAME = 'shixu-cache-v3.1.3'; // 更新版本号

const ASSETS_TO_CACHE = [
    './', 
    './manifest.json',
    './cang.png',
    'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
    'https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.3/viewer.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.3/viewer.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] 正在写入底层缓存...');
            // 修复“一损俱损”漏洞：拆分请求，即使某个CDN挂了，也不影响核心资源缓存
            for (let url of ASSETS_TO_CACHE) {
                try {
                    await cache.add(url);
                } catch (e) {
                    console.warn(`[SW] 预缓存失败 (不影响核心): ${url}`);
                }
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('shixu-cache-')) {
                        console.log('[SW] 销毁旧版本缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // 策略 A：对于 HTML 页面 (Navigation请求)，采用 Network-First (网络优先)
    // 优势：永远获取最新页面，无需在前端写暴力的 location.reload()
    if (event.request.mode === 'navigate' || requestUrl.pathname === '/') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                return networkResponse;
            }).catch(() => {
                // 断网时，从缓存中捞取旧版 HTML
                return caches.match(event.request);
            })
        );
        return;
    }

    // 策略 B：对于静态资源，采用 Cache-First (缓存优先)
    // 优势：极大降低服务器压力，实现断网秒开
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // 严控动态缓存质量：只缓存 200 且合法的数据
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => {
                console.error('[SW] 资源抓取失败，离线状态:', event.request.url);
            });
        })
    );
});