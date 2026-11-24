const CACHE = 'kristens-words-__APP_BUILD_REVISION__';
const APP_CACHE_PREFIX = 'kristens-words-';
const IMAGE_CACHE = 'kristens-words-images-v1';
const COUNTER_ASSET_CACHE = 'kristens-words-counter-assets-v1';
const R2_HOST = 'pub-c53fff4920214dd59d4a14590b17acae.r2.dev';
const COUNTER_EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
];
const COUNTER_EXTERNAL_HOSTS = new Set([
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com',
]);
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/ready-play-speech.png',
  '/icon-192.png',
  '/icon-512.png',
  '/branding/kristens-words-bakula.png',
  '/fonts/Bubble.woff',
  '/fonts/Jenthill.woff',
  '/counter/index.html',
  '/counter/icon.png',
  '/counter/service-worker.js',
  '/counter/sw.js',
  '/counter/tailwind.css',
];

async function cacheExternalAsset(cache, url) {
  const request = new Request(url, { mode: 'cors' });
  let response;
  try {
    response = await fetch(request, { cache: 'reload' });
  } catch {
    try {
      response = await fetch(new Request(url, { mode: 'no-cors' }), { cache: 'reload' });
    } catch (error) {
      console.warn('Could not precache a counter dependency.', url, error);
      return null;
    }
  }

  if (response.status !== 200 && response.type !== 'opaque') {
    console.warn('Counter dependency returned an unsuccessful response.', url, response.status);
    return null;
  }

  try {
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn('Could not store a counter dependency for offline use.', url, error);
    return null;
  }

  return response.type === 'opaque' ? null : response;
}

async function precacheCounterExternalAssets() {
  const cache = await caches.open(COUNTER_ASSET_CACHE);
  const visited = new Set();
  const pending = [...COUNTER_EXTERNAL_ASSETS];

  while (pending.length > 0) {
    const url = pending.pop();
    if (!url || visited.has(url) || visited.size >= 100) continue;
    visited.add(url);

    const response = await cacheExternalAsset(cache, url);
    if (!response) continue;

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/css')) {
      const css = await response.clone().text();
      for (const match of css.matchAll(/url\((?:['"]?)([^)'"]+)(?:['"]?)\)/g)) {
        const assetUrl = new URL(match[1], url);
        if (COUNTER_EXTERNAL_HOSTS.has(assetUrl.hostname)) pending.push(assetUrl.href);
      }
    } else if (contentType.includes('javascript')) {
      const source = await response.clone().text();
      const importPatterns = [
        /(?:import|export)\s+(?:[^'"]*?\s+from\s*)?['"]([^'"]+)['"]/g,
        /import\(\s*['"]([^'"]+)['"]\s*\)/g,
      ];
      for (const pattern of importPatterns) {
        for (const match of source.matchAll(pattern)) {
          const dependencyUrl = new URL(match[1], url);
          if (COUNTER_EXTERNAL_HOSTS.has(dependencyUrl.hostname)) pending.push(dependencyUrl.href);
        }
      }
    }
  }
}

async function precacheApp() {
  const cache = await caches.open(CACHE);
  const indexResponse = await fetch('/index.html', { cache: 'reload' });
  if (!indexResponse.ok) throw new Error(`Could not precache app shell: ${indexResponse.status}`);

  const html = await indexResponse.clone().text();
  const appAssets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)]
    .map(([, path]) => new URL(path, self.location.origin).href);
  if (appAssets.length === 0) throw new Error('Could not find production JS/CSS assets to precache.');

  await cache.put('/index.html', indexResponse);
  await cache.addAll([...SHELL_ASSETS, ...appAssets]);
  await precacheCounterExternalAssets();
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(APP_CACHE_PREFIX) &&
              key !== CACHE &&
              key !== IMAGE_CACHE &&
              key !== COUNTER_ASSET_CACHE,
          )
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

async function fetchR2Image(request) {
  const cache = await caches.open(IMAGE_CACHE);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { cache: 'no-cache', signal: controller.signal });
    if (response.ok || response.type === 'opaque') {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn('Could not save an image for offline use.', error);
      }
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreVary: true })) ?? Response.error();
  } finally {
    clearTimeout(timeout);
  }
}

function isCounterPath(pathname) {
  return pathname === '/counter' || pathname.startsWith('/counter/');
}

async function fetchCounterRequest(request, url) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok && url.pathname === '/counter') {
      const cache = await caches.open(CACHE);
      await cache.put('/counter/index.html', response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return (
        (await caches.match('/counter/index.html', { ignoreSearch: true })) ??
        (await caches.match('/counter/', { ignoreSearch: true })) ??
        Response.error()
      );
    }
    return Response.error();
  }
}

async function fetchCounterExternalAsset(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && isCounterPath(url.pathname)) {
    event.respondWith(fetchCounterRequest(request, url));
    return;
  }
  if (url.hostname === R2_HOST && request.destination === 'image') {
    event.respondWith(fetchR2Image(request));
    return;
  }
  if (COUNTER_EXTERNAL_HOSTS.has(url.hostname)) {
    event.respondWith(fetchCounterExternalAsset(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        let response;
        try {
          response = await fetch(request, { cache: 'no-cache' });
        } catch {
          return (await caches.match('/index.html')) ?? (await caches.match('/')) ?? Response.error();
        }
        if (response.ok) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put('/index.html', response.clone());
          } catch (error) {
            console.warn('Could not update the offline app shell.', error);
          }
        }
        return response;
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      let response;
      try {
        response = await fetch(request, { cache: 'no-cache' });
      } catch {
        return (await caches.match(request)) ?? Response.error();
      }
      if (response.ok && response.type === 'basic') {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn('Could not update the offline asset cache.', error);
        }
      }
      return response;
    })(),
  );
});
