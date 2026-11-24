const CACHE = 'kristens-words-__APP_BUILD_REVISION__';
const APP_CACHE_PREFIX = 'kristens-words-';
const IMAGE_CACHE = 'kristens-words-images-v1';
const R2_HOST = 'pub-c53fff4920214dd59d4a14590b17acae.r2.dev';
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
  '/counter/tailwind.css',
];

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
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE && key !== IMAGE_CACHE)
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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.hostname === R2_HOST && request.destination === 'image') {
    event.respondWith(fetchR2Image(request));
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
