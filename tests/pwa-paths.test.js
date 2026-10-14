'use strict';

// Regression checks for the GitHub Pages project-site path. This does not replace
// checking the published site, but catches accidental domain-root URLs in source.
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');

var root = path.resolve(__dirname, '..');
var deploymentBase = 'https://melhive.github.io/CrispyKing-VATCalc/';
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var manifestText = fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8');
var worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
var app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
var manifest = JSON.parse(manifestText);

function localPath(reference) {
  return reference.split(/[?#]/, 1)[0];
}

function assertLocalFile(reference, owner) {
  assert.ok(!reference.startsWith('/'), owner + ' must not use a domain-root path: ' + reference);
  var file = path.join(root, localPath(reference));
  assert.ok(fs.existsSync(file), owner + ' references missing file: ' + reference);
  var resolved = new URL(reference, deploymentBase);
  assert.ok(resolved.href.startsWith(deploymentBase), owner + ' escapes the project base: ' + reference);
  return resolved;
}

var manifestLink = html.match(/<link\b(?=[^>]*\brel="manifest")(?=[^>]*\bhref="([^"]+)")[^>]*>/i);
assert.ok(manifestLink, 'index.html must link the web app manifest');
assertLocalFile(manifestLink[1], 'manifest link');

var startURL = new URL(manifest.start_url, deploymentBase);
var scopeURL = new URL(manifest.scope, deploymentBase);
var idURL = new URL(manifest.id, new URL(manifestLink[1], deploymentBase));
assert.equal(startURL.href, deploymentBase, 'start_url must resolve to the project entry point');
assert.equal(idURL.href, startURL.href, 'manifest id and start_url must identify the same app');
assert.ok(startURL.href.startsWith(scopeURL.href), 'scope must contain start_url');
assert.equal(manifest.display, 'standalone');

var htmlReferences = Array.from(html.matchAll(/\b(?:href|src)="([^"]+)"/g), function (match) {
  return match[1];
}).filter(function (ref) {
  return !/^(?:[a-z]+:|#|\/\/)/i.test(ref);
});
htmlReferences.forEach(function (ref) { assertLocalFile(ref, 'index.html'); });

var shellList = worker.match(/var SHELL_FILES = \[([\s\S]*?)\];/);
assert.ok(shellList, 'service worker must declare its shell resources');
var shellResources = Array.from(shellList[1].matchAll(/'([^']+)'/g), function (match) {
  return match[1];
});
shellResources.forEach(function (ref) {
  assertLocalFile(ref, 'service-worker.js shell');
});
assert.match(worker, /new URL\('index\.html', APP_SCOPE\)/, 'navigation fallback must resolve under worker scope');
assert.match(worker, /new URL\('\.\/', APP_SCOPE\)/, 'scoped-root fallback must resolve under worker scope');
assert.match(worker, /new URL\(url, APP_SCOPE\)/, 'shell cache URLs must resolve under worker scope');
assert.match(worker, /fetch\(new Request\(resourceURL, \{ cache: 'reload' \}\)\)/, 'shell fetch must use the resolved absolute URL');
assert.match(worker, /cache\.put\(resourceURL, res\)/, 'cache key must match the fetched absolute URL');
assert.match(worker, /cache\.match\(INDEX_URL\)/, 'navigation fallback must check the canonical index URL');
assert.match(worker, /cache\.match\(ROOT_URL\)/, 'navigation fallback must check the scoped root URL');
assert.match(worker, /return fetch\(req\);/, 'navigation miss must retain the network status and response');
assert.match(worker, /caches\.delete\(CACHE_NAME\)/, 'failed install must remove its incomplete version cache');
assert.match(worker, /var VERSION = '1\.0\.10'/, 'worker behavior change must use a new cache version');
assert.match(worker, /data\.type === 'SKIP_WAITING'[\s\S]*self\.skipWaiting\(\)/, 'user-controlled update activation must remain');
assert.match(app, /register\('service-worker\.js'/, 'worker registration should stay relative to the deployed document');

var workerScope = new URL('service-worker.js', deploymentBase);
var registeredScope = new URL('.', workerScope);
assert.equal(registeredScope.href, deploymentBase, 'worker registration scope must cover the project start URL');
assert.equal(new URL('index.html', registeredScope).href, deploymentBase + 'index.html');
assert.equal(new URL('./', registeredScope).href, deploymentBase);

manifest.icons.forEach(function (icon) {
  var iconURL = assertLocalFile(icon.src, 'manifest icon');
  var file = path.join(root, localPath(icon.src));
  var data = fs.readFileSync(file);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', icon.src + ' must be PNG');
  var width = data.readUInt32BE(16);
  var height = data.readUInt32BE(20);
  assert.equal(icon.sizes, width + 'x' + height, icon.src + ' declared dimensions must match');
  assert.equal(icon.type, 'image/png');
  assert.ok(iconURL.href.startsWith(deploymentBase));
});

console.log('PWA project-path checks passed.');
