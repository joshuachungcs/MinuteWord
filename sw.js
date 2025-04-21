// Define a cache name (update this version number any time you change cached files)
const CACHE_NAME = 'minute-word-cache-v1';

// List the URLs of the files you want to cache
const urlsToCache = [
  '/', // Cache the root (index.html might be accessed as /)
  '/index.html',
  '/sketch.js',
  'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.js', // Cache the p5.js library from CDN
  '/manifest.json',
  '/images/icon-192x192.png', // Cache your icons
  '/images/icon-512x512.png'
  // Add any other assets your sketch uses (e.g., sounds, images, fonts)
  // Example: '/sounds/ding.mp3', '/images/background.jpg'
];

// Install event: This happens when the service worker is installed for the first time
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  // Wait until the cache is opened and all specified files are added
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache addAll failed', error);
      })
  );
});

// Fetch event: Intercepts network requests
self.addEventListener('fetch', (event) => {
  // Check if the request URL is one we want to cache or handle
  // This example uses a 'Cache first, then network' strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the resource is found in the cache, return it
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        // Otherwise, fetch from the network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request);
      })
      .catch((error) => {
        console.error('Service Worker: Fetch failed:', error);
        // You could return a fallback page here if fetching fails completely
        // return caches.match('/offline.html');
      })
  );
});

// Activate event: This happens when the service worker becomes active
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  // Clean up old caches
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});