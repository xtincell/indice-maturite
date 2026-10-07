const { test } = require("node:test");
const assert = require("node:assert/strict");
const d = require("../diagnostic.js");

test("a four-answer questionnaire has coverage, never a full score or prescription", () => {
  const answers = Array(16).fill(null);
  [0, 4, 8, 12].forEach(i => { answers[i] = 5; });
  const r = d.diagnose(answers);
  assert.equal(r.answered, 4);
  assert.equal(r.complete, false);
  assert.equal(r.score, undefined);
  assert.equal(r.level, undefined);
  assert.ok(!d.toMarkdown({ brand: "Essai", answers }).includes("Indice déclaratif :"));
  assert.ok(d.toMarkdown({ brand: "Essai", answers }).includes("Couverture : 4/16"));
});
test("full self-assessment preserves exact scores and all tied axes", () => {
  const r = d.diagnose(Array(16).fill(2));
  assert.equal(r.score, 2);
  assert.deepEqual(r.lowestAxes, d.AXES.map(a => a.k));
  assert.deepEqual(d.diagnose([0,0,0,0,...Array(12).fill(4)]).lowestAxes, ["AUTHENTICITÉ"]);
});
test("extreme declarations do not promise proven operational autonomy", () => {
  const r = d.diagnose(Array(16).fill(5));
  assert.equal(r.score, 5);
  assert.equal(r.level[1], "Autonomie déclarée");
  assert.match(d.toMarkdown({ brand: "Essai", answers: Array(16).fill(5) }), /ne prouve ni une performance commerciale/);
});
test("invalid answers cannot be scored or restored as valid history", () => {
  for (const a of [[], Array(16).fill(6), Array(16).fill(-1), Array(16).fill("5"), Array(16).fill(NaN)]) {
    assert.throws(() => d.diagnose(a));
  }
  assert.throws(() => d.readDraft(JSON.stringify({ methodVersion: "unknown", answers: Array(16).fill(5) })));
});
test("partial progress survives an exact versioned round trip", () => {
  const draft = { methodVersion: d.METHOD_VERSION, brand: "SPAWT & compagnie", answers: [3,...Array(15).fill(null)], showResult: true };
  assert.deepEqual(d.readDraft(JSON.stringify(draft)), { brand: draft.brand, answers: draft.answers, showResult: true });
});
test("a name is literal text in HTML and cannot inject report structure", () => {
  assert.equal(d.escapeHtml('A <b>marque</b> & "B"'), 'A &lt;b&gt;marque&lt;/b&gt; &amp; &quot;B&quot;');
  const md = d.toMarkdown({ brand: "Marque\n# Fausse décision <b>", answers: Array(16).fill(2) }, "2026-10-07T00:00:00Z");
  assert.ok(!md.includes("\n# Fausse décision"));
  assert.ok(!md.includes("<b>"));
  assert.match(md, /ADVE-AUTODIAGNOSTIC-1/);
  assert.equal((md.match(/\/5 déclaré/g) || []).length, 16);
});
