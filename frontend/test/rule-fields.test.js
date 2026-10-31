// Where a rule looks (lib/ruleFields.js): the app and the server read the same parts, a rule saved before the choice
// existed matches exactly what it matched before, and a rule with a choice reads only that part.
import test from "node:test";
import assert from "node:assert/strict";
import * as F from "../src/lib/ruleFields.js";
import * as SF from "../../server/src/ruleFields.js";
import { ruleHit, rn, normD, isCardPay, nameField } from "../src/lib/activity.js";
import { moneyIn } from "../src/lib/moneyIn.js";
import * as C from "../src/lib/categories.js";

// made-up entries
const TX = [
  { id: 1, a: -45, desc: "FAKE CAFE 12", from: "Max", to: "Fake Cafe", memo: "lunch", note: "team", bc: "Dining" },
  { id: 2, a: 9000, desc: "Transfer", from: "Acme Payroll", to: "Bank Hapoalim", memo: "המבצע: acme ltd" },
  { id: 3, a: -120, desc: "Online shop", from: "Isracard", to: "Shop Co", bd: "ONLINE SHOP LONDON", orig: { cur: "USD", amt: -32 } },
  { id: 4, a: -3000, desc: "ישראכרט חיוב", from: "Bank Hapoalim", to: "Isracard" },
  { id: 5, a: -10, desc: "Gift", from: "Bank Hapoalim", to: null, note: null },
];
// what each kind of rule read before the choice existed
const OLD = {
  cat: (t, kw) => { const q = rn(kw); return q.length > 0 && rn(t.desc + " " + (t.to || "") + " " + (t.from || "")).includes(q); },
  card: (t) => normD(t.desc + " " + (t.to || "")),
  in: (t) => normD(t.desc + " " + (t.from || "") + " " + (t.memo || "")),
  name: (t) => [t.desc, t.memo, t.bd, t.from, t.to, t.note].filter(Boolean).join(" "),
};
const WORDS = ["fake", "cafe", "max", "acme", "bank", "hapoalim", "lunch", "shop", "isracard", "ישראכרט", "usd", "team", "gift", "12", "cafe max"];

test("the server keeps the same list and reads the same parts", () => {
  assert.deepEqual(SF.FIELDS, F.FIELDS);
  assert.deepEqual(SF.COMBOS, F.COMBOS);
  assert.deepEqual(SF.USUAL, F.USUAL);
  for (const t of TX) for (const f of [...F.FIELDS, ...Object.keys(F.COMBOS)]) assert.equal(SF.fieldText(t, f), F.fieldText(t, f), f + " " + t.id);
  // a database row is read as the same entry
  const row = { description: "Online shop", from_name: "Isracard", to_name: "Shop Co", note: null, amount: "-120", orig_currency: "USD", memo: null, bdesc: "ONLINE SHOP LONDON", bcat: "Shopping" };
  assert.deepEqual(SF.rowTx(row), { desc: "Online shop", from: "Isracard", to: "Shop Co", note: null, a: -120, orig: { cur: "USD" }, bd: "ONLINE SHOP LONDON", bc: "Shopping" });
  assert.equal(SF.ruleSees(row, ""), "Online shop", "a server rule with no choice reads the name only, as before");
  assert.equal(SF.ruleSees(row, "cur"), "USD");
});

test("each part reads what its name says", () => {
  const t = TX[0];
  assert.deepEqual(Object.fromEntries(F.FIELDS.map((f) => [f, F.fieldText(t, f)])), {
    any: "FAKE CAFE 12 lunch Max Fake Cafe team", desc: "FAKE CAFE 12", memo: "lunch", bd: "", bc: "Dining", from: "Max", to: "Fake Cafe", note: "team", acct: "Max", cur: "",
  });
  assert.equal(F.fieldText(TX[1], "acct"), "Bank Hapoalim", "money in arrives in your account");
  assert.equal(F.fieldText(TX[2], "cur"), "USD");
  assert.equal(F.fieldText(TX[2], "bd"), "ONLINE SHOP LONDON");
});

test("old rules (no choice) match exactly what they matched before", () => {
  for (const t of TX) for (const w of WORDS) {
    assert.equal(ruleHit(t, w), OLD.cat(t, w), "category/tag " + w);
    assert.equal(ruleHit(t, w, undefined), OLD.cat(t, w));
    assert.equal(normD(F.fieldText(t, F.ruleWhere(w, "card"))), OLD.card(t), "card");
    assert.equal(normD(F.fieldText(t, F.ruleWhere({ k: w, kind: "salary" }, "in"))), OLD.in(t), "money in");
    assert.equal(nameField(t, "any"), OLD.name(t), "display names");
    assert.equal(nameField(t), OLD.name(t));
  }
});

test("a rule with a choice reads only that part", () => {
  assert.equal(ruleHit(TX[0], "lunch"), false);
  assert.equal(ruleHit(TX[0], "lunch", "memo"), true);
  assert.equal(ruleHit(TX[0], "max", "desc"), false);
  assert.equal(ruleHit(TX[0], "dining", "bc"), true);
  assert.equal(ruleHit(TX[2], "usd", "cur"), true);
  // card payments: the same entry, a rule that looks in the bank's note
  const S = { tx: TX, accounts: [{ n: "Bank Hapoalim", kind: "bank" }, { n: "Isracard", kind: "card" }], cardRules: [] };
  const t = { id: 9, a: -500, desc: "Standing order", from: "Bank Hapoalim", to: "", memo: "monthly card bill" };
  assert.equal(isCardPay({ ...S, cardRules: ["card bill"] }, t), false);
  assert.equal(isCardPay({ ...S, cardRules: [{ k: "card bill", f: "memo" }] }, t), true);
  // money coming in: the bank's note only
  const M = (rules) => moneyIn({ tx: [TX[1]], accounts: S.accounts, moneyInRules: rules }).get(2);
  assert.equal(M([{ k: "acme", kind: "salary" }]).sub, "salary");
  assert.equal(M([{ k: "acme payroll", kind: "salary", f: "memo" }]).why, "income");
  assert.equal(M([{ k: "acme ltd", kind: "back", f: "memo" }]).kind, "back");
});

test("how a rule compares: contains, is exactly, starts with, ends with, does not contain", () => {
  assert.deepEqual(SF.HOWS, F.HOWS);
  for (const m of F.HOWS) for (const [h, q] of [["fake cafe 12", "fake"], ["fake", "fake"], ["abc", "bc"], ["", "x"]]) assert.equal(SF.textMatch(h, q, m), F.textMatch(h, q, m));
  const t = TX[0]; // name "FAKE CAFE 12" → "fake cafe" as the rules read it
  assert.equal(ruleHit(t, "fake cafe", "desc", "eq"), true);
  assert.equal(ruleHit(t, "cafe", "desc", "eq"), false);
  assert.equal(ruleHit(t, "fake", "desc", "starts"), true);
  assert.equal(ruleHit(t, "cafe", "desc", "ends"), true);
  assert.equal(ruleHit(t, "fake", "desc", "ends"), false);
  assert.equal(ruleHit(t, "acme", "desc", "not"), true);
  assert.equal(ruleHit(t, "fake", "desc", "not"), false);
  assert.equal(ruleHit(t, "fake", undefined, "in"), ruleHit(t, "fake"), "contains is the same as no choice");
  const S = { tx: [], accounts: [{ n: "Bank Hapoalim", kind: "bank" }], cardRules: [{ k: "standing", f: "desc", m: "starts" }] };
  assert.equal(isCardPay(S, { id: 9, a: -5, desc: "Standing order", from: "Bank Hapoalim", to: "" }), true);
  assert.equal(isCardPay(S, { id: 9, a: -5, desc: "My standing order", from: "Bank Hapoalim", to: "" }), false);
  const M = (rules) => moneyIn({ tx: [TX[1]], accounts: [], moneyInRules: rules }).get(2);
  assert.equal(M([{ k: "transfer", kind: "back", f: "desc", m: "eq" }]).kind, "back");
  assert.equal(M([{ k: "trans", kind: "back", f: "desc", m: "eq" }]).kind, "income");
});

test("choosing where a rule looks and how it compares: saved only when it is not the usual place, with a history line", () => {
  const S = { tx: TX, rules: [{ k: "cafe", c: "Food", t: "" }], tagRules: [{ k: "cafe", t: "x" }], cardRules: ["ישראכרט"], moneyInRules: [{ k: "acme", kind: "salary" }], xf: [] };
  assert.deepEqual(C.setRuleMatch(S, "cat", 0, "f", "memo"), [["Changed where a rule looks", '"cafe" looks in: Bank\'s note']]);
  assert.equal(S.rules[0].f, "memo");
  assert.equal(C.setRuleMatch(S, "cat", 0, "f", "memo"), false, "no change, no line");
  C.setRuleMatch(S, "cat", 0, "f", "dtf");
  assert.deepEqual(S.rules[0], { k: "cafe", c: "Food", t: "" }, "back to the usual place: saved as before");
  C.setRuleMatch(S, "tag", 0, "f", "note"); assert.equal(S.tagRules[0].f, "note");
  C.setRuleMatch(S, "card", 0, "f", "to"); assert.deepEqual(S.cardRules, [{ k: "ישראכרט", f: "to" }]);
  C.setRuleMatch(S, "card", 0, "f", "dt"); assert.deepEqual(S.cardRules, ["ישראכרט"]);
  C.setRuleMatch(S, "in", 0, "f", "memo"); assert.deepEqual(S.moneyInRules, [{ k: "acme", kind: "salary", f: "memo" }]);
  C.setRuleMatch(S, "in", 0, "f", "dfm"); assert.deepEqual(S.moneyInRules, [{ k: "acme", kind: "salary" }]);
  assert.equal(C.setRuleMatch(S, "cat", 0, "f", "nowhere"), false);
  assert.deepEqual(C.setRuleMatch(S, "cat", 0, "m", "not"), [["Changed how a rule matches", '"cafe" match: does not contain']]);
  assert.deepEqual(S.rules[0], { k: "cafe", c: "Food", t: "", m: "not" });
  C.setRuleMatch(S, "cat", 0, "m", "in"); assert.deepEqual(S.rules[0], { k: "cafe", c: "Food", t: "" });
  C.setRuleMatch(S, "card", 0, "m", "eq"); assert.deepEqual(S.cardRules, [{ k: "ישראכרט", m: "eq" }]);
  C.setRuleMatch(S, "card", 0, "m", "in"); assert.deepEqual(S.cardRules, ["ישראכרט"]);
  C.setRuleMatch(S, "in", 0, "m", "starts"); assert.deepEqual(S.moneyInRules, [{ k: "acme", kind: "salary", m: "starts" }]);
  C.setRuleMatch(S, "in", 0, "m", "in");
  // adding: the usual place is not saved
  C.addRule(S, "shop", "Fun", "dtf", "in"); C.addRule(S, "lunch", "Food", "memo", "eq");
  assert.deepEqual(S.rules.slice(1), [{ k: "shop", c: "Fun", t: "" }, { k: "lunch", c: "Food", t: "", f: "memo", m: "eq" }]);
  C.addCardRule(S, "card bill", "memo"); assert.deepEqual(S.cardRules.at(-1), { k: "card bill", f: "memo" });
  assert.equal(C.genCheck(S.cardRules, "Card bill"), "dup");
  C.deleteCardRule(S, 1); assert.deepEqual(S.cardRules, ["ישראכרט"]);
});

test("the text of a card payment or money coming in rule can be changed, keeping where it looks and how", () => {
  const S = { tx: TX, cardRules: ["max charge", { k: "card bill", f: "memo", m: "eq" }], moneyInRules: [{ k: "acme", kind: "salary", f: "memo" }, { k: "wix", kind: "back" }], xf: [] };
  assert.deepEqual(C.setCardRuleText(S, 1, "Card  Bill!"), [["Changed card payment rule", '"card bill" → "card bill!"']]);
  assert.deepEqual(S.cardRules[1], { k: "card bill!", f: "memo", m: "eq" });
  assert.deepEqual(C.setCardRuleText(S, 0, "MAX charge"), false, "the same text");
  assert.equal(C.setCardRuleText(S, 0, "card bill!"), false, "already a rule");
  assert.equal(C.setCardRuleText(S, 0, "x"), false, "too short");
  C.setCardRuleText(S, 0, "max it"); assert.equal(S.cardRules[0], "max it");
  assert.deepEqual(C.setInRuleText(S, 0, "Acme Ltd"), [["Changed money coming in rule", '"acme" → "acme ltd"']]);
  assert.deepEqual(S.moneyInRules[0], { k: "acme ltd", kind: "salary", f: "memo" });
  assert.equal(C.setInRuleText(S, 0, "wix"), false);
});
