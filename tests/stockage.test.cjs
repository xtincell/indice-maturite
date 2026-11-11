// Repli sans stockage : aucun échec de localStorage ne doit lever ni promettre une conservation.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const d = require("../diagnostic.js");
const KEY = "adve-indice-draft-1";

function memoire(initial = {}, { getItem, setItem } = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  return { data, writes,
    getItem: getItem || (k => (data.has(k) ? data.get(k) : null)),
    setItem: setItem || ((k, v) => { writes.push(k); data.set(k, String(v)); }),
    removeItem: k => { data.delete(k); } };
}
const draft = { brand: "SPAWT", answers: [3, ...Array(15).fill(null)], showResult: false };
const raw = JSON.stringify({ ...draft, methodVersion: d.METHOD_VERSION });
const refuse = () => { throw new DOMException("Quota", "QuotaExceededError"); };

test("an inaccessible, null or throwing storage is blocked and never throws", () => {
  for (const getter of [() => { throw new DOMException("Refusé", "SecurityError"); }, () => null, () => undefined,
    () => memoire({}, { getItem: () => { throw new Error("lecture"); } })]) {
    const store = d.openDraftStore(getter, KEY);
    assert.equal(store.access, "blocked");
    assert.equal(store.draft, null);
    assert.equal(store.save({ brand: "", answers: Array(16).fill(null), showResult: false }), false);
  }
});
test("a refused write is detected before any promise of conservation", () => {
  const store = d.openDraftStore(() => memoire({}, { setItem: refuse }), KEY);
  assert.equal(store.access, "readonly");
  assert.equal(store.save(draft), false);
  const repris = d.openDraftStore(() => memoire({ [KEY]: raw }, { setItem: refuse }), KEY);
  assert.equal(repris.access, "readonly");
  assert.deepEqual(repris.draft, draft);
});
test("an unreadable draft is kept intact and never overwritten", () => {
  const s = memoire({ [KEY]: "{illisible" });
  const store = d.openDraftStore(() => s, KEY);
  assert.equal(store.access, "unreadable");
  assert.equal(store.save(draft), false);
  assert.equal(s.data.get(KEY), "{illisible");
  assert.deepEqual(s.writes, []);
});
test("a working storage restores and saves the same versioned draft", () => {
  const s = memoire({ [KEY]: raw });
  const store = d.openDraftStore(() => s, KEY);
  assert.equal(store.access, "ok");
  assert.deepEqual(store.draft, draft);
  assert.ok(![...s.data.keys()].some(k => k !== KEY), "la clé d'essai est retirée");
  const suite = { ...draft, answers: [3, 4, ...Array(14).fill(null)], showResult: true };
  assert.equal(store.save(suite), true);
  assert.deepEqual(d.readDraft(s.data.get(KEY)), suite);
});
test("a write that fails later in the session returns false without throwing", () => {
  let plein = false;
  const s = memoire({}, { setItem: (k, v) => { if (plein) refuse(); } });
  const store = d.openDraftStore(() => s, KEY);
  assert.equal(store.access, "ok");
  plein = true;
  assert.equal(store.save(draft), false);
});
