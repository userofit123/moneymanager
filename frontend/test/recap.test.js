// Recap gives the agreed numbers at the start, middle and end of a month, and shows its parts in the agreed order
// (saved in fixtures/, see golden.js). A day's tooltip lists payees by name.
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/lib/home.js";
import { recapModel, recapParts, dayBarHeights, roundParts, chargeOf, cardsDue, monthSteps, afterToday } from "../src/lib/recap.js";

process.on("unhandledRejection", () => {});
const FX = { USD: 3.62 };
function demoState(NOW, o = {}) {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true], ["Pension", "ILS", "pension", "", "Pension", false]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { budgetPct: 80 }, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, manual: kind === "pension", inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
const r0 = (n) => Math.round(n);
const pick = (m) => ({
  nums: ["day", "dim", "cash", "inc", "ex", "cardsU", "cardsPrev", "cardPaid", "cardsThis", "cardsNext", "likelyBank", "likelyCard", "nextBill", "same", "billsTot", "limitsLeft", "end", "start", "w1", "w0", "nextBills", "inJars", "buffer"].map((k) => [k, r0(m[k])]),
  phase: m.phase, incs: m.incs.map((t) => t.id), bills: m.bills.map((b) => [b.n, r0(b.amt)]),
  over: m.over.map((b) => b.k), risk: m.risk.map((b) => b.k), okB: m.okB.map((b) => b.k), above: m.above.map((x) => x.k), below: m.below.map((x) => x.k),
  days: m.days.map((D) => [D.d, r0(D.spent), r0(D.inc), D.ex.map((x) => r0(x[1])), D.inn.map((x) => r0(x[1])), D.up.map((x) => [x[0], r0(x[1])])]),
});

// The last case needs R.jarCov (the list of what jars pay, reserveCalc) from lib/home.js: a category a jar pays in full is missing from R.rows.
const JARCOV = (S) => { S.budgets = {}; S.jars[0].cats = [{ c: "Groceries", since: "2026-10-01" }]; S.jars[0].bal = 5000; };
for (const [label, key, day, mod, opt] of [["start of the month", "start", 3], ["middle of the month", "middle", 17], ["end of the month", "end", 28], ["middle, no budgets, a jar paying for groceries in full", "jarpays", 17, JARCOV]]) test("Recap works out the month and picks its parts: " + label, opt || {}, () => {
  const NOW = new Date(2026, 9, day, 12), S = demoState(NOW); if (mod) mod(S);
  const M = homeModel(structuredClone(S), NOW, FX), m = recapModel(M, NOW);
  matchesSaved("recap." + key, { ...pick(m), steps: m.steps.map((x) => [x.kind, x.from, x.to, r0(x.a), r0(x.b0), r0(x.b1)]), parts: recapParts(m) });
  // the steps go from the start of the month to today's balance, in date order
  if (m.steps.length) { assert.equal(r0(m.steps[0].b0), r0(m.start)); assert.equal(r0(m.steps.at(-1).b1), r0(m.cash)); m.steps.forEach((x, i) => i && assert.ok(x.from >= m.steps[i - 1].from)); }
  // each step adds up in whole shekels, as the page shows it
  m.steps.forEach((x) => assert.equal(x.b1 - x.b0, x.kind == "in" ? x.a : x.kind == "card" ? -x.a : x.small - x.bank - x.cps));
  assert.equal(dayBarHeights(m).length, m.dim);
  // the day's tooltip names the payee
  const D = m.days.find((x) => x.ex.length); if (D) assert.equal(typeof D.ex[0][0], "string");
});

test("Recap rounds the parts of a total so they add up to it", () => {
  assert.deepEqual(roundParts([61.2, 14.6, 0], 75.8), [61, 15, 0]);
  assert.deepEqual(roundParts([10, 20], 30), [10, 20]);
  assert.equal(roundParts([33.3, 33.3, 33.4], 100).reduce((s, x) => s + x, 0), 100);
});

test("Recap knows when a card purchase leaves the bank: its charge date, or the card's usual day", () => {
  const cd = { Max: { day: 2, lag: 1 } };
  assert.equal(chargeOf({ d: "2026-10-20", from: "Max", ch: "2026-11-10" }, cd), "2026-11-10");
  assert.equal(chargeOf({ d: "2026-10-20", from: "Max" }, cd), "2026-11-02");
  assert.equal(chargeOf({ d: "2026-01-31", from: "Max" }, { Max: { day: 31, lag: 1 } }), "2026-02-28");
  assert.equal(chargeOf({ d: "2026-10-20", from: "Other" }, cd), "2026-11-10");
  // charged later this month counts now; charged next month waits for next month's card bill
  const S = { tx: [] }, k = { isCp: () => false }, CC = new Set(["Max"]);
  const A = [{ d: "2026-09-25", from: "Max", a: -100, ch: "2026-10-10" }, { d: "2026-10-03", from: "Max", a: -40, ch: "2026-11-10" }, { d: "2026-09-01", from: "Max", a: -70, ch: "2026-10-02" }, { d: "2026-10-04", from: "Bank", a: -500 }];
  assert.deepEqual(cardsDue({ S, A, k, CC, TODAY: "2026-10-05", MK: "2026-10" }), { thisMonth: 100, later: 40, now: [{ n: "Max", a: 100, d: "2026-10-10" }], next: [{ n: "Max", a: 40, d: "2026-11-10" }] });
});

test("Recap says what each card bill paid for, also an early one in the middle of the month", () => {
  const P = (id, d, a) => ({ id, d, a, cp: true, from: "Bank", to: "Card company" }), B = (id, d, a, ch, to) => ({ id, d, from: "Max", to, a, ch });
  const A = [B(1, "2026-09-10", -300, "2026-10-02", "Shop A"), B(2, "2026-10-19", -45, "2026-10-21", "Shop B"), B(3, "2026-10-19", -159, "2026-10-21", "Shop C"), B(4, "2026-10-22", -80, "2026-11-02", "Shop D")];
  const S = { tx: [P(10, "2026-10-02", -300), P(11, "2026-10-21", -204)], accounts: [] };
  const steps = monthSteps({ A, S, k: { isCp: (t) => !!t.cp }, MK: "2026-10", TODAY: "2026-10-25", CC: new Set(["Max"]), inc: 0, dn: (t) => t.to, start: 1000 });
  const cards = steps.filter((x) => x.kind == "card");
  assert.deepEqual(cards.map((x) => [x.from, x.buys.n, x.buys.a, x.buys.first, x.buys.last]), [["2026-10-02", 1, 300, "2026-09-10", "2026-09-10"], ["2026-10-21", 2, 204, "2026-10-19", "2026-10-19"]]);
  assert.deepEqual(cards[1].buys.list.map((x) => x[0]), ["Shop C", "Shop B"]);
  // the bill is the same whole amount in its own step and in the "due" line of the step before it
  const P2 = [P(10, "2026-10-02", -300), P(11, "2026-10-21", -204.4)], st2 = monthSteps({ A, S: { ...S, tx: P2 }, k: { isCp: (t) => !!t.cp }, MK: "2026-10", TODAY: "2026-10-25", CC: new Set(["Max"]), inc: 0, dn: (t) => t.to, start: 1000.6 });
  const i = st2.findIndex((x) => x.kind == "card" && x.from == "2026-10-21");
  assert.equal(st2[i].a, 204); assert.equal(st2[i - 1].due.find((o) => o.d == "2026-10-21").a, 204);
});

test("a refund on a credit card (money in, so the card is in \"to\") lowers that card's bill", () => {
  const S = { tx: [] }, k = { isCp: () => false }, CC = new Set(["Max"]);
  const A = [{ d: "2026-09-25", from: "Max", to: "Shop A", a: -100, ch: "2026-10-10" }, { d: "2026-09-28", from: "Shop A", to: "Max", a: 30, ch: "2026-10-10" }, { d: "2026-10-03", from: "Max", to: "Shop B", a: -40, ch: "2026-11-10" }, { d: "2026-10-04", from: "Shop B", to: "Max", a: 10, ch: "2026-11-10" }];
  assert.deepEqual(cardsDue({ S, A, k, CC, TODAY: "2026-10-05", MK: "2026-10" }), { thisMonth: 70, later: 30, now: [{ n: "Max", a: 70, d: "2026-10-10" }], next: [{ n: "Max", a: 30, d: "2026-11-10" }] });
  // the card's usual charge day applies to a refund too
  assert.equal(chargeOf({ d: "2026-10-20", from: "Shop", to: "Max", a: 5 }, { Max: { day: 2, lag: 1 } }), "2026-11-02");
  // monthSteps: the bill of 70 (100 bought, 30 back) is matched to the purchases and the refund
  const P = { id: 10, d: "2026-10-10", a: -70, cp: true, from: "Bank", to: "Card company" };
  const steps = monthSteps({ A, S: { tx: [P], accounts: [] }, k: { isCp: (t) => !!t.cp }, MK: "2026-10", TODAY: "2026-10-25", CC, inc: 0, dn: (t) => t.to, start: 1000 });
  const card = steps.find((x) => x.kind == "card");
  assert.equal(card.buys.a, 70); assert.equal(card.buys.n, 2);
});

test("a regular income a few days later than usual still counts its usual amount this month", () => {
  const I = (d, a) => ({ id: d, d, desc: "Salary Acme", from: "Acme Ltd", to: "Bank", a, c: "Income" });
  const A = [I("2026-08-03", 10000), I("2026-09-03", 12000)], S = { tx: A };
  const inc = (rows, day) => afterToday(S, rows, "2026-10", day, new Set()).inc.reduce((s, x) => s + x.a, 0);
  assert.equal(inc(A, 5), 11000, "usually paid on the 3rd, not yet by the 5th: its usual amount is still to come");
  assert.equal(inc(A, 2), 11000, "before its usual day too");
  assert.equal(inc([...A, I("2026-10-04", 11000)], 5), 0, "once it came this month, nothing more");
  const shop = { id: 1, d: "2026-08-10", desc: "Corner Shop", from: "Bank", to: "Corner Shop", a: -80, c: "Groceries" };
  assert.equal(inc([shop, I("2026-09-03", 12000)], 5), 0, "an income paid in only one of the two months is not counted as coming");
});

test("Recap begins the month with the balances saved then, when every counted account has one; the rest is one more step", () => {
  const NOW = new Date(2026, 9, 17, 12), S = demoState(NOW), back = recapModel(homeModel(structuredClone(S), NOW, FX), NOW);
  const counted = S.accounts.filter((a) => a.inNW && ["bank", "wallet", "custom"].includes(a.kind));
  // no saved balance from then: worked out backwards, as before, and no extra step
  assert.equal(back.startReal, false); assert.equal(back.start, r0(back.start)); assert.ok(!back.steps.some((x) => x.kind == "other"));
  // one counted account without a saved balance: the whole start is still worked out backwards (never mixed)
  const part = { "2026-10": { on: "2026-09-30", acc: { [counted[0].id]: 1000 } } };
  if (counted.length > 1) assert.equal(recapModel(homeModel(structuredClone({ ...S, monthStart: part }), NOW, FX), NOW).start, back.start);
  // every counted account saved: the start is their sum, rounded once, and the steps still end at today's balance
  const acc = Object.fromEntries(counted.map((a, i) => [a.id, i ? 100.4 : 2000.3])), want = r0(2000.3 + 100.4 * (counted.length - 1));
  const m = recapModel(homeModel(structuredClone({ ...S, monthStart: { "2026-10": { on: "2026-09-30", acc } } }), NOW, FX), NOW);
  assert.equal(m.startReal, true); assert.equal(m.startOn, "2026-09-30"); assert.equal(m.start, want);
  assert.equal(m.steps[0].b0, want); assert.equal(m.steps.at(-1).b1, r0(m.cash));
  m.steps.forEach((x, i) => i && assert.equal(x.b0, m.steps[i - 1].b1));
  const o = m.steps.at(-1); assert.equal(o.kind, "other"); assert.equal(o.b1 - o.b0, o.up ? o.a : -o.a);
  // a start that already adds up to today's balance needs no extra step
  const end = monthSteps({ A: [], S: { tx: [] }, k: { isCp: () => false }, MK: "2026-10", TODAY: "2026-10-17", CC: new Set(), inc: 0, dn: () => "", start: 500, end: 500.2 });
  assert.deepEqual(end, []);
  const one = monthSteps({ A: [], S: { tx: [] }, k: { isCp: () => false }, MK: "2026-10", TODAY: "2026-10-17", CC: new Set(), inc: 0, dn: () => "", start: 500, end: 380 });
  assert.deepEqual(one.map((x) => [x.kind, x.a, x.up, x.b0, x.b1]), [["other", 120, false, 500, 380]]);
});

test("each spending step says what came in during it: money in and money back; a salary day is named; still adds up", () => {
  const CC = new Set(["Card"]), T = (id, d, a, o = {}) => ({ id, d, a, desc: id, from: a < 0 ? "Bank" : id, to: a < 0 ? id : "Bank", ...o });
  const A = [
    T("sal", "2026-10-01", 9000, { sal: true }), // big: its own step, named as salary
    T("rent", "2026-10-03", -4000),
    T("zik", "2026-10-04", 150), // small money in ("זיכוי" at the bank)
    T("ret", "2026-10-05", 80, { back: true }), // money back you marked, into the bank
    T("buy", "2026-10-06", -300, { from: "Card" }),
    T("cr", "2026-10-07", 100, { back: true, from: "Shop", to: "Card" }), // a card credit: lowers the card's bill
  ];
  const steps = monthSteps({ A, S: { tx: [], accounts: [] }, k: { isCp: () => false }, MK: "2026-10", TODAY: "2026-10-10", CC, inc: 9150, dn: (t) => t.id, start: 1000 });
  assert.deepEqual(steps.map((x) => x.kind), ["in", "spend"]);
  assert.equal(steps[0].sal, true);
  const s = steps[1];
  assert.deepEqual([s.a, s.bank, s.card, s.small, s.back, s.backBank], [4300, 4000, 300, 150, 180, 80]);
  // today's bank balance: 1000 + 9000 − 4000 + 150 + 80 (the card credit stays on the card)
  assert.equal(s.b1, 6230);
  assert.equal(s.owed, 200); // the card's bill: 300 bought, 100 back
});
