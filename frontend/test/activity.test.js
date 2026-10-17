// The Activity list follows the current app: what counts in In, Out and Net, filters, sorting and grouping.
import test from "node:test";
import assert from "node:assert/strict";
import { kinds, totals, leftOut, filterRows, sortRows, groupRows, normTag, allTags } from "../src/views/activity.js";

const S = {
  xf: [{ o: "x1", i: "x2", st: "ok" }], txIgnore: { ig: 1 }, ccOverride: { cp: 2 }, cats: { Food: 1 },
  tagRules: [{ k: "gym", t: "Health" }],
  tx: [
    { id: "a", d: "2026-10-02", a: -100, desc: "Shufersal", from: "Bank", to: "Shufersal", c: "Food", tags: ["home"] },
    { id: "b", d: "2026-10-05", a: 5000, desc: "Salary", from: "Work", to: "Bank", c: "Income", tags: [] },
    { id: "x1", d: "2026-09-10", a: -300, desc: "To savings", from: "Bank", to: "Savings", tags: [] },
    { id: "x2", d: "2026-09-10", a: 300, desc: "From bank", from: "Bank", to: "Savings", tags: [] },
    { id: "ig", d: "2026-09-12", a: -40, desc: "Gift", from: "Bank", to: "Shop", tags: [] },
    { id: "cp", d: "2026-09-15", a: -900, desc: "Max card", from: "Bank", to: "Max", tags: [] },
    { id: "fu", d: "2099-01-01", a: -70, desc: "Later", from: "Bank", to: "Shop", tags: [] },
  ],
};
const k = kinds(S, "2026-10-17");

test("In, Out and Net leave out transfers, card payments, upcoming and ignored rows", () => {
  assert.deepEqual(totals(S.tx, k), { inc: 5000, out: 100, net: 4900 });
  assert.deepEqual(leftOut(S.tx, k), { transfers: 2, cardPays: 1, upcoming: 1, balance: 0, ignored: 1 });
});

test("filters: search, type, category, tag", () => {
  const ids = (f) => filterRows(S, S.tx, { q: "", src: "", cat: "", type: "", tag: "", ...f }, k).map((t) => t.id);
  assert.deepEqual(ids({ q: "shuf" }), ["a"]);
  assert.deepEqual(ids({ type: "transfer" }), ["x1", "x2"]);
  assert.deepEqual(ids({ type: "income" }), ["b"]);
  assert.deepEqual(ids({ type: "cardpay" }), ["cp"]);
  assert.deepEqual(ids({ tag: "home" }), ["a"]);
  assert.ok(!ids({ cat: "Uncategorized" }).includes("x1"), "transfers are never 'uncategorized'");
  assert.deepEqual(ids({ src: "Work" }), ["b"]);
});

test("sorting and grouping by month, newest month first", () => {
  assert.equal(sortRows(S.tx, "big")[0].id, "b");
  assert.equal(sortRows(S.tx, "new")[0].id, "fu");
  const g = groupRows(sortRows(S.tx, "new"), "month", "new", k);
  assert.deepEqual(g.map((x) => x.key), ["2099-01", "2026-10", "2026-09"]);
  assert.deepEqual(g[1].T, { inc: 5000, out: 100, net: 4900 });
});

test("tags: the tag already in use is reused, rule tags are offered too", () => {
  assert.equal(normTag(S, "#HOME"), "home");
  assert.equal(normTag(S, "  new "), "new");
  assert.deepEqual(allTags(S).map(([g]) => g), ["home", "Health"]);
});

test("Activity has no question-mark cursor", async () => {
  const { readFileSync } = await import("node:fs");
  assert.doesNotMatch(readFileSync(new URL("../src/views/Activity.vue", import.meta.url), "utf8"), /cursor:\s*help/);
});

import { isCardPay, cardInfo, reviewTransfers, duplicateIds, tagOffer, applyTagRule, guessKw, detailRows, amountsFit } from "../src/views/activity.js";

test("card payments are found like the current app: by card name, by the user's cards, by rule, or by hand", () => {
  const S2 = { accounts: [{ n: "Bank", kind: "bank" }, { n: "Max", kind: "card" }], cardRules: ["my card co"], ccOverride: { m1: 1, m2: 2 },
    tx: [{ id: "c", a: -10, from: "Max", desc: "Shop" }] };
  const ci = cardInfo(S2);
  const cp = (t) => isCardPay(S2, { a: -500, from: "Bank", to: "", ...t }, ci);
  assert.ok(cp({ id: 1, desc: "ישראכרט" }));
  assert.ok(cp({ id: 2, desc: "MAX IT FINANCE" }), "one of the user's cards");
  assert.ok(cp({ id: 3, desc: "חיוב מקס" }), "'max' next to 'charge'");
  assert.ok(cp({ id: 4, desc: "My Card Co." }), "the user's card rule");
  assert.ok(!cp({ id: 5, desc: "Supermarket" }));
  assert.ok(!cp({ id: "m1", desc: "ישראכרט" }), "counted as spending by hand");
  assert.ok(cp({ id: "m2", desc: "Anything" }), "marked by hand");
  assert.ok(!cp({ id: 6, desc: "ישראכרט", from: "Max" }), "only payments from a bank account");
  assert.ok(!isCardPay(S2, { id: 7, a: 500, from: "Bank", desc: "ישראכרט" }, ci), "money coming in is never a card payment");
});

test("a transfer the user rejected counts as normal spending again", () => {
  const S2 = { xf: [{ o: "o", i: "i", st: "rej" }, { o: "p", i: "q", st: "auto" }], tx: [{ id: "o", a: -100, d: "2026-10-01" }, { id: "i", a: 100 }, { id: "p", a: -50, from: "A" }, { id: "q", a: 49, to: "B" }] };
  const k2 = kinds(S2, "2026-10-17");
  assert.ok(!k2.isXf({ id: "o" }));
  assert.ok(k2.isXf({ id: "p" }));
  const r = reviewTransfers(S2);
  assert.equal(r.length, 1);
  assert.equal(r[0].cost, 1);
});

test("duplicates: only when typed by hand or from different places, and not once kept", () => {
  const row = (id, src) => ({ id, d: "2026-10-01", desc: "Coffee", a: -12, from: "Bank", src });
  assert.deepEqual([...duplicateIds({ tx: [row(1, "hapoalim"), row(2, "hapoalim")] })], []);
  assert.deepEqual([...duplicateIds({ tx: [row(1, "hapoalim"), row(2, "manual")] })], [2]);
  assert.deepEqual([...duplicateIds({ tx: [row(1, "manual"), row(2, "manual")], dupOk: { 1: 1 } })], []);
});

test("tag offer and rule: similar transactions get the tags", () => {
  const S2 = { accounts: [{ n: "Bank", kind: "bank" }], tagRules: [], tx: [
    { id: 1, a: -30, from: "Bank", to: "Aroma TLV 12", desc: "AROMA", tags: ["coffee"] },
    { id: 2, a: -25, from: "Bank", to: "Aroma TLV 99", desc: "AROMA", tags: [] },
    { id: 3, a: -90, from: "Bank", to: "Shufersal", desc: "SHUF", tags: [] }] };
  const ci = cardInfo(S2);
  assert.equal(guessKw(S2.tx[0], ci), "aroma tlv");
  assert.deepEqual(tagOffer(S2, S2.tx[0], ["coffee"], ci), { id: 1, tags: ["coffee"], kw: "aroma tlv", n: 1 });
  const res = applyTagRule(S2, "aroma", ["coffee"], 1, true);
  assert.equal(res.n, 1);
  assert.deepEqual(S2.tx[1].tags, ["coffee"]);
  assert.deepEqual(S2.tagRules, [{ k: "aroma", t: "coffee" }]);
  assert.equal(tagOffer(S2, S2.tx[0], ["coffee"], ci) === null || tagOffer(S2, S2.tx[0], ["coffee"], ci).kw !== "aroma", true);
});

test("transaction window facts and balance gaps", () => {
  const rows = detailRows({}, { id: 9, d: "2026-10-01", a: -5, desc: "X", from: "Bank", to: "Shop", src: "manual" }, null);
  assert.deepEqual(rows.map((r) => r.k), ["date", "account", "source", "amount", "entry"]);
  assert.ok(amountsFit([30, 20, 7], 50));
  assert.ok(!amountsFit([30, 25], 50));
});
