// Ouverture hors ligne : aucune ressource externe, copie locale complète et repli du service worker.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const SERVED = ["index.html", "diagnostic.js", "app.js", "sw.js"];
const SCOPE = "https://xtincell.github.io/indice-maturite/";

function loadWorker({ online = () => true, stores = new Map() } = {}) {
  const listeners = {};
  const network = [];
  const reponse = (url, body) => ({ ok: true, status: 200, type: "basic", redirected: false, url, body,
    clone() { return reponse(url, body); } });
  const fetch = async request => {
    const url = typeof request === "string" ? request : request.url;
    network.push(url);
    if (!online()) throw new TypeError("Failed to fetch");
    return reponse(url, "réseau:" + new URL(url).pathname);
  };
  const store = name => { if (!stores.has(name)) stores.set(name, new Map()); return stores.get(name); };
  const caches = {
    open: async name => ({
      addAll: async requests => { for (const r of requests) store(name).set(r.url, await fetch(r)); },
      put: async (key, res) => { store(name).set(typeof key === "string" ? key : key.url, res); },
    }),
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async (key, opts = {}) => {
      const hit = stores.get(opts.cacheName) && stores.get(opts.cacheName).get(key);
      return hit ? hit.clone() : undefined;
    },
  };
  class ScopedRequest extends Request { constructor(url, init) { super(new URL(url, SCOPE), init); } }
  const self = { location: new URL(SCOPE + "sw.js"), addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: async () => {}, clients: { claim: async () => {} } };
  vm.runInNewContext(read("sw.js"), { self, caches, fetch, Request: ScopedRequest, Response, URL, Set, Promise });
  async function dispatch(type, request) {
    const pending = []; let responded = null;
    listeners[type]({ request, waitUntil: p => pending.push(p), respondWith: p => { responded = p; } });
    const response = responded ? await responded : null;
    await Promise.all(pending);
    return response;
  }
  return { dispatch, stores, network };
}

test("served files load no external resource and send nothing", () => {
  for (const f of SERVED) {
    assert.doesNotMatch(read(f), /(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/i, `${f} : URL externe`);
  }
  const html = read("index.html");
  assert.doesNotMatch(html, /@import|url\(|<link\b|<iframe\b|<img\b/i);
  for (const [, ref] of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    assert.match(ref, /^\.\/[\w.-]+$/, `référence non locale : ${ref}`);
  }
  for (const f of ["app.js", "diagnostic.js"]) {
    assert.doesNotMatch(read(f), /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts/, `${f} : appel réseau`);
  }
});

test("every local resource of the page is in the offline copy", () => {
  const sw = read("sw.js");
  const files = JSON.parse(sw.match(/const FILES = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
  const refs = [...read("index.html").matchAll(/\bsrc\s*=\s*["'](\.\/[^"']+)["']/gi)].map(m => m[1]);
  assert.ok(refs.length >= 2);
  for (const ref of ["./", "./index.html", ...refs]) assert.ok(files.includes(ref), `${ref} absent de la copie hors ligne`);
  for (const f of files.filter(f => f !== "./")) assert.ok(fs.existsSync(path.join(root, f)), `${f} introuvable`);
  assert.match(read("app.js"), /serviceWorker\.register\("\.\/sw\.js"\)/);
});

test("the worker prefers the network, then serves its copy without network", async () => {
  let online = false;
  const sw = loadWorker({ online: () => online });
  const sansCopie = await sw.dispatch("fetch", new Request(SCOPE + "app.js"));
  assert.equal(sansCopie.type, "error", "sans copie ni réseau : erreur réseau, pas de contenu inventé");
  online = true;
  await sw.dispatch("install");
  const [name] = sw.stores.keys();
  assert.deepEqual([...sw.stores.get(name).keys()].sort(),
    ["", "app.js", "diagnostic.js", "index.html"].map(f => SCOPE + f).sort());

  const enLigne = await sw.dispatch("fetch", new Request(SCOPE + "app.js?v=2"));
  assert.equal(enLigne.body, "réseau:/indice-maturite/app.js");

  online = false;
  const page = await sw.dispatch("fetch", new Request(SCOPE + "?depuis=onglet"));
  assert.equal(page.body, "réseau:/indice-maturite/");
  const script = await sw.dispatch("fetch", new Request(SCOPE + "diagnostic.js"));
  assert.equal(script.body, "réseau:/indice-maturite/diagnostic.js");
});

test("the worker ignores foreign requests and only removes its own old copies", async () => {
  const stores = new Map([["indice-maturite-ancien", new Map()], ["autre-projet-1", new Map()]]);
  const sw = loadWorker({ stores });
  assert.equal(await sw.dispatch("fetch", new Request("https://exemple.org/app.js")), null);
  assert.equal(await sw.dispatch("fetch", new Request(SCOPE + "inconnu.js")), null);
  assert.equal(await sw.dispatch("fetch", new Request(SCOPE + "app.js", { method: "POST", body: "x" })), null);
  assert.deepEqual(sw.network, []);
  await sw.dispatch("install");
  await sw.dispatch("activate");
  assert.deepEqual([...stores.keys()].sort(), ["autre-projet-1", "indice-maturite-hors-ligne-1"]);
});
