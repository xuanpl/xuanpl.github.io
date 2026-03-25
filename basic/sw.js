// ==========================================
// 拾绪·内观 PWA 核心驱动引擎 (Service Worker)
// ==========================================

const CACHE_NAME = 'shixu-cache-v1.1'; // 缓存版本号，修改代码后提升此版本号可强制用户更新

// 核心资产清单：这些是让 App 离线也能点亮屏幕的必需品
const CACHE_NAME = 'shixu-cache-v1.1'; // 🌟 必须修改版本号，触发系统重新缓存
const ASSETS_TO_CACHE = [
    './',               
    './index.html',     
    './manifest.json',  
	'./shixu.png',
    './lunar.js'        // 🌟 改为缓存本地文件
];

// 1. 安装阶段：容错型预埋缓存
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] 开始逐个预载核心资产...');
            
            // 抛弃脆弱的 cache.addAll，改为利用循环逐个 cache.add
            // 这样即使某个文件 404，也只打印错误，不会引爆整个 Service Worker
            for (let asset of ASSETS_TO_CACHE) {
                try {
                    // 发起请求并存入缓存
                    const request = new Request(asset, { mode: 'no-cors' }); // no-cors 尝试解决第三方 CDN 问题
                    await cache.add(asset);
                    console.log(`[SW] ✅ 缓存成功: ${asset}`);
                } catch (error) {
                    console.error(`[SW] ❌ 缓存失败 (不影响主体): ${asset}`, error);
                }
            }
        })
    );
    self.skipWaiting(); 
});

// 2. 激活阶段：清理历史包袱
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 如果发现旧版本的缓存，毫不留情地销毁，释放存储空间
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] 清除过期缓存: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // 让 Service Worker 立即接管所有打开的页面，而不需要刷新
    event.waitUntil(self.clients.claim());
});

// 3. 拦截阶段：Network-First (网络优先，缓存兜底) 策略
self.addEventListener('fetch', (event) => {
    // 仅拦截 GET 请求，且排除 Chrome 扩展等非 HTTP 请求
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // 如果网络拉取成功，不仅返回给页面，还顺手“白嫖”一份更新到缓存里
                // 这样即使用户没有修改 CACHE_NAME，只要连过一次网，离线包就是最新的
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => {
                // 如果断网了（fetch 抛出异常），立刻从缓存仓库里寻找替身
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // 如果连缓存都没有（极端情况），生成一个纯文本的优雅降级响应
                    return new Response('拾绪：您已断开网络连接，且尚未缓存此资源。', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                    });
                });
            })
    );
});