/* CK-VATCalc service worker.
 *
 * VERSIONING: change VERSION below on every release (and only here). The cache name
 * changes with it, so the browser sees a byte-different worker and starts an update.
 *
 * LIFECYCLE
 * - install: download every shell file into a NEW cache. If any file fails, install
 *   fails and the old worker/cache keep running untouched.
 * - waiting: the new worker does NOT skipWaiting by itself. The page shows
 *   "A new version is available." and sends {type:'SKIP_WAITING'} when the user taps Update now.
 * - activate: delete older ckvatcalc-* caches, then clients.claim().
 */
var VERSION = '1.0.9';
var CACHE_PREFIX = 'ckvatcalc-';
var CACHE_NAME = CACHE_PREFIX + VERSION;
var APP_SCOPE = self.registration.scope;
var INDEX_URL = new URL('index.html', APP_SCOPE).href;

// Relative to the worker's own location, so it works under /RepoName/ on GitHub Pages.
var SHELL_FILES = [
  './',
  'index.html',
  'styles.css',
  'vat.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // cache:'reload' bypasses the HTTP cache so we never store stale GitHub Pages copies
      return Promise.all(SHELL_FILES.map(function (url) {
        var resourceURL = new URL(url, APP_SCOPE).href;
        return fetch(new Request(resourceURL, { cache: 'reload' })).then(function (res) {
          if (!res.ok) throw new Error('Failed to cache ' + resourceURL + ' (' + res.status + ')');
          return cache.put(resourceURL, res);
        }).catch(function (error) {
          // Wait for all writes to settle before removing a partially populated cache.
          return { cacheError: error };
        });
      })).then(function (results) {
        var failed = results.find(function (result) { return result && result.cacheError; });
        if (!failed) return;
        // A failed install must not leave a partial cache that could be mistaken for a shell.
        return caches.delete(CACHE_NAME).then(function () { throw failed.cacheError; });
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION });
  }
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Keep the app entry point anchored to the registered scope (including /RepoName/).
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(INDEX_URL).then(function (hit) { return hit || fetch(req); });
      })
    );
    return;
  }

  // Static assets: cache-first from the current version's cache only.
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); });
    })
  );
});
