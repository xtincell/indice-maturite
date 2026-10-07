/* Questionnaire ADVE autonome, sans fournisseur ni transmission réseau. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ADVEIndice = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
const AXES=[
 {k:"AUTHENTICITÉ",q:[
  ["La marque sait-elle dire ce qu'elle est et ne peut pas être ?","Une plateforme écrite, pas une intuition du dirigeant."],
  ["Ses codes tiennent-ils quand un tiers produit à sa place ?","Un prestataire externe produit-il du reconnaissable ?"],
  ["L'histoire d'origine est-elle exploitée en communication ?","Fondation, savoir-faire, territoire réel."],
  ["Les prises de parole sont-elles cohérentes d'un canal à l'autre ?","Même marque en OOH, en digital et en point de vente."]]},
 {k:"DISTINCTION",q:[
  ["Reconnaît-on la marque sans voir son logo ?","Test du cache-logo sur les trois dernières sorties."],
  ["Le territoire visuel est-il distinct de celui du concurrent direct ?","Nommer le concurrent et comparer."],
  ["Existe-t-il un système graphique documenté ?","Charte appliquée, pas seulement dessinée."],
  ["Les sorties rompent-elles le scroll dans leur catégorie ?","Constaté, pas supposé."]]},
 {k:"VALEUR",q:[
  ["Chaque campagne est-elle rattachée à un objectif business chiffré ?","Volume, part de marché, recrutement, trafic."],
  ["Mesure-t-on quelque chose après diffusion ?","Un chiffre existe-t-il, même imparfait ?"],
  ["Le coût par livrable est-il connu ?","Sinon aucun gain de productivité n'est démontrable."],
  ["Le délai brief → livraison est-il suivi ?","La vitesse ne se vend que si elle se mesure."]]},
 {k:"ENGAGEMENT",q:[
  ["La marque a-t-elle un public qui revient de lui-même ?","Communauté, rituel, rendez-vous."],
  ["Existe-t-il un rituel de marque récurrent ?","Temps fort possédé, pas seulement saisonnier."],
  ["Le public produit-il du contenu pour la marque ?","UGC, ambassadeurs, relais spontanés."],
  ["Y a-t-il un mécanisme de fidélisation actif ?","Programme, club, avantage réel."]]}];
const NIV=[
 [0,"Fragmenté","Aucun socle. Chaque sortie repart de zéro.","Cadrage de marque — plateforme et territoire. Rien d'autre n'est vendable avant."],
 [1,"Réactif","La marque répond aux urgences, sans cap.","Cadrage + calendrier des temps forts. Sortir du coup par coup."],
 [2,"Structuré","Un socle existe, l'exécution reste artisanale.","Système master → variantes marché → déclinaisons. Documenter le gain attendu, puis le mesurer."],
 [3,"Industrialisé","La production tient à l'échelle.","Examiner le déploiement multi-marchés et la capacité disponible."],
 [4,"Piloté","La marque mesure et corrige.","Boucle de performance : ce qui marche est rejoué, ce qui échoue est retiré."],
 [5,"Autonomie déclarée","La continuité sans son auteur reste à éprouver.","Transmission et gouvernance. Le rôle devient celui d'un arbitre, pas d'un opérateur."]];

const METHOD_VERSION = "ADVE-AUTODIAGNOSTIC-1";
const TOTAL = AXES.reduce((sum, axis) => sum + axis.q.length, 0);
function validAnswers(answers) {
  return Array.isArray(answers) && answers.length === TOTAL &&
    answers.every(v => v === null || (Number.isInteger(v) && v >= 0 && v <= 5));
}
function diagnose(answers) {
  if (!validAnswers(answers)) throw new Error("Réponses de diagnostic invalides.");
  const answered = answers.filter(v => v !== null).length;
  const coverage = AXES.map((axis, i) => ({ name: axis.k,
    answered: answers.slice(i * 4, i * 4 + 4).filter(v => v !== null).length, total: axis.q.length }));
  if (answered !== TOTAL) return { complete: false, answered, total: TOTAL, coverage };
  const scores = AXES.map((_, i) => answers.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0) / 4);
  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { complete: true, answered, total: TOTAL, coverage, scores, score,
    level: NIV[Math.min(5, Math.round(score))], lowestAxes: AXES.filter((_, i) => scores[i] === Math.min(...scores)).map(a => a.k) };
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function readDraft(raw) {
  const d = JSON.parse(raw);
  if (!d || d.methodVersion !== METHOD_VERSION || typeof d.brand !== "string" ||
      d.brand.length > 200 || typeof d.showResult !== "boolean" || !validAnswers(d.answers)) {
    throw new Error("La sauvegarde du diagnostic n’est pas lisible.");
  }
  return { brand: d.brand, answers: d.answers, showResult: d.showResult };
}
function markdownText(value) {
  return String(value).replace(/[\r\n]/g, " ").replace(/[\\`*_{}\[\]()#+.!<>|]/g, "\\$&");
}
function toMarkdown({ brand, answers }, date = new Date().toISOString()) {
  const result = diagnose(answers);
  const lines = ["# Autodiagnostic de marque ADVE", "", `Marque : ${markdownText(brand || "Non précisée")}`,
    `Date du bilan : ${date}`, `Méthode : ${METHOD_VERSION}`, `Couverture : ${result.answered}/${result.total} réponses`, "",
    "Nature : déclarations de la personne qui répond. Ce bilan ne prouve ni une performance commerciale, ni une autonomie opérationnelle. Il ne vaut pas validation de la marque.", ""];
  if (result.complete) {
    lines.push(`Indice déclaratif : ${result.score.toFixed(2)}/5`, `Repère : ${result.level[1]}`,
      `Piste à examiner : ${result.level[3]}`, `Axes au minimum (ex aequo possibles) : ${result.lowestAxes.join(", ")}`, "");
  } else lines.push("Bilan incomplet : aucun indice global ni prescription définitive.", "Les réponses disponibles peuvent éclairer la suite ; les inconnues restent à qualifier.", "");
  AXES.forEach((axis, ai) => {
    lines.push(`## ${axis.k}`, "");
    axis.q.forEach((q, qi) => {
      const value = answers[ai * 4 + qi];
      lines.push(`- ${q[0]} — ${value === null ? "Non renseigné" : value + "/5 déclaré"}`);
    });
    lines.push("");
  });
  lines.push("## Reprendre dans le dossier de marque", "", "Conserver ce fichier dans les sources du bon dossier La Fusée. Examiner les réponses, les pièces qui les étayent et la prochaine décision. Le dépôt d’une source ne l’approuve pas et ne lance pas d’IA.", "");
  return lines.join("\n");
}
return { AXES, NIV, METHOD_VERSION, TOTAL, diagnose, escapeHtml, validAnswers, readDraft, toMarkdown };
});
