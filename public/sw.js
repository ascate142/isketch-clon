// Service Worker for iSketch PWA
const CACHE_NAME = 'isketch-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/game.js',
  '/manifest.json',
  '/socket.io/socket.io.js',
  '/sounds/lobby_music.mp3',
  '/sounds/turn_start.mp3',
  '/sounds/guessed.mp3',
  '/sounds/close.mp3',
  '/sounds/system.mp3',
  '/sounds/tick.mp3',
  '/sounds/timeout.mp3',
  '/sounds/hint.mp3',
  '/sounds/gameover.mp3',
  '/sounds/report.mp3',
  '/sounds/kick.mp3',
  '/sounds/chat.mp3'
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});