const CACHE_NAME = 'counter-shell-v2';
const RUNTIME_CACHE_NAME = 'counter-runtime-v1';
const PRECACHE_URLS = ['/counter/index.html', '/counter/icon.png', '/counter/tailwind.css'];
const EXTERNAL_ASSET_HOSTS = new Set([
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.pixabay.com',
    'www.gstatic.com'
]);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) =>
                        (key.startsWith('counter-shell-') && key !== CACHE_NAME) ||
                        (key.startsWith('counter-runtime-') && key !== RUNTIME_CACHE_NAME)
                    )
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET') {
        return;
    }

    const isCounterAsset = url.origin === self.location.origin && url.pathname.startsWith('/counter/');
    const isExternalAsset = url.protocol === 'https:' && EXTERNAL_ASSET_HOSTS.has(url.hostname);
    if (!isCounterAsset && !isExternalAsset) return;

    const cacheName = isCounterAsset ? CACHE_NAME : RUNTIME_CACHE_NAME;
    event.respondWith(
        fetch(request, { cache: 'no-cache' })
            .then(async (response) => {
                if (response.status === 200 || response.type === 'opaque') {
                    try {
                        const cache = await caches.open(cacheName);
                        await cache.put(request, response.clone());
                    } catch (error) {
                        console.warn('Could not save a counter resource for offline use.', error);
                    }
                }
                return response;
            })
            .catch(async () => {
                const cache = await caches.open(cacheName);
                const cached = await cache.match(request) || await caches.match(request);
                if (cached) return cached;
                if (request.mode === 'navigate') return (await caches.match('/counter/index.html')) || Response.error();
                return Response.error();
            })
    );
});
