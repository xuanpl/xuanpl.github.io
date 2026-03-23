// ==========================================
// 拾绪 PWA Service Worker (离线高压缓存引擎)
// ==========================================

// ⚠️ 每次你修改了 HTML 里的代码，或者更换了 CDN，都必须修改这个版本号！
// 哪怕只是把 v1.0.0 改成 v1.0.1，否则用户的浏览器永远不会更新。
const CACHE_NAME = 'shixu-cache-v3.0.5';

// 必须被硬缓存的静态资源资产清单 (App Shell)
const ASSETS_TO_CACHE = [
    './', // 缓存根路径 (即你的 HTML 文件)
    './manifest.json',
    './shixu.png',
    // 将所有依赖的外部 CDN 文件拉入本地缓存
    'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'
];

// 1. 安装阶段 (Install) - 预载所有资源到缓存
self.addEventListener('install', (event) => {
    // 强制当前 SW 立即进入 waiting 状态
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] 正在写入底层缓存...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. 激活阶段 (Activate) - 清理旧版本僵尸缓存
self.addEventListener('activate', (event) => {
    // 立即获取控制权，不需要用户刷新第二次才生效
    event.waitUntil(self.clients.claim());

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 如果发现旧版本的缓存，无情销毁
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('shixu-cache-')) {
                        console.log('[SW] 销毁旧版本缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 3. 拦截阶段 (Fetch) - 缓存优先策略 (Cache-First)
self.addEventListener('fetch', (event) => {
    // 仅拦截 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 命中缓存：直接从本地返回，实现断网秒开
            if (cachedResponse) {
                return cachedResponse;
            }

            // 未命中缓存：向网络发起真实请求，并动态存入当前缓存中
            return fetch(event.request).then((networkResponse) => {
                // 如果请求失败或并非跨域/同源的合法响应，则直接返回
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                    return networkResponse;
                }

                // 克隆响应流：因为 Response 流只能被消费一次（一次给浏览器，一次存缓存）
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // 极端情况：断网且本地无缓存，静默失败即可
                console.error('[SW] 资源抓取失败，当前处于离线状态:', event.request.url);
            });
        })
    );
});