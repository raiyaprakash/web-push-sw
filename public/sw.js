const CACHE_NAME = 'asset-cache-v26',
    ASSET_REGEX = /\.(?:jpe?g|png|gif|webp|avif|svg|bmp|ico|woff2?|ttf|otf|eot)$/i,
    PRECACHE = ['/favicon.ico'],
    MAX_ITEMS = 500;
async function limitCache(cache) {
    const keys = await cache.keys();
    if (keys.length > MAX_ITEMS) return await cache.delete(keys[0]), limitCache(cache);
}
self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('fetch', e => {
    if (e.request.method === 'GET' && ASSET_REGEX.test(e.request.url)) {
        e.respondWith(caches.open(CACHE_NAME).then(async cache => {
            const resp = await cache.match(e.request);
            if (resp) return resp;
            const r = await fetch(e.request);
            cache.put(e.request, r.clone());
            limitCache(cache);
            return r;
        }));
    }
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
    }))).then(() => self.clients.claim()));
});
