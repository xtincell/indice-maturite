/* Copie hors ligne de l'Indice : réseau d'abord, copie locale si le réseau manque.
   Seuls les fichiers de l'outil sont conservés ; aucune réponse n'est envoyée ni mise en cache. */
"use strict";
const CACHE = "indice-maturite-hors-ligne-1";
const FILES = ["./", "./index.html", "./diagnostic.js", "./app.js"];
const URLS = new Set(FILES.map(f => new URL(f, self.location).href));

function bare(url) {
  const u = new URL(url);
  u.search = ""; u.hash = "";
  return u.href;
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  // L'origine github.io est partagée par d'autres projets : seules nos copies sont retirées.
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("indice-maturite-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const key = bare(request.url);
  if (!URLS.has(key)) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok && response.type === "basic" && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)));
    }
    return response;
  }).catch(() => caches.match(key, { cacheName: CACHE, ignoreVary: true }).then(hit => hit || Response.error())));
});
