const CACHE_NAME = 'shixu-v4'; // 提升版本号

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll([
    './', 
    './index.html', 
    './manifest.json', 
    './shixu.png', // 确保包含这个图片文件
    'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js'
  ])));
});