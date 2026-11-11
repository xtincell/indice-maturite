// Recette navigateur : ouverture hors ligne et repli sans stockage, parcours complet jusqu'au score.
// Hors CI (Playwright n'est pas une dépendance du dépôt). Exemple :
//   NODE_PATH=/chemin/vers/node_modules node tests/recette-navigateur.cjs [site] [rapport.json]
// Le site est servi depuis une copie temporaire avec les en-têtes de cache de GitHub Pages.
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");

const site = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const rapport = process.argv[3] ? path.resolve(process.argv[3]) : null;
const PREFIX = "/indice-maturite/";
const KEY = "adve-indice-draft-1";
const REPONSES = [3, 4, 2, 5, 1, 0, 3, 2, 4, 4, 5, 3, 2, 1, 0, 5];
const attendu = require(path.join(site, "diagnostic.js")).diagnose(REPONSES).score.toFixed(2) + " / 5";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const NON_CONSERVE = /ne sera pas conservée/;
const PROMESSE = /restent sur cet appareil|reste préservée|Réponses conservées/;

const copie = fs.mkdtempSync(path.join(os.tmpdir(), "indice-recette-"));
for (const f of fs.readdirSync(site)) if (/\.(html|js)$/.test(f)) fs.copyFileSync(path.join(site, f), path.join(copie, f));

function serveur() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!p.startsWith(PREFIX)) { res.writeHead(404); return res.end(); }
    const f = path.join(copie, p.slice(PREFIX.length) || "index.html");
    if (!f.startsWith(copie) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
    const corps = fs.readFileSync(f);
    const etag = '"' + crypto.createHash("sha1").update(corps).digest("hex").slice(0, 12) + '"';
    const h = { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "max-age=600", etag };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, h); return res.end(); }
    res.writeHead(200, h); res.end(corps);
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv)));
}
const arreter = srv => new Promise(r => { srv.closeAllConnections(); srv.close(r); });

function journal(page, j) {
  page.on("console", m => { if (m.type() === "error") j.console.push(m.text()); });
  page.on("pageerror", e => j.erreurs.push(String(e && e.message || e)));
  page.on("request", r => { if (!/^(file:|blob:|data:|http:\/\/127\.0\.0\.1)/.test(r.url())) j.externes.push(r.url()); });
}
async function contexte(browser, init) {
  const j = { console: [], erreurs: [], externes: [] };
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); journal(page, j);
  return { ctx, page, j };
}
async function swPret(page) {
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 5000))]);
    return reg && reg.active ? reg.active.scriptURL : null;
  });
}
async function parcours(page) {
  await page.fill("#marque", "Marque de recette");
  for (let i = 0; i < 16; i++) await page.selectOption(`#q-${Math.floor(i / 4)}-${i % 4}`, String(REPONSES[i]));
  await page.click("button[type=submit]");
  const score = await page.textContent("#out .big", { timeout: 2000 }).catch(() => null);
  return score && score.trim();
}
async function ouvrir(page, url) {
  try { await page.goto(url); return "ok"; } catch (e) { return "échec : " + e.message.split("\n")[0]; }
}

(async () => {
  const controles = [];
  const noter = (nom, ok, detail) => { controles.push({ nom, ok: !!ok, detail }); };
  const sain = j => j.console.length === 0 && j.erreurs.length === 0 && j.externes.length === 0;
  const fichier = "file://" + path.join(copie, "index.html");
  const browser = await chromium.launch();

  { // Ouverture directe du fichier, sans aucun accès réseau.
    const { ctx, page, j } = await contexte(browser);
    const ouverture = await ouvrir(page, fichier);
    const score = ouverture === "ok" ? await parcours(page) : null;
    noter("file:// : parcours complet sans réseau", ouverture === "ok" && score === attendu && sain(j), { ouverture, score, ...j });
    await ctx.close();
  }

  let srv = await serveur();
  let base = `http://127.0.0.1:${srv.address().port}${PREFIX}`;
  { // Premier chargement servi, puis réseau coupé et rechargement.
    const { ctx, page, j } = await contexte(browser);
    await ouvrir(page, base);
    const sw = await swPret(page);
    await ctx.setOffline(true);
    let rechargement;
    try { await page.reload(); rechargement = "ok"; } catch (e) { rechargement = "échec : " + e.message.split("\n")[0]; }
    const score = rechargement === "ok" ? await parcours(page) : null;
    noter("hors ligne après un premier chargement : rechargement et parcours", rechargement === "ok" && score === attendu && sain(j), { sw, rechargement, score, ...j });
    await ctx.close();
  }
  { // Mise à jour publiée : en ligne, la version servie remplace la copie.
    const { ctx, page, j } = await contexte(browser);
    await ouvrir(page, base);
    const sw = await swPret(page);
    const indexCopie = path.join(copie, "index.html");
    const original = fs.readFileSync(indexCopie, "utf8");
    fs.writeFileSync(indexCopie, original.replace("<title>", "<title>[publié] "));
    await page.reload();
    const titre = await page.title();
    fs.writeFileSync(indexCopie, original);
    noter("en ligne : la version publiée prime sur la copie", titre.startsWith("[publié]") && sain(j), { sw, titre, ...j });
    await ctx.close();
  }
  { // Serveur réellement arrêté : nouvel onglet du même navigateur.
    const { ctx, page, j } = await contexte(browser);
    await ouvrir(page, base);
    const sw = await swPret(page);
    await arreter(srv);
    const page2 = await ctx.newPage(); journal(page2, j);
    const ouverture = await ouvrir(page2, base + "?depuis=onglet");
    const score = ouverture === "ok" ? await parcours(page2) : null;
    noter("serveur arrêté : nouvel onglet et parcours", ouverture === "ok" && score === attendu && sain(j), { sw, ouverture, score, ...j });
    await ctx.close();
  }

  { // Stockage disponible : reprise d'un travail partiel.
    const { ctx, page, j } = await contexte(browser);
    await ouvrir(page, fichier);
    await page.selectOption("#q-0-0", "3"); await page.selectOption("#q-2-1", "5");
    await page.reload();
    const valeurs = [await page.inputValue("#q-0-0"), await page.inputValue("#q-2-1")];
    const statut = await page.textContent("#save-status");
    noter("stockage disponible : reprise du travail partiel", valeurs.join() === "3,5" && /repris/.test(statut) && sain(j), { valeurs, statut, ...j });
    await ctx.close();
  }

  const variantes = {
    "localStorage lève une exception": `Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("Accès refusé", "SecurityError"); } });`,
    "écriture refusée (quota)": `Storage.prototype.setItem = function () { throw new DOMException("Quota", "QuotaExceededError"); };`,
    "localStorage nul": `Object.defineProperty(window, "localStorage", { configurable: true, get() { return null; } });`,
  };
  for (const [nom, init] of Object.entries(variantes)) {
    const { ctx, page, j } = await contexte(browser, init);
    const ouverture = await ouvrir(page, fichier);
    const avant = await page.textContent("#save-status");
    const score = await parcours(page);
    const apres = await page.textContent("#save-status");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#download")]);
    const md = fs.readFileSync(await dl.path(), "utf8");
    if (rapport && nom === "localStorage lève une exception") {
      await page.locator(".actions").scrollIntoViewIfNeeded();
      await page.screenshot({ path: rapport.replace(/\.json$/, "") + "-stockage-bloque.png" });
    }
    noter(`stockage indisponible (${nom}) : parcours, message et fichier`,
      ouverture === "ok" && score === attendu && sain(j) && [avant, apres].every(s => NON_CONSERVE.test(s) && !PROMESSE.test(s)) &&
      md.includes("Indice déclaratif : " + attendu.replace(" / ", "/")),
      { score, avant, apres, md: (md.match(/Indice déclaratif : .*/) || [])[0], ...j });
    await ctx.close();
  }

  { // Sauvegarde illisible : conservée intacte, progression non promise.
    const brut = "{sauvegarde-illisible";
    const init = `if (!sessionStorage.getItem("semé")) { localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(brut)}); sessionStorage.setItem("semé", "1"); }`;
    const { ctx, page, j } = await contexte(browser, init);
    await ouvrir(page, fichier);
    const score = await parcours(page);
    const statut = await page.textContent("#save-status");
    const reste = await page.evaluate(k => localStorage.getItem(k), KEY);
    noter("sauvegarde illisible : intacte, parcours et message", score === attendu && reste === brut && NON_CONSERVE.test(statut) && sain(j), { score, statut, reste, ...j });
    await ctx.close();
  }
  { // Brouillon lisible mais écriture refusée : reprise sans promesse de conservation.
    const brouillon = { brand: "Brouillon", answers: [3, ...Array(15).fill(null)], showResult: false, methodVersion: "ADVE-AUTODIAGNOSTIC-1" };
    const init = `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(brouillon))});
      Storage.prototype.setItem = function () { throw new DOMException("Quota", "QuotaExceededError"); };`;
    const { ctx, page, j } = await contexte(browser, init);
    await ouvrir(page, fichier);
    const repris = [await page.inputValue("#marque"), await page.inputValue("#q-0-0")];
    const statut = await page.textContent("#save-status");
    const score = await parcours(page);
    noter("brouillon en lecture seule : reprise et message", repris.join() === "Brouillon,3" && score === attendu && NON_CONSERVE.test(statut) && sain(j), { repris, statut, score, ...j });
    await ctx.close();
  }

  await browser.close();
  fs.rmSync(copie, { recursive: true, force: true });
  const resultat = { site, date: new Date().toISOString(), reponses: REPONSES, scoreAttendu: attendu, controles };
  if (rapport) fs.writeFileSync(rapport, JSON.stringify(resultat, null, 2));
  for (const c of controles) console.log(`${c.ok ? "OK  " : "ÉCHEC"} ${c.nom}`);
  process.exitCode = controles.every(c => c.ok) ? 0 : 1;
})().catch(e => { console.error(e); process.exit(2); });
