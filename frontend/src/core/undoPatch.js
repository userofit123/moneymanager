// Undo for any change, not only the few kinds the current app records by hand: what a change replaced is kept with its
// history line ({ type: "patch", ops }), and Undo puts those values back. Only the parts that changed are kept, at the
// smallest level that is safe to put back on its own (one field of one transaction, one budget, the list of rules...),
// so later changes to other things stay. Changes that delete transactions get no Undo: the server cannot bring a bank
// transaction back as it was.
const BY_ID = ["tx", "jars", "accounts"]; // lists of things with an id: changed fields, added and removed items
const BY_KEY = ["budgets", "cats", "dismissed", "dupOk", "txIgnore", "ccOverride", "cfg"]; // objects: changed keys
const SKIP = new Set(["audit", "rev", "jarsReserve", "fxCurrencies", "connected", "locked", "connStatus", "companies", "sources", "nwSnaps", "balUpdates", "gaps"]);
const FLAGS = new Set(["balEdit", "balUndo", "balPaid", "balNote"]); // a jar's notes to the server about its last save, not data
const MAX = 64000; // longer than this (a change to thousands of transactions) is not kept
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const copy = (v) => (v === undefined ? undefined : structuredClone(v));

export function makePatch(before, after) {
  if (!before || !after) return null;
  const ops = [];
  for (const c of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (SKIP.has(c) || same(before[c], after[c])) continue;
    if (BY_ID.includes(c) && Array.isArray(before[c]) && Array.isArray(after[c])) {
      const old = new Map(before[c].map((x) => [x.id, x])), now = new Map(after[c].map((x) => [x.id, x]));
      for (const [id, o] of old) {
        const n = now.get(id);
        if (!n) { if (c == "tx") return null; ops.push({ c, id, add: copy(o), at: before[c].indexOf(o) }); continue; }
        for (const f of new Set([...Object.keys(o), ...Object.keys(n)])) if (!FLAGS.has(f) && !same(o[f], n[f])) ops.push({ c, id, f, old: copy(o[f]) });
      }
      for (const id of now.keys()) if (!old.has(id)) ops.push({ c, id, drop: 1 });
    } else if (BY_KEY.includes(c) && before[c] && after[c] && typeof before[c] == "object" && typeof after[c] == "object") {
      for (const k of new Set([...Object.keys(before[c]), ...Object.keys(after[c])])) if (!same(before[c][k], after[c][k])) ops.push({ c, k, old: copy(before[c][k]) });
    } else ops.push({ c, old: copy(before[c]) });
  }
  if (!ops.length || JSON.stringify(ops).length > MAX) return null;
  return { type: "patch", ops };
}

// puts the kept values back on S (in place)
export function applyPatch(S, u) {
  for (const op of u.ops || []) {
    const c = op.c;
    if (op.id !== undefined) {
      const L = (S[c] = S[c] || []), i = L.findIndex((x) => x.id === op.id);
      if (op.drop) { if (i >= 0) L.splice(i, 1); }
      else if (op.add) { if (i < 0) L.splice(Math.min(op.at ?? L.length, L.length), 0, structuredClone(op.add)); }
      else if (i >= 0) {
        const x = L[i], was = x[op.f];
        if (op.old === undefined) delete x[op.f]; else x[op.f] = structuredClone(op.old);
        // a jar's money put back is recorded like the current app's jar undo (web/js/08-jars.js case undo)
        if (c == "jars" && op.f == "bal") { x.balEdit = true; if (op.old > was) { x.balUndo = 1; x.balNote = "Undone"; } }
      }
    } else if (op.k !== undefined) { S[c] = S[c] || {}; if (op.old === undefined) delete S[c][op.k]; else S[c][op.k] = structuredClone(op.old); }
    else if (op.old === undefined) delete S[c]; else S[c] = structuredClone(op.old);
  }
}
