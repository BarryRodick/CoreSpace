const CACHE_NAME = 'deck-builder-v0.3';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './deckbuilder.js',
    './manifest.json',
    './logos/gameicon.jpg',
    './cards.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
