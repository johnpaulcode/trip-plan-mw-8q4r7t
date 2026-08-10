/* Offline cache. Bump CACHE on every deploy or the old page is served forever. */
var CACHE  = 'trip-mw-v2';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

/* Hosts that must always go to the network. Caching either of these would be a
   bug: the itinerary would go stale, and the weather refresh button would
   silently return the same forecast forever. */
var LIVE = ['firebasedatabase.app', 'api.open-meteo.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  for (var i = 0; i < LIVE.length; i++) {
    if (url.hostname.indexOf(LIVE[i]) !== -1) return;
  }
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit || caches.match('./index.html'); });
      return hit || net;
    })
  );
});
