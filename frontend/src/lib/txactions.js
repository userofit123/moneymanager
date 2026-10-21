// What the entry window, Activity and Needs review change on a transaction, exactly like the current app
// (web/js/04-transactions.js setField, 02-state-data.js setName, and the act() cases in 08-jars.js).
// Each function changes the data S it is given and returns { lines } (the change-history lines, English like the old app),
// or { err } when nothing can be done. Extra results (how many were changed) come back too. Nothing here touches the screen.
import { fm } from "../format.js";
import { dstr } from "../dates.js";
import { jarPay, jarUnpay } from "../core/settle.js";
import { normD, isCardPay, cardInfo, rn, ruleHit, ruleTags, tagSimilar, nameHit, transferIds, isIgnored } from "../views/activity.js";

const byId = (S, id) => (S.tx || []).find((x) => x.id == id);
const MNAME = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", { month: "long" });
const mk = (m) => MNAME(m) + " " + m.slice(0, 4);
const ok = (lines, x = {}) => ({ lines, ...x });

// Category or note of one entry. The old value goes into the history so the change can be undone.
export function setField(S, id, f, v) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  const old = t[f]; if (old === v) return { err: "same" };
  t[f] = v;
  return ok([["Edited " + ({ c: "category", note: "note" }[f] || f), t.desc + ": " + String(old || "—").slice(0, 40) + " → " + String(v || "—").slice(0, 40), { type: "tx", id: t.id, f, old }]]);
}
// The name shown for one entry (the bank's own text stays).
export function setName(S, id, v) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  S.cfg = S.cfg || {}; S.cfg.renames = S.cfg.renames || {};
  v = (v || "").trim().slice(0, 80);
  const old = S.cfg.renames[id] || ""; if (v == old) return { err: "same" };
  if (v) S.cfg.renames[id] = v; else delete S.cfg.renames[id];
  return ok([["Renamed an entry", t.desc + ": " + (old || "—") + " → " + (v || "—")]]);
}
export function addTags(S, id, add) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  t.tags = t.tags || []; add = add.filter((g) => !t.tags.includes(g)); if (!add.length) return { err: "same" };
  add.forEach((g) => t.tags.push(g));
  return ok([["Added tag", t.desc + ": " + add.join(", ")]], { add });
}
export function removeTag(S, id, g) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  const i = (t.tags || []).indexOf(g); if (i < 0) return { err: "same" };
  t.tags.splice(i, 1);
  return ok([["Removed tag", t.desc + ": " + g]]);
}
// "Tag more like this": a tag rule, and the similar transactions already there when asked (case taSave).
export function saveTagRule(S, id, kw, tags, all) {
  kw = String(kw || "").trim().toLowerCase(); if (kw.length < 2) return { err: "kw" };
  const L = tagSimilar(S, kw, id, tags);
  S.tagRules = S.tagRules || [];
  let ex = S.tagRules.find((r) => r.k.toLowerCase() == kw);
  if (ex) ex.t = [...new Set([...ruleTags(ex), ...tags])].join(","); else { ex = { k: kw, t: tags.join(",") }; S.tagRules.push(ex); }
  let n = 0;
  if (all) L.forEach((x) => { x.tags = x.tags || []; tags.forEach((g) => { if (!x.tags.includes(g)) x.tags.push(g); }); n++; });
  return ok([["Added tag rule", `"${kw}" → ${ex.t}${n ? ` · ${n} transaction${n == 1 ? "" : "s"} tagged` : ""}`]], { n });
}

// ---- transfers and duplicates ----
export function xfOk(S, o) {
  const x = (S.xf || []).find((y) => y.o == o); if (!x) return { err: "gone" };
  x.st = "ok";
  return ok([["Transfer confirmed", byId(S, x.o).from + " → " + byId(S, x.i).to]]);
}
export function xfNo(S, o) {
  const x = (S.xf || []).find((y) => y.o == o); if (!x) return { err: "gone" };
  x.st = "rej";
  return ok([["Not a transfer", byId(S, x.o).desc + " and " + byId(S, x.i).desc + " are counted as normal transactions"]]);
}
// Deleting a copy gives back what it took from a jar.
export function dupDel(S, id) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  if (t.jar) jarUnpay(S.jars.find((x) => x.id == t.jar.id), +t.jar.amt || 0);
  S.tx = S.tx.filter((x) => x.id != id);
  return ok([["Deleted duplicate", t.desc + " · " + fm(t.a) + " on " + dstr(t.d)]]);
}
export function dupKeep(S, id) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  S.dupOk = S.dupOk || {}; S.dupOk[id] = 1;
  return ok([["Kept both transactions", t.desc]]);
}

// ---- card payments, left out of totals ----
export function cpMark(S, id) { S.ccOverride = S.ccOverride || {}; S.ccOverride[id] = 2; return ok([["Marked as a card payment", byId(S, id)?.desc || ""]]); }
export function cpCount(S, id) { S.ccOverride = S.ccOverride || {}; S.ccOverride[id] = 1; return ok([["Counted card payment as spending", byId(S, id)?.desc || ""]]); }
export function cpUncount(S, id) { if (S.ccOverride) delete S.ccOverride[id]; return ok([["Treated as a card payment again", byId(S, id)?.desc || ""]]); }
// The other bank payments that look like this card payment and are not counted as one yet (cpOffer).
export function cpSimilar(S, t) {
  const txt = normD(t.desc), ci = cardInfo(S);
  return S.tx.filter((x) => x.id != t.id && x.a < 0 && !x.virtual && ci.banks.has(x.from) && !(S.ccOverride && S.ccOverride[x.id]) && normD(x.desc) == txt && !isCardPay(S, x, ci));
}
// "Always count these as card payments?" (case cpRuleAdd)
export function cpRuleAdd(S, id) {
  const t0 = byId(S, id); if (!t0) return { err: "gone" };
  const txt = normD(t0.desc), n = cpSimilar(S, t0).length, lines = [];
  if (!(S.cardRules || []).map(normD).includes(txt)) { S.cardRules = [...(S.cardRules || []), txt]; lines.push(["Card payment rule", '"' + txt + '" counts as a card payment']); }
  return ok(lines, { n });
}
export function ignOn(S, id) { S.txIgnore = S.txIgnore || {}; S.txIgnore[id] = 1; return ok([["Left out of totals", byId(S, id)?.desc || ""]]); }
export function ignOff(S, id) { if (S.txIgnore) delete S.txIgnore[id]; return ok([["Counted again", byId(S, id)?.desc || ""]]); }

// ---- the month it is counted in ----
export function moSet(S, id, m) {
  const t = byId(S, id); if (!t || !/^\d{4}-\d{2}$/.test(m || "")) return { err: "month" };
  const old = t.rm, own = String(t.d).slice(0, 7), v = m == own ? undefined : m;
  if (v === old) return { err: "same" };
  if (v) t.rm = v; else delete t.rm;
  return ok([["Counted in another month", t.desc + ": " + (v ? mk(v) : "its own month"), { type: "tx", id: t.id, f: "rm", old }]], { v });
}
export function moReset(S, id) {
  const t = byId(S, id); if (!t || !t.rm) return { err: "same" };
  const old = t.rm; delete t.rm;
  return ok([["Counted in another month", t.desc + ": back to its own month", { type: "tx", id: t.id, f: "rm", old }]]);
}

// ---- rules ----
// Other entries a category rule would change (simList).
export const simList = (S, kw, except, cat) => { if (kw.length < 2) return []; const xs = transferIds(S); return S.tx.filter((x) => x.id != except && x.c != (cat || "\u0000") && !xs.has(x.id) && !x.virtual && ruleHit(x, kw)); };
// "Set up a rule for this category?" (case roSave): the rule, and the similar entries get the category now.
export function roSave(S, id, kw, cat) {
  kw = String(kw || "").trim().toLowerCase(); if (kw.length < 2) return { err: "kw" };
  const ex = S.rules.find((r) => r.k.toLowerCase() == kw), sim = simList(S, kw, id, cat), n = sim.length;
  sim.forEach((x) => { x.c = cat; });
  if (ex) { const old = ex.c; ex.c = cat; return ok([["Changed rule", `"${kw}": ${old} → ${cat}`]], { n }); }
  S.rules.push({ k: kw, c: cat, t: "" });
  return ok([["Added rule", `"${kw}" → ${cat}${n ? ` · ${n} similar item${n == 1 ? "" : "s"} categorized` : ""}`]], { n });
}
// A name rule (case nameRuleSave). n: how many entries it renames.
export function nameRuleSave(S, r) {
  const k = String(r.k || "").trim(), n0 = String(r.n || "").trim(); if (!k || !n0) return { err: "need" };
  S.cfg = S.cfg || {}; S.cfg.nameRules = S.cfg.nameRules || [];
  S.cfg.nameRules.push({ k, n: n0, f: r.f, m: r.m });
  const n = S.tx.filter((x) => !x.virtual && nameHit(x, { k, f: r.f, m: r.m })).length;
  return ok([["Added name rule", '"' + k + '" → ' + n0]], { n });
}

// ---- bills ----
// "Mark as a bill" (case billMarkSave): only this payment, or every payment to the store with how often it repeats.
export function billMark(S, id, scope, every) {
  const t = byId(S, id); if (!t) return { err: "gone" };
  const store = t.to || t.desc;
  if (scope == "once") {
    if (S.bills.some((b) => b.mode == "once" && (b.ids || []).includes(t.id))) return { err: "already" };
    S.bills.push({ n: store, mode: "once", ids: [t.id], amt: Math.abs(t.a), src: t.from, cat: t.c || "", match: "#" + t.id, manual: true, every: 0 });
    return ok([["Marked as a bill (one-off)", store + " · " + fm(t.a)]]);
  }
  const key = String(store).toLowerCase().trim(), v = String(every);
  if (S.bills.some((b) => b.mode != "once" && b.match == key)) return { err: "alreadyStore" };
  S.ignoredBills = (S.ignoredBills || []).filter((x) => x != key);
  S.bills.push({ n: store, mode: "rule", match: key, src: t.from, cat: t.c || "", amt: Math.abs(t.a), manual: true, rec: v == "auto" ? "auto" : v == "0" ? "irregular" : "recurring", ...(+v > 0 ? { every: +v, anchor: +t.d.slice(5, 7), dom: Math.min(28, +t.d.slice(8, 10)) } : {}) });
  return ok([["Marked every payment as a bill", store]]);
}
export function billUnmark(S, id) {
  const i = S.bills.findIndex((b) => b.mode == "once" && (b.ids || []).includes(+id || id)); if (i < 0) return { err: "gone" };
  const b = S.bills.splice(i, 1)[0];
  return ok([["Removed from bills", b.n]]);
}
// The bill a payment belongs to (billOf). BC: every bill, worked out (home.billsAll).
export const billOf = (t, BC = []) => (t.a < 0 && !t.virtual ? BC.find((b) => (b.mode == "once" ? (b.ids || []).includes(t.id) : (t.desc + " " + t.to).toLowerCase().includes(b.match))) || null : null);

// ---- jars ----
// Attach a payment to a jar (jarAttachSave): the jar pays up to what it holds. empty: the jar has nothing left after it.
export function jarAttach(S, id, jarId, amount) {
  const t = byId(S, id), j = (S.jars || []).find((x) => x.id == jarId); if (!t || !j) return { err: "gone" };
  const amt = +Math.min(Math.abs(t.a), +amount || 0).toFixed(2);
  if (!(amt > 0)) return { err: "amount" };
  if (!(j.bal + (t.jar && t.jar.id == j.id ? +t.jar.amt || 0 : 0) > 0)) return { err: "emptyJar" };
  if (t.jar) jarUnpay(S.jars.find((x) => x.id == t.jar.id), +t.jar.amt || 0);
  const took = jarPay(j, t, amt);
  if (!(took > 0)) return { err: "nothing" };
  t.jar = { id: j.id, amt: took }; delete t.jarNo;
  return ok([["Attached to a jar", `${t.desc} ${fm(took)} → ${j.n}`]], { empty: j.bal < 1 && !j.done, jar: j.id });
}
export function jarDetach(S, id) {
  const t = byId(S, id); if (!t || !t.jar) return { err: "gone" };
  const j = S.jars.find((x) => x.id == t.jar.id);
  jarUnpay(j, +t.jar.amt || 0);
  delete t.jar; t.jarNo = t.c || "-";
  return ok([["Detached from a jar", t.desc + (j ? " · " + j.n : "")]]);
}
// The jar a payment most likely came out of, from where earlier payments to the same store or category were attached (jarSuggest).
export function jarSuggest(S, t, catJars) {
  const xs = transferIds(S);
  if (t.a >= 0 || t.jar || t.virtual || xs.has(t.id) || isIgnored(S, t) || (t.c && catJars[t.c])) return null;
  const open = (S.jars || []).filter((j) => !j.done), ids = new Set(open.map((j) => j.id)), store = new Map(), cat = new Map(), catAll = new Map();
  S.tx.forEach((x) => {
    if (x.a >= 0 || x.virtual || xs.has(x.id)) return;
    if (x.c) catAll.set(x.c, (catAll.get(x.c) || 0) + 1);
    if (!x.jar) return;
    const j = x.jar.id, s = rn(x.to || x.desc);
    if (s) { const m = store.get(s) || new Map(); m.set(j, (m.get(j) || 0) + 1); store.set(s, m); }
    if (x.c) { const m = cat.get(x.c) || new Map(); m.set(j, (m.get(j) || 0) + 1); cat.set(x.c, m); }
  });
  const sc = new Map(), add = (id, v) => { if (ids.has(id)) sc.set(id, (sc.get(id) || 0) + v); };
  const s = rn(t.to || t.desc); if (s) { const m = store.get(s); if (m) m.forEach((n, id) => add(id, 3 + Math.min(n, 3))); }
  if (t.c) { const m = cat.get(t.c), all = catAll.get(t.c) || 0; if (m) m.forEach((n, id) => { if (n >= 2 && n / all >= 0.4) add(id, 2); }); }
  let best = null, bs = 0; sc.forEach((v, id) => { if (v > bs) { bs = v; best = id; } });
  return bs >= 2 ? open.sort((a, b) => a.p - b.p).find((j) => j.id == best) || null : null;
}

// ---- refunds counted twice ----
// A refund that shows on the card and again as a deposit in the bank (refundTwin).
export function refundTwin(S, t) {
  const xs = transferIds(S);
  if (!(t.a > 0) || t.virtual || isIgnored(S, t) || xs.has(t.id)) return null;
  const kind = (n) => (S.accounts.find((a) => a.n == n) || {}).kind, mine = kind(t.to); if (!mine) return null;
  return S.tx.find((x) => x.id != t.id && x.a > 0 && !isIgnored(S, x) && !xs.has(x.id) && Math.abs(x.a - t.a) <= 0.5 && Math.abs((new Date(x.d) - new Date(t.d)) / 864e5) <= 10 && (mine == "card") != (kind(x.to) == "card") && kind(x.to) && kind(x.to) != "pension") || null;
}
