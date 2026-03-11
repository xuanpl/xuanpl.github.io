const CACHE_NAME = 'shixu-pro-v5'; // 每次更新代码请修改此版本号

// 需要被缓存的资源列表
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './shixupro.png',
  'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

// 安装阶段：预缓存所有核心资源
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 激活阶段：清理旧版本的缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 拦截请求：优先从缓存中读取，实现离线使用
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});