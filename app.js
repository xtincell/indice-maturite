/* UI autonome : saisie manuelle, sauvegarde locale, bilan documentaire. */
"use strict";
const { AXES, METHOD_VERSION, TOTAL, diagnose, escapeHtml, openDraftStore, toMarkdown } = ADVEIndice;
const storageKey = "adve-indice-draft-1";
const brand = document.getElementById("marque");
const out = document.getElementById("out");
const status = document.getElementById("save-status");
const download = document.getElementById("download");
const keepFile = "Conservez le bilan en fichier avant de quitter la page.";
let showResult = false;

document.getElementById("qs").innerHTML = AXES.map((a, ai) =>
  `<section class="card" aria-label="${a.k}"><h2 class="axe">${a.k}</h2>` + a.q.map((q, qi) =>
    `<div class="q"><label for="q-${ai}-${qi}">${q[0]}<small id="hint-${ai}-${qi}">${q[1]}</small></label>
    <select id="q-${ai}-${qi}" aria-describedby="hint-${ai}-${qi}"><option value="">Non renseigné</option>
    <option value="0">0 · inexistant</option><option value="1">1 · embryonnaire</option>
    <option value="2">2 · partiel</option><option value="3">3 · en place</option>
    <option value="4">4 · solide</option><option value="5">5 · exemplaire</option></select></div>`).join("") + "</section>"
).join("");
const fields = [...document.querySelectorAll("select")];
function state() {
  return { brand: brand.value, answers: fields.map(s => s.value === "" ? null : Number(s.value)), showResult };
}
function render() {
  const s = state();
  const r = diagnose(s.answers);
  download.disabled = !s.brand.trim() && r.answered === 0;
  if (!showResult) return;
  const limits = "Ce bilan repose sur vos déclarations. Il ne prouve ni performance commerciale ni autonomie opérationnelle ; il reste à confronter aux pièces du dossier.";
  if (!r.complete) {
    out.innerHTML = `<div class="presc"><h2>Bilan en cours · ${r.answered}/${TOTAL} réponses</h2>
      <p>Aucun indice global n’est attribué à un questionnaire incomplet. Vous pouvez conserver les réponses disponibles et poursuivre le travail de marque.</p>
      <ul>${r.coverage.map(a => `<li>${a.name} : ${a.answered}/${a.total}</li>`).join("")}</ul>
      <p>${limits}</p></div>`;
    return;
  }
  const minimum = r.lowestAxes.length === 1 ? `Axe à examiner en priorité : ${r.lowestAxes[0]}.` :
    `Axes ex aequo au minimum : ${r.lowestAxes.join(", ")}. Choisissez la priorité selon l’enjeu de votre marque.`;
  out.innerHTML = `<div class="result"><h2>${escapeHtml(s.brand || "Marque")} · bilan déclaratif</h2>
    <div class="big">${r.score.toFixed(2)} / 5</div><div class="lvl">${r.level[0]} · ${r.level[1]}</div>
    <p>${r.answered}/${TOTAL} réponses · ${METHOD_VERSION}</p><p>${limits}</p>
    <div class="bars">${AXES.map((a, i) => `<div class="bar"><span>${a.k}</span><span class="track"><span class="fill" style="width:${r.scores[i] / 5 * 100}%"></span></span><span>${r.scores[i].toFixed(1)}</span></div>`).join("")}</div></div>
    <div class="presc"><h2>Prochaine décision à examiner</h2><p>${r.level[3]}</p><p>${minimum}</p>
    <p class="hint">Conservez ce bilan dans les sources de la marque avec les pièces qui étayent vos réponses. Il ne valide pas automatiquement la stratégie et ne commande aucune prestation.</p></div>`;
}
function notice(text, degraded) {
  status.textContent = text;
  status.classList.toggle("alerte", degraded);
}
// localStorage peut être absent, nul ou lever une exception : le questionnaire reste en mémoire.
const store = openDraftStore(() => window.localStorage, storageKey);
if (store.draft) {
  brand.value = store.draft.brand;
  fields.forEach((field, i) => { field.value = store.draft.answers[i] === null ? "" : String(store.draft.answers[i]); });
  showResult = store.draft.showResult;
}
if (store.access === "ok" && store.draft) {
  notice("Votre dernier travail sur cet appareil a été repris. Les réponses restent déclaratives.", false);
} else if (store.access === "readonly" && store.draft) {
  notice("Votre dernier travail a été repris, mais ce navigateur refuse désormais la sauvegarde locale : la suite de votre progression ne sera pas conservée. " + keepFile, true);
} else if (store.access === "unreadable") {
  notice("Une sauvegarde locale illisible est présente ; elle reste intacte. Votre progression ne sera pas conservée sur cet appareil. " + keepFile, true);
} else if (store.access !== "ok") {
  notice("La sauvegarde locale est bloquée par ce navigateur. Le questionnaire reste utilisable, mais votre progression ne sera pas conservée. " + keepFile, true);
}
function save() {
  if (store.access !== "ok") return;
  if (store.save(state())) {
    notice("Réponses conservées sur cet appareil. Aucune IA n’est nécessaire ; rien n’est envoyé par ce questionnaire.", false);
  } else {
    notice("La sauvegarde locale vient d’échouer : votre progression ne sera pas conservée. " + keepFile, true);
  }
}
document.getElementById("diagnostic").addEventListener("input", () => { render(); save(); });
document.getElementById("diagnostic").addEventListener("change", () => { render(); save(); });
document.getElementById("diagnostic").addEventListener("submit", e => {
  e.preventDefault(); showResult = true; render(); save(); out.focus();
});
download.addEventListener("click", () => {
  const blob = new Blob([toMarkdown(state())], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "autodiagnostic-adve.md";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();
