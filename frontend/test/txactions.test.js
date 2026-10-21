// The entry window's changes (lib/txactions.js) change the data and write the history exactly like the current app's own code.
import test from "node:test";
import assert from "node:assert/strict";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import * as A from "../src/lib/txactions.js";

const NOW = new Date(2026, 9, 17, 12), old = oldApp(NOW);
function demo() {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.filter((r) => r.d < "2026-10-18").map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, c: r.c || "", tags: r.tags || [], docs: [], note: "" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank"], ["Max", "ILS", "card"], ["Isracard", "ILS", "card"], ["Wise", "USD", "wallet"]];
  tx.push({ id: 9001, d: "2026-10-05", desc: "To savings", from: "Bank Hapoalim", to: "Wise", a: -1000, c: "", tags: [], docs: [], note: "" }, { id: 9002, d: "2026-10-05", desc: "From bank", from: "Bank Hapoalim", to: "Wise", a: 1000, c: "", tags: [], docs: [], note: "" });
  tx.push({ id: 9003, d: "2026-10-06", desc: "Coffee", from: "Max", to: "Coffee", a: -12, c: "Eating out", tags: [], docs: [], note: "", jar: { id: 1, amt: 12 } });
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: {}, bills: [], ignoredBills: [], jars: [{ id: 1, n: "Fun jar", p: 1, bal: 100, need: 0, cap: 50, got: 0 }], audit: [], xf: [{ o: 9001, i: 9002, st: "auto" }], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 0, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: {}, currencies: ["ILS"], accounts: acc.map(([n, cur, kind], i) => ({ id: i + 1, n, cur, kind, inNW: true, v: 1000, at: NOW.toISOString() })), nwSnaps: [], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {} };
}
// Runs the old code on S: `code` uses the old app's functions (setField, setName, act...). Returns the data and the new history lines.
const oldDo = (S, code) => JSON.parse(old.run(`(()=>{acReset();S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};detect();derive();BC=billsInfo(true);const __n=S.audit.length;${code};return JSON.stringify({S,lines:S.audit.slice(0,S.audit.length-__n).filter(a=>a.who!=="System").map(a=>[a.action,a.detail,a.undo||null])})})()`, { __S: S }));
const newDo = (S, fn) => { const r = fn(S); return JSON.parse(JSON.stringify({ S, lines: (r.lines || []).map(([a, d, u]) => [a, d, u || null]).reverse() })); };
const same = (name, code, fn, pick) => test(name, () => {
  const a = oldDo(demo(), code), b = newDo(demo(), fn);
  assert.deepEqual(b.lines, a.lines);
  if (pick) assert.deepEqual(pick(b.S), pick(a.S));
});
const tx = (id) => (S) => S.tx.find((x) => x.id == id);

same("category change, with undo", "setField(5,'c','Groceries')", (S) => A.setField(S, 5, "c", "Groceries"), (S) => tx(5)(S).c);
same("note change", "setField(5,'note','hello there')", (S) => A.setField(S, 5, "note", "hello there"), (S) => tx(5)(S).note);
same("display name", "setName(5,'My shop')", (S) => A.setName(S, 5, "My shop"), (S) => S.cfg.renames);
same("not a transfer", "act('xfNo',{o:9001})", (S) => A.xfNo(S, 9001), (S) => S.xf);
same("transfer confirmed", "act('xfOk',{o:9001})", (S) => A.xfOk(S, 9001), (S) => S.xf);
same("delete a duplicate gives back what it took from a jar", "act('dupDel',{id:9003})", (S) => A.dupDel(S, 9003), (S) => [S.tx.length, S.jars[0].bal, S.jars[0].paid || 0]);
same("keep both", "act('dupKeep',{id:7})", (S) => A.dupKeep(S, 7), (S) => S.dupOk);
same("card payment marks", "act('cpCount',{id:6});act('cpUncount',{id:6})", (S) => { const a = A.cpCount(S, 6), b = A.cpUncount(S, 6); return { lines: [...a.lines, ...b.lines] }; }, (S) => S.ccOverride);
same("leave out and count again", "act('ignOn',{id:8});act('ignOff',{id:8})", (S) => { const a = A.ignOn(S, 8), b = A.ignOff(S, 8); return { lines: [...a.lines, ...b.lines] }; }, (S) => S.txIgnore);
same("count in another month, and back", "act('moSet',{id:5,m:'2026-08'});act('moReset',{id:5})", (S) => { const a = A.moSet(S, 5, "2026-08"), b = A.moReset(S, 5); return { lines: [...a.lines, ...b.lines] }; }, (S) => tx(5)(S).rm || null);
same("card payment rule", "act('cpRuleAdd',{id:6})", (S) => A.cpRuleAdd(S, 6), (S) => S.cardRules);
same("unmark a one-off bill", "S.bills.push({n:'X',mode:'once',ids:[5],match:'#5'});act('billUnmark',{id:'5'})", (S) => { S.bills.push({ n: "X", mode: "once", ids: [5], match: "#5" }); return A.billUnmark(S, 5); }, (S) => S.bills.filter((b) => b.mode == "once"));
same("detach from a jar", "jarDetach(9003)", (S) => A.jarDetach(S, 9003), (S) => [tx(9003)(S).jar || null, tx(9003)(S).jarNo, S.jars[0].bal]);
test("refund twin and jar suggestion agree with the old code", () => {
  const S = demo(); S.tx.push({ id: 9100, d: "2026-10-03", desc: "Refund", from: "Shop", to: "Max", a: 50, c: "" }, { id: 9101, d: "2026-10-07", desc: "Refund shop", from: "Shop", to: "Bank Hapoalim", a: 50, c: "" });
  const o = JSON.parse(old.run(`acReset();S={...emptyState(),...structuredClone(__S)};detect();derive();JSON.stringify([(refundTwin(byId(9100))||{}).id||null,(refundTwin(byId(9101))||{}).id||null])`, { __S: S }));
  assert.deepEqual([A.refundTwin(S, S.tx.find((x) => x.id == 9100))?.id || null, A.refundTwin(S, S.tx.find((x) => x.id == 9101))?.id || null], o);
});
