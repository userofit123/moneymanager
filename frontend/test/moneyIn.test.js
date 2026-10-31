// What each money coming in is (lib/moneyIn.js): the rules in their order, with made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { moneyIn, KINDS } from "../src/lib/moneyIn.js";

const ACC = [{ n: "Bank", kind: "bank" }, { n: "Savings", kind: "bank" }, { n: "Card", kind: "card" }, { n: "Wallet", kind: "wallet" }];
let id = 0;
const IN = (d, a, desc, from, o = {}) => ({ id: "i" + ++id, d, a, desc, from, to: "Bank", ...o });
const OUT = (d, a, desc, to, o = {}) => ({ id: "o" + ++id, d, a: -a, desc, from: "Card", to, ...o });
const run = (tx, o = {}) => moneyIn({ accounts: ACC, tx, ...o });
const one = (t, more = [], o = {}) => run([t, ...more], o).get(t.id);

test("only money coming in gets a kind, and always one of the five", () => {
  const L = [IN("2026-10-01", 100, "Something", "Someone"), OUT("2026-10-02", 50, "Shop", "Shop"), IN("2026-10-03", 20, "Fee", "x", { virtual: true })];
  const M = run(L);
  assert.deepEqual([...M.keys()], [L[0].id]);
  assert.ok(KINDS.includes(M.get(L[0].id).kind));
  assert.deepEqual(moneyIn({}), new Map());
});

test("1. the entry's own choice and a money coming in rule come first", () => {
  const t = IN("2026-10-01", 300, "Bit from Dana", "Dana", { mk: "other" });
  assert.deepEqual(one(t), { kind: "other", why: "chosen" });
  assert.deepEqual(one(IN("2026-10-01", 9000, "Acme", "Acme", { mk: "salary" })), { kind: "earned", sub: "salary", why: "chosen" });
  // an unknown choice is ignored
  assert.equal(one(IN("2026-10-01", 300, "Bit from Dana", "Dana", { mk: "zzz" })).kind, "people");
  const R = { moneyInRules: [{ k: "acme", kind: "earned" }, { k: "lottery", kind: "nope" }] };
  assert.deepEqual(one(IN("2026-10-01", 900, "ACME LTD", "Acme Ltd"), [], R), { kind: "earned", why: "rule" });
  assert.deepEqual(one(IN("2026-10-01", 900, "Lottery", "Lottery"), [], R), { kind: "other", why: "rest" });
  // your choice beats a transfer pair
  const o = OUT("2026-10-01", 500, "To savings", "Savings", { from: "Bank" }), i = IN("2026-10-01", 500, "From bank", "Bank", { to: "Savings", mk: "earned" });
  assert.equal(one(i, [o], { xf: [{ o: o.id, i: i.id, st: "ok" }] }).kind, "earned");
});

test("2. a transfer pair is your own money; a rejected pair is not", () => {
  const o = OUT("2026-10-01", 500, "To savings", "Savings", { from: "Bank" }), i = IN("2026-10-01", 500, "From bank", "Bank", { to: "Savings" });
  assert.deepEqual(one(i, [o], { xf: [{ o: o.id, i: i.id, st: "ok" }] }), { kind: "own", why: "transfer" });
  assert.notEqual(one(i, [o], { xf: [{ o: o.id, i: i.id, st: "rej" }] }).why, "transfer");
});

test("3. money in on a credit card is money back, linked to the purchase when one is found", () => {
  const p = OUT("2026-09-20", 200, "Sport Shop", "Sport Shop"), r = IN("2026-10-02", 80, "Sport Shop", "Sport Shop", { to: "Card" });
  assert.deepEqual(one(r, [p]), { kind: "back", link: p.id, why: "card" });
  assert.deepEqual(one(IN("2026-10-02", 80, "Unknown credit", "Somewhere", { to: "Card" })), { kind: "back", why: "card" });
});

test("4. the same shop as an earlier purchase, within 120 days and not bigger, is money back for it", () => {
  const p = OUT("2026-08-01", 350, "HOME STORE 123", "Home Store"), r = IN("2026-10-01", 350, "זיכוי HOME STORE", "Home Store 55");
  assert.deepEqual(one(r, [p]), { kind: "back", link: p.id, why: "purchase" });
  // bigger than the purchase: not its money back
  assert.notEqual(one(IN("2026-10-01", 400, "Home Store", "Home Store"), [p]).why, "purchase");
  // too long ago, or after the money came in
  assert.notEqual(one(IN("2026-12-15", 100, "Home Store", "Home Store"), [p]).why, "purchase");
  assert.notEqual(one(IN("2026-07-15", 100, "Home Store", "Home Store"), [p]).why, "purchase");
  // the purchase with the same amount wins, then the latest
  const a = OUT("2026-09-01", 100, "Pet Shop", "Pet Shop"), b = OUT("2026-09-10", 60, "Pet Shop", "Pet Shop"), c = OUT("2026-09-20", 90, "Pet Shop", "Pet Shop");
  assert.equal(one(IN("2026-10-01", 60, "Pet Shop", "Pet Shop"), [a, b, c]).link, b.id);
  assert.equal(one(IN("2026-10-01", 50, "Pet Shop", "Pet Shop"), [a, b, c]).link, c.id);
  // a short word inside another name is not the same shop; transfers and card bills are not purchases
  assert.notEqual(one(IN("2026-10-01", 10, "Art", "Art"), [OUT("2026-09-01", 50, "Smart Phones", "Smart Phones")]).why, "purchase");
  const xo = OUT("2026-09-01", 500, "Dana", "Dana", { from: "Bank" });
  assert.notEqual(one(IN("2026-10-01", 100, "Dana", "Dana"), [xo], { xf: [{ o: xo.id, i: "none", st: "ok" }] }).why, "purchase");
});

test("5. a bank deposit that repeats a refund on the card is the same money back, counted once", () => {
  const c = IN("2026-10-01", 120, "Refund", "Shoe Place", { to: "Card" }), b = IN("2026-10-04", 120, "העברה", "Card company");
  const M = run([c, b]);
  assert.equal(M.get(c.id).why, "card");
  assert.deepEqual(M.get(b.id), { kind: "back", twin: c.id, why: "twin" });
});

test("6. refund words in English and Hebrew are money back, unless it is a salary", () => {
  assert.deepEqual(one(IN("2026-10-01", 70, "Refund 4411", "Online")), { kind: "back", why: "refund" });
  assert.equal(one(IN("2026-10-01", 70, "החזר הוצאות", "חברה כלשהי")).why, "refund");
  assert.equal(one(IN("2026-10-01", 2500, "מס הכנסה", "Gov office")).why, "refund");
  assert.equal(one(IN("2026-10-01", 2500, "Tax refund", "Gov")).why, "refund");
  // a word with a Hebrew prefix still counts
  assert.equal(one(IN("2026-10-01", 70, "בזיכוי", "Online")).why, "refund");
  assert.deepEqual(one(IN("2026-10-01", 9000, "זיכוי משכורת", "Acme")), { kind: "earned", sub: "salary", why: "salary" });
});

test("7. a cash deposit is your own money; a cheque deposit is not", () => {
  assert.deepEqual(one(IN("2026-10-01", 500, "מזומן בסניף", "")), { kind: "own", why: "cash" });
  assert.equal(one(IN("2026-10-01", 500, "Cash deposit", "")).why, "cash");
  assert.equal(one(IN("2026-10-01", 500, "הפקדה", "")).why, "cash");
  assert.notEqual(one(IN("2026-10-01", 500, "הפקדת שיק", "")).why, "cash");
});

test("8. Bit and PayBox are from people", () => {
  assert.deepEqual(one(IN("2026-10-01", 50, "BIT 0501234567", "Dana")), { kind: "people", why: "app" });
  assert.equal(one(IN("2026-10-01", 50, "העברה בביט", "")).kind, "people");
  assert.equal(one(IN("2026-10-01", 50, "PayBox", "Group")).kind, "people");
  // "bit" inside another word is not Bit
  assert.notEqual(one(IN("2026-10-01", 50, "Orbit Ltd", "Orbit")).kind, "people");
});

test("9. a salary: its words or your salary texts; the same payer at about the same amount for 3 months is earned, not a salary", () => {
  assert.deepEqual(one(IN("2026-10-01", 7000, "Salary October", "Acme")), { kind: "earned", sub: "salary", why: "salary" });
  assert.equal(one(IN("2026-10-01", 7000, "משכורת", "")).sub, "salary");
  assert.equal(one(IN("2026-10-01", 7000, "שכר עבודה", "")).sub, "salary");
  // old salary texts (before the server moved them into money coming in rules) still count, as Salary rules
  assert.deepEqual(one(IN("2026-10-01", 7000, "Globex payment", "Globex"), [], { salaryRules: ["globex"] }), { kind: "earned", sub: "salary", why: "rule" });
  // once moved, only the money coming in rules count: a rule the person changed or removed wins over the old text
  assert.deepEqual(one(IN("2026-10-01", 7000, "Globex payment", "Globex"), [], { salaryRules: ["globex"], moneyInRules: [{ k: "globex", kind: "earned" }] }), { kind: "earned", why: "rule" });
  assert.equal(one(IN("2026-10-01", 7000, "Globex payment", "Globex"), [], { salaryRules: ["globex"], moneyInRules: [] }).why, "rest");
  // a rule looks at the name and the payer, not at the account the money came into
  assert.equal(one(IN("2026-10-01", 7000, "Payment", "Someone"), [], { moneyInRules: [{ k: "bank", kind: "back" }] }).why, "rest");
  // the same payer: three months, similar amounts, at least 1500
  const L = [IN("2026-07-09", 6000, "Initech", "Initech"), IN("2026-08-09", 6400, "Initech", "Initech"), IN("2026-09-09", 5900, "Initech", "Initech")];
  const M = run(L);
  L.forEach((t) => assert.deepEqual(M.get(t.id), { kind: "earned", why: "regular" })); // regular work pay, not called a salary
  // a regular payer that also says salary is a salary
  const P = [7, 8, 9].map((m) => IN(`2026-0${m}-09`, 6000, "Payroll Initech", "Initech"));
  run(P).forEach((r) => assert.deepEqual(r, { kind: "earned", sub: "salary", why: "salary" }));
  // only two months, too small, or amounts all over the place: not a salary
  assert.equal(run(L.slice(0, 2)).get(L[0].id).why, "rest");
  const small = [1, 2, 3].map((m) => IN(`2026-0${m}-05`, 300, "Club", "Club"));
  assert.equal(run(small).get(small[0].id).why, "rest");
  const wild = [IN("2026-07-01", 2000, "Gig", "Gig"), IN("2026-08-01", 9000, "Gig", "Gig"), IN("2026-09-01", 4000, "Gig", "Gig")];
  assert.equal(run(wild).get(wild[0].id).why, "rest");
  // an earned choice gets the salary mark when it looks like one
  assert.deepEqual(one(IN("2026-10-01", 7000, "Salary", "Acme", { mk: "earned" })), { kind: "earned", why: "chosen" }); // chose Earned, not Salary
  assert.deepEqual(one(IN("2026-10-01", 7000, "Salary", "Acme", { mk: "salary" })), { kind: "earned", sub: "salary", why: "chosen" });
});

test("10. interest and dividends, and anything else, are other", () => {
  assert.deepEqual(one(IN("2026-10-01", 12, "ריבית זכות", "")), { kind: "other", why: "interest" });
  assert.equal(one(IN("2026-10-01", 12, "Dividend ACME", "Broker")).why, "interest");
  assert.deepEqual(one(IN("2026-10-01", 12, "Something", "Someone")), { kind: "other", why: "rest" });
});

test("a money back choice is linked to its purchase too", () => {
  const p = OUT("2026-09-20", 99, "Gadget World", "Gadget World"), r = IN("2026-10-02", 99, "Gadget World", "Gadget World", { mk: "back" });
  assert.deepEqual(one(r, [p]), { kind: "back", link: p.id, why: "chosen" });
});
