// The entry window's changes (lib/txactions.js) change the data and write the agreed history lines (saved in fixtures/, see golden.js).
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import * as A from "../src/lib/txactions.js";

const NOW = new Date(2026, 9, 17, 12);
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
const newDo = (S, fn) => { const r = fn(S); return JSON.parse(JSON.stringify({ S, lines: (r.lines || []).map(([a, d, u]) => [a, d, u || null]).reverse() })); };
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const same = (name, fn, pick) => test(name, () => {
  const b = newDo(demo(), fn);
  matchesSaved("txactions#" + slug(name), { lines: b.lines, data: pick ? pick(b.S) : null });
});
const tx = (id) => (S) => S.tx.find((x) => x.id == id);

same("category change, with undo", (S) => A.setField(S, 5, "c", "Groceries"), (S) => tx(5)(S).c);
same("note change", (S) => A.setField(S, 5, "note", "hello there"), (S) => tx(5)(S).note);
same("display name", (S) => A.setName(S, 5, "My shop"), (S) => S.cfg.renames);
same("not a transfer", (S) => A.xfNo(S, 9001), (S) => S.xf);
same("transfer confirmed", (S) => A.xfOk(S, 9001), (S) => S.xf);
same("delete a duplicate gives back what it took from a jar", (S) => A.dupDel(S, 9003), (S) => [S.tx.length, S.jars[0].bal, S.jars[0].paid || 0]);
same("keep both", (S) => A.dupKeep(S, 7), (S) => S.dupOk);
same("card payment marks", (S) => { const a = A.cpCount(S, 6), b = A.cpUncount(S, 6); return { lines: [...a.lines, ...b.lines] }; }, (S) => S.ccOverride);
same("leave out and count again", (S) => { const a = A.ignOn(S, 8), b = A.ignOff(S, 8); return { lines: [...a.lines, ...b.lines] }; }, (S) => S.txIgnore);
same("count in another month, and back", (S) => { const a = A.moSet(S, 5, "2026-08"), b = A.moReset(S, 5); return { lines: [...a.lines, ...b.lines] }; }, (S) => tx(5)(S).rm || null);
same("card payment rule", (S) => A.cpRuleAdd(S, 6), (S) => S.cardRules);
same("unmark a one-off bill", (S) => { S.bills.push({ n: "X", mode: "once", ids: [5], match: "#5" }); return A.billUnmark(S, 5); }, (S) => S.bills.filter((b) => b.mode == "once"));
same("detach from a jar", (S) => A.jarDetach(S, 9003), (S) => [tx(9003)(S).jar || null, tx(9003)(S).jarNo, S.jars[0].bal]);
test("a refund finds the payment it pays back", () => {
  const S = demo(); S.tx.push({ id: 9100, d: "2026-10-03", desc: "Refund", from: "Shop", to: "Max", a: 50, c: "" }, { id: 9101, d: "2026-10-07", desc: "Refund shop", from: "Shop", to: "Bank Hapoalim", a: 50, c: "" });
  matchesSaved("txactions#refund-twin", [A.refundTwin(S, S.tx.find((x) => x.id == 9100))?.id || null, A.refundTwin(S, S.tx.find((x) => x.id == 9101))?.id || null]);
});
