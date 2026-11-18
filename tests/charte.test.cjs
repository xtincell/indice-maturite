// Charte UPgraders : la page lit les jetons de la charte et porte le cadre commun.
// Reprend, pour le CSS de la page, les clauses couleur et police de la règle
// d'adhérence de la charte (ADVE-project, docs/design-system/upgraders/_adherence.oxlintrc.json).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const blocs = [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)];
const charte = blocs.filter(([, attrs]) => /id="charte-upgraders"/.test(attrs)).map(b => b[2]).join("\n");
const page = blocs.filter(([, attrs]) => !/id="charte-upgraders"/.test(attrs)).map(b => b[2])
  .concat([...html.matchAll(/\sstyle="([^"]*)"/gi)].map(m => m[1])).join("\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const POLICE = /^(?:var\(--font-(?:display|sans|mono)\)|inherit)$/;

test("hors de la copie de la charte, aucune couleur en dur ni police hors charte", () => {
  const ecarts = [];
  for (const m of page.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|:\s*(?:white|black)\b/gi)) ecarts.push("couleur " + m[0]);
  for (const m of page.matchAll(/font-family\s*:\s*([^;}]+)/gi)) if (!POLICE.test(m[1].trim())) ecarts.push("police " + m[1].trim());
  for (const m of page.matchAll(/(?<![-\w])font\s*:\s*([^;}]+)/gi)) {
    const famille = m[1].trim().split(/\s+/).pop();
    if (!POLICE.test(famille)) ecarts.push("police " + m[1].trim());
  }
  assert.deepEqual(ecarts, []);
});

test("la copie de la charte porte l'accent, les surfaces et les polices UPgraders", () => {
  assert.match(charte, /--up-red:\s*#e56458;/);
  assert.match(charte, /--accent:\s*var\(--up-red\);/);
  assert.match(charte, /--surface-card:\s*var\(--up-ink-2\);/);
  assert.match(charte, /--up-ink-2:\s*#151515;/);
  assert.match(charte, /--text-primary:\s*var\(--up-bone\);/);
  assert.match(charte, /--font-display:\s*"Clash Display"/);
  assert.match(charte, /--font-sans:\s*"Satoshi"/);
});

test("le bandeau et le pied ramènent à powerupgraders.com et aux autres outils", () => {
  for (const cadre of [/<nav class="upg-barre"[\s\S]*?<\/nav>/, /<div class="upg-pied">[\s\S]*?<\/nav>/]) {
    const bloc = html.match(cadre);
    assert.ok(bloc, "cadre absent : " + cadre);
    for (const url of ["https://powerupgraders.com/", "https://la-barre-vitrine.powerupgraders.com/", "https://galahad.powerupgraders.com/"]) {
      assert.ok(bloc[0].includes(`href="${url}"`), url);
    }
    assert.match(bloc[0], /href="https:\/\/xtincell\.github\.io\/indice-maturite\/" aria-current="page"/);
  }
});
