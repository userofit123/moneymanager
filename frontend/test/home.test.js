// Home's numbers: totals, accounts, cards, bills, budgets, jars and the money flow.
import test from "node:test";
import assert from "node:assert/strict";
import { homeModel, flowSteps, cadenceOf, instOf, rdOf, cardBuys, withTransfers } from "../src/lib/home.js";
import { forecastModel } from "../src/lib/forecast.js";
import { countedTx } from "../src/lib/bills.js";
import { recapModel } from "../src/lib/recap.js";

const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
const base = () => ({
  cats: { Food: 1 }, cfg: {}, budgets: { Food: 1000 }, jarsBuffer: 500, xf: [], txIgnore: {}, ccOverride: {},
  accounts: [
    { n: "Bank Hapoalim", kind: "bank", v: 10000, cur: "ILS", inNW: true, at: "x" },
    { n: "Wise", kind: "wallet", v: 100, cur: "USD", inNW: true, at: "x" },
    { n: "Max", kind: "card", v: 0, cur: "ILS" },
  ],
  jars: [{ id: 1, n: "Holiday", p: 1, bal: 2000, need: 4000, got: 300 }],
  tx: [
    { id: 1, d: "2026-10-02", desc: "Salary", from: "Work", to: "Bank Hapoalim", a: 8000, c: "Income" },
    { id: 2, d: "2026-10-05", desc: "Shufersal", from: "Max", to: "Shufersal", a: -400, c: "Food" },
    { id: 3, d: "2026-09-05", desc: "Shufersal", from: "Max", to: "Shufersal", a: -600, c: "Food" },
    { id: 4, d: "2026-10-10", desc: "Move", from: "Bank Hapoalim", to: "Wise", a: -1000 },
    { id: 5, d: "2026-10-10", desc: "Move", from: "Bank Hapoalim", to: "Wise", a: 1000 },
    { id: 6, d: "2026-10-30", desc: "Later", from: "Bank Hapoalim", to: "X", a: -50, c: "Food" },
  ],
});

test("totals count income and spending, not transfers or future payments", () => {
  const S = base(); S.xf = [{ o: 4, i: 5, st: "ok" }];
  const M = homeModel(S, NOW, { USD: 3.5 });
  assert.equal(M.kpi.inc, 8000);
  assert.equal(M.kpi.ex, 400);
  assert.equal(M.kpi.net, 7600);
  assert.equal(M.kpi.cash, 10350); // 10,000 + $100 × 3.5
  assert.equal(M.kpi.exLast, 600);
});

test("cards compare this month with last month", () => {
  const M = homeModel(base(), NOW, {});
  assert.deepEqual(M.cards.map((c) => [c.n, c.now, c.last]), [["Max", 400, 600]]);
});

test("budgets, jars and the blocks to show", () => {
  const M = homeModel(base(), NOW, {});
  assert.equal(M.budgets[0].k, "Food");
  assert.equal(M.budgets[0].pc, 40);
  assert.equal(M.jars[0].pc, 50);
  assert.equal(M.flow.inJars, 2000);
  assert.equal(M.has.bills, false);
  assert.equal(M.has.donut, true);
  assert.equal(M.any, true);
  assert.equal(homeModel({}, NOW, {}).any, false);
});

test("the money flow starts from the accounts and adds up to what is free", () => {
  const M = homeModel(base(), NOW, {}), F = M.flow;
  for (const mode of ["left", "actual"]) {
    const W = flowSteps(F, mode), items = W.cols.slice(1, -1);
    assert.equal(W.start, F.cash); // the same number as "In your accounts"
    const end = W.start - items.reduce((s, c) => s + c.a, 0);
    assert.ok(Math.abs(W.cols.at(-1).lo - Math.max(0, end)) < 0.01, mode);
    assert.equal(W.cols[0].kind, "start");
    assert.equal(W.cols.at(-1).kind, "end");
    assert.equal(W.cols[1].k, "cards"); // card purchases not paid yet come first
  }
  // Planned: Food takes off only what is left of its budget (1,000 − 400 spent), less the 50 Food payment listed for 30 Oct,
  // which is in the upcoming payments step; Real money has no "still to come" steps
  assert.equal(flowSteps(F, "left").cols.find((c) => c.k === "Food").a, 550);
  assert.equal(flowSteps(F, "left").cols.find((c) => c.k === "up").a, 50);
  assert.equal(flowSteps(F, "actual").cols.some((c) => c.kind === "item"), false);
  // what was spent is not a step: it is given on its own
  assert.equal(flowSteps(F, "left").spentAll, F.spend.reduce((s, e) => s + e[1], 0));
  // the end is Home's free money (or short), the same as the Jars page
  const W = flowSteps(F, "left");
  assert.equal(W.eFree, F.free); assert.equal(W.eOver, F.over);
  assert.ok(Math.abs(W.cols.at(-1).lo - Math.max(0, F.cash - F.cards - F.saved - F.R.total)) < 0.01);
});

test("a monthly bill is found and its next date predicted", () => {
  const S = base();
  ["2026-07-03", "2026-08-03", "2026-09-03", "2026-10-03"].forEach((d, i) => S.tx.push({ id: 100 + i, d, desc: "Netflix", from: "Max", to: "Netflix", a: -50, c: "Fun" }));
  const M = homeModel(S, NOW, {});
  assert.equal(M.upcoming[0].n, "Netflix");
  assert.equal(M.upcoming[0].nx.getMonth(), 10); // November
  assert.equal(M.upcoming[0].status, "paid");
});

test("rhythm, instalments and moved months", () => {
  assert.equal(cadenceOf([{ d: "2026-01-01", a: -10 }, { d: "2026-01-31", a: -10 }, { d: "2026-03-02", a: -10 }]).every, 1);
  assert.equal(cadenceOf([{ d: "2026-01-01", a: -10 }, { d: "2026-01-09", a: -10 }]), null);
  assert.deepEqual(instOf({ desc: "IKEA תשלום 3 מתוך 10" }), { n: 3, total: 10 });
  assert.equal(rdOf({ d: "2026-10-31", rm: "2026-11" }), "2026-11-30");
});

test("card purchases not paid yet come off the free money and are a step of the flow", () => {
  // the 400 bought on Max on 5 Oct leaves the bank with next month's card bill; the September one was paid on 10 Oct
  const M = homeModel(base(), NOW, {}), F = M.flow;
  assert.equal(F.cards, 400);
  assert.equal(F.cards, recapModel(M, NOW).cardsOwed); // the same amount Recap takes off
  const raw = F.cash - F.cards - F.inJars - F.buffer - F.R.total;
  assert.equal(F.free, Math.max(0, raw));
  for (const mode of ["left", "actual"]) assert.equal(flowSteps(F, mode).cols.find((c) => c.k === "cards").a, 400);
  // Current ends at your remaining amount: the accounts less the card purchases and the 50 payment listed for 30 Oct, as
  // jars and the cushion are plans. It is Recap's number.
  assert.equal(flowSteps(F, "actual").eFree, F.cash - 400 - 50);
  assert.equal(Math.round(flowSteps(F, "actual").eFree), recapModel(M, NOW).reallyNow);
  assert.deepEqual(flowSteps(F, "actual").cols.slice(1, -1).map((c) => c.k), ["cards", "up"]);
  // nothing owed on the card: the free money is the same as before
  const S = base(); S.tx = S.tx.filter((t) => t.id != 2);
  assert.equal(homeModel(S, NOW, {}).flow.cards, 0);
});

test("pending payments count in the six months, the same as the month's totals", () => {
  const S = base(); S.tx.push({ id: 7, d: "2026-10-12", desc: "Cafe", from: "Max", to: "Cafe", a: -30, c: "Food", pending: true });
  const M = homeModel(S, NOW, {});
  assert.equal(M.kpi.ex, 430);
  assert.equal(M.hist.exp[5], 430);
  assert.equal(M.cards[0].now, 430);
});

test("the Cards box counts the same rows as the card chart on Accounts", () => {
  const S = base();
  S.tx.push({ id: 8, d: "2026-10-06", desc: "Left out", from: "Max", to: "Shop", a: -70, c: "Food" }, { id: 9, d: "2026-10-07", desc: "To bank", from: "Max", to: "Bank Hapoalim", a: -200 }, { id: 10, d: "2026-10-07", desc: "From card", from: "Max", to: "Bank Hapoalim", a: 200 });
  S.txIgnore = { 8: 1 }; S.xf = [{ o: 9, i: 10, st: "ok" }];
  const M = homeModel(S, NOW, {}), { A } = countedTx(M.S, M.today), on = (t) => t.from == "Max";
  assert.equal(M.cards[0].now, 400); // not the row left out, not the money moved to the bank
  assert.equal(cardBuys(A, on, "2026-10"), 400);
  assert.equal(cardBuys(A, on, "2026-09"), M.cards[0].last);
});

test("a refund on a card (money in, the card in \"to\") lowers what the Cards box shows for it", () => {
  const S = base();
  S.tx.push({ id: 11, d: "2026-10-08", desc: "Refund", from: "Shop", to: "Max", a: 50, c: "Food" });
  const M = homeModel(S, NOW, {});
  assert.equal(M.cards[0].now, 350);
  assert.equal(cardBuys([{ d: "2026-10-01", from: "Shop", to: "Max", a: 90 }], (t) => t.to == "Max", "2026-10"), 0, "never below 0");
});

test("upcoming payments this month are a step of the flow, and nothing is taken off twice", () => {
  // a bill still due on 25 Oct, paid from a jar for its category; a card purchase with a later date counted by the card bill
  const S = base();
  S.cats.Phone = 1; S.jars[0].cats = [{ c: "Phone" }];
  S.bills = [{ n: "Phone", every: 1, dom: 25, anchor: 1, match: "phone", cat: "Phone", manual: true, mode: "rule", amt: 100 }];
  ["2026-08-25", "2026-09-25"].forEach((d, i) => S.tx.push({ id: 30 + i, d, desc: "Phone", from: "Bank Hapoalim", to: "Phone", a: -100, c: "Phone" }));
  const M = homeModel(S, NOW, {}), F = M.flow, m = recapModel(M, NOW);
  assert.equal(F.up, m.bills); // the same list as Recap's "You still have to pay"
  assert.deepEqual(F.up.map((b) => [b.n, b.amt, b.cov || 0]), [["Phone", 100, 100], ["Later", 50, 0]]);
  const up = F.up.reduce((s, b) => s + b.amt, 0), act = flowSteps(F, "actual"), left = flowSteps(F, "left");
  assert.equal(act.upTot, up);
  assert.equal(Math.round(act.eFree), m.reallyNow); // Current ends at Recap's "Your remaining amount"
  // Planned: the jar money that pays the upcoming payments is not taken off again, so the end is the same free money
  assert.ok(Math.abs(left.eFree - F.free) < 0.01 && left.eOver == F.over);
  assert.equal(left.jarsA, F.inJars - left.upJar);
  const ks = left.cols.slice(1, -1).reduce((s, c) => s + c.a, 0);
  assert.ok(Math.abs(F.cash - ks - left.eFree) < 0.01);
});

test("a card purchase dated later this month is in the card step only", () => {
  // the card bill already counts it (cardsDue), so it is not an upcoming payment too
  const S = base(); S.tx.push({ id: 40, d: "2026-10-28", desc: "Instalment", from: "Max", to: "Shop", a: -178, c: "Food" });
  const M = homeModel(S, NOW, {}), F = M.flow, inCards = F.cards - homeModel(base(), NOW, {}).flow.cards;
  const inUp = F.up.filter((b) => b.id == 40).reduce((s, b) => s + b.amt, 0);
  assert.equal(inCards + inUp, 178);
});

// Money in another currency is never counted 1 to 1: with no exchange rate at all, the account is left out of the total and
// listed as not counted; with a rate it is counted at that rate.
test("a wallet in dollars with no exchange rate is left out of the total, not counted as ₪1 a dollar", () => {
  const none = homeModel(base(), NOW, {}), some = homeModel(base(), NOW, { USD: 3.7 });
  assert.equal(none.kpi.cash, 10000, "only the bank"); assert.deepEqual(none.kpi.noRate, ["Wise"]);
  assert.ok(!none.kpi.cashAccts.some((a) => a.n == "Wise"), "not in the list of counted accounts");
  assert.equal(Math.round(some.kpi.cash), 10370, "at the rate"); assert.deepEqual(some.kpi.noRate, []);
});

// Your own accounts come from your accounts only: a fixed bank name is never taken as one of yours, and the Forecast's
// words "in your bank and …" use the wallet's own name.
test("transfers and the wallet's name come from your own accounts only", () => {
  const accounts = [{ n: "Pine Bank", kind: "bank", v: 5000, cur: "ILS", inNW: true }, { n: "Coin Wallet", kind: "wallet", v: 100, cur: "ILS", inNW: true }];
  const tx = [{ id: 1, d: "2026-10-03", from: "Pine Bank", to: "Coin Wallet", a: -1000, c: "" }, { id: 2, d: "2026-10-03", from: "Pine Bank", to: "Coin Wallet", a: 1000, c: "" },
    { id: 3, d: "2026-10-05", from: "Bank Hapoalim", to: "Shop", a: -700, c: "" }, { id: 4, d: "2026-10-05", from: "Shop", to: "Wise", a: 700, c: "" }];
  const xf = withTransfers({ accounts, tx }).xf || [];
  assert.deepEqual(xf.map((x) => [x.o, x.i]), [[1, 2]], "only the transfer between your own accounts");
  assert.equal(forecastModel({ accounts, tx }, NOW, {}).wallet, "Coin Wallet");
  assert.equal(forecastModel({ accounts: [accounts[0], { ...accounts[1], n: "" }], tx }, NOW, {}).wallet, true, "a wallet with no name");
  assert.equal(forecastModel({ accounts: [accounts[0]], tx }, NOW, {}).wallet, false, "no wallet");
});

test("a bill a jar pays lowers its budget row once, due later, today or late", () => {
  // made-up rent of 2,000 paid from a jar, in a "Home" budget of 3,000 with 300 already spent this month
  for (const [dom, when] of [[25, "later"], [17, "today"], [12, "late"]]) {
    const S = base();
    S.cats.Home = 1; S.budgets.Home = 3000;
    S.jars.push({ id: 2, n: "Rent jar", p: 2, bal: 2500, need: 0, bill: "rent" });
    S.bills = [{ n: "Rent", every: 1, dom, anchor: 1, match: "rent", cat: "Home", manual: true, mode: "rule", amt: 2000 }];
    ["2026-08", "2026-09"].forEach((m, i) => S.tx.push({ id: 40 + i, d: `${m}-${String(dom).padStart(2, "0")}`, desc: "Rent", from: "Bank Hapoalim", to: "Rent", a: -2000, c: "Home" }));
    S.tx.push({ id: 50, d: "2026-10-03", desc: "Paint", from: "Bank Hapoalim", to: "Paint shop", a: -300, c: "Home" });
    const M = homeModel(S, NOW, {}), F = M.flow, left = flowSteps(F, "left");
    assert.ok(F.up.some((b) => b.n === "Rent" && b.amt === 2000), when); // the rent still leaves the bank
    const row = left.src.find((r) => r.k === "Home");
    assert.equal(row.left, 3000 - 300 - 2000, when); // 700 still to come, the rent taken off once
    assert.equal(row.upIn, 0, when);
    assert.ok(left.upJar >= 2000, when); // the jar pays the rent, so it is not taken off again in the jars step
    assert.ok(Math.abs(left.eFree - F.free) < 0.01 && left.eOver == F.over, when); // Free to use: the same as Home's number
    const ks = left.cols.slice(1, -1).reduce((s, c) => s + c.a, 0);
    assert.ok(Math.abs(F.cash - ks - left.eFree) < 0.01, when);
  }
});
