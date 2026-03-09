// ════════════════════════════════════════════════════════════════
// service-worker.js — PWA кэширование для офлайн-работы
// ════════════════════════════════════════════════════════════════

const CACHE_NAME = 'my-menu-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './storage.js',
  './ui.js',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Установка: кэшируем все основные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: сначала сеть, при ошибке — кэш (Network First)
self.addEventListener('fetch', event => {
  // API-запросы к Worker и Yerevan City не кэшируем
  if (event.request.url.includes('workers.dev') || event.request.url.includes('yerevan-city.am')) {
    return; // Передаём запрос напрямую
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Кэшируем успешные GET-ответы
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
