// WOZALI — Service Worker (PWA install + Web Push)
const CACHE_NAME = 'wozali-v4';
const PRECACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // La coquille HTML (requêtes de navigation) doit TOUJOURS venir fraîche de
  // l'origine : sinon un cache HTTP navigateur peut servir un vieil index.html
  // qui pointe vers d'anciennes versions d'assets (?v=...). On force cache:'reload'
  // pour bypasser le cache HTTP du navigateur, avec repli cache si hors-ligne.
  var isNav = e.request.mode === 'navigate' ||
    (e.request.method === 'GET' && (e.request.headers.get('accept') || '').indexOf('text/html') !== -1);
  if (isNav) {
    e.respondWith(
      fetch(e.request, { cache: 'reload' }).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(m) { return m || caches.match('/index.html'); });
      })
    );
    return;
  }
  // Reste (assets, API) : network-first — réseau d'abord, cache en repli hors-ligne
  e.respondWith(
    fetch(e.request).then(function(response) {
      if (e.request.method === 'GET' && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});

// ─── Web Push : afficher la notification ────────────────────────────
self.addEventListener('push', function(event) {
  var data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    try { data = { title: 'WOZALI', body: event.data ? event.data.text() : '' }; }
    catch (_) { data = {}; }
  }

  var title = data.title || 'WOZALI';
  var options = {
    body: data.body || '',
    icon: data.icon || '/logos/mark.svg',
    badge: data.badge || '/logos/mark.svg',
    tag: data.tag || 'wozali-default',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/#dashboard',
      payload: data.data || {}
    },
    vibrate: [120, 60, 120]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Click sur la notification : ouvrir / focus le dashboard ────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/#dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientsArr) {
      // Si une fenêtre WOZALI est déjà ouverte, on la focus + on navigue dessus
      for (var i = 0; i < clientsArr.length; i++) {
        var c = clientsArr[i];
        try {
          var url = new URL(c.url);
          if (url.origin === self.location.origin) {
            c.focus();
            if ('navigate' in c) { try { c.navigate(targetUrl); } catch (e) {} }
            return;
          }
        } catch (e) {}
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
