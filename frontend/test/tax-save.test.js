// Taxes and reports: the changes to report items, done periods and business types write the agreed data and history
// lines, every one can be undone (core/undoPatch.js), and the lines show in Hebrew.
import test from "node:test";
import assert from "node:assert/strict";
import { addTaxItem, addExample, exampleItem, editTaxItem, deleteTaxItem, moveTaxDate, markTaxDone, unmarkTaxDone, setBizTypes } from "../src/lib/taxReports.js";
import { makePatch, applyPatch } from "../src/core/undoPatch.js";
import { heSaved } from "../src/core/heSaved.js";

const ctx = { dstr: (d) => { const [y, m, x] = d.split("-"); return +x + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] + " " + y; } };
const base = () => ({ tx: [], jars: [], taxItems: [{ id: 1, n: "Yearly statement", repeat: { every: 12, month: 1, day: 31 }, moved: {}, done: {} }] });
// runs a change on a copy, as data.change() does, and checks that Undo brings back the data from before
function change(S, edit) {
  const next = structuredClone(S), lines = edit(next);
  if (lines) { const back = structuredClone(next); applyPatch(back, makePatch(S, next)); assert.deepEqual(back, S, "undo puts it back"); }
  return { S: next, lines };
}

test("add an item, and a ready-made example as an ordinary item", () => {
  const a = change(base(), (S) => addTaxItem(S, { n: "Rent report", repeat: null, id: 9, done: { x: 1 } }, ctx));
  assert.deepEqual(a.lines, [["Added report", "Rent report"]]);
  const { id: newId, ...rest } = a.S.taxItems[1];
  assert.ok(Number.isInteger(newId) && newId > 1, "a new whole-number id");
  assert.deepEqual(rest, { n: "Rent report", repeat: null, moved: {}, done: {} }, "nothing done yet");
  const b = change(a.S, (S) => addExample(S, "vat", { ...ctx, name: (x) => x.n || "VAT report" }));
  assert.deepEqual(b.lines, [["Added report", "VAT report"]]);
  const v = b.S.taxItems[2];
  assert.ok(Number.isInteger(v.id) && v.id > newId); assert.equal(v.ex, "vat"); assert.equal(v.nk, "taxes.ex.vat"); assert.equal(v.country, undefined);
  assert.deepEqual(v.repeat, { every: 2, month: 1, day: 15 });
  v.money.in.cats.push("Other"); assert.deepEqual(exampleItem("vat").money.in.cats, ["Freelance & business income"], "a copy, not the example itself");
  assert.equal(addExample(base(), "nope"), false);
});

test("an id is never used again after the newest item is deleted", () => {
  const a = change(base(), (S) => addTaxItem(S, { n: "Rent report" }, ctx));
  const gone = a.S.taxItems[1].id;
  const b = change(a.S, (S) => deleteTaxItem(S, gone, ctx));
  const c = change(b.S, (S) => addTaxItem(S, { n: "Car report" }, ctx));
  assert.ok(c.S.taxItems[1].id > gone, "a new id, not the deleted one");
});

test("with no name given, a line names the example in English, never a text key", () => {
  assert.deepEqual(change(base(), (S) => addExample(S, "vat", ctx)).lines, [["Added report", "VAT report"]]);
  assert.deepEqual(change(base(), (S) => addTaxItem(S, { nk: "taxes.ex.custom" }, ctx)).lines, [["Added report", "report"]]);
});

test("saving an unchanged item or business types with the keys in another order gives no line", () => {
  const S0 = base(); S0.taxItems[0] = { id: 1, n: "Yearly statement", repeat: { every: 12, month: 1, day: 31 }, moved: {}, done: {} };
  const reloaded = structuredClone(S0); reloaded.taxItems[0] = { done: {}, moved: {}, repeat: { day: 31, month: 1, every: 12 }, n: "Yearly statement", id: 1 };
  assert.equal(editTaxItem(reloaded, 1, { repeat: { every: 12, month: 1, day: 31 }, n: "Yearly statement" }, ctx), false);
  const T = { bizTypes: [{ from: "2026-01-01", n: "Patur", id: "patur" }] };
  assert.equal(setBizTypes(T, [{ id: "patur", n: "Patur", from: "2026-01-01" }], ctx), false);
});

test("edit keeps moved dates and done periods; delete; no change gives no line", () => {
  const S0 = base(); S0.taxItems[0].done = { "2027-01-31": { sent: true, paid: null, at: "2027-01-20" } };
  const a = change(S0, (S) => editTaxItem(S, 1, { n: "Yearly report", repeat: { every: 12, month: 2, day: 28 }, done: {} }, ctx));
  assert.deepEqual(a.lines, [["Changed report", "Yearly report"]]);
  assert.deepEqual(a.S.taxItems[0].done, S0.taxItems[0].done);
  assert.equal(editTaxItem(structuredClone(a.S), 1, { n: "Yearly report", repeat: { every: 12, month: 2, day: 28 } }, ctx), false);
  const d = change(a.S, (S) => deleteTaxItem(S, 1, ctx));
  assert.deepEqual(d.lines, [["Deleted report", "Yearly report"]]);
  assert.deepEqual(d.S.taxItems, []);
  assert.equal(deleteTaxItem(base(), 7, ctx), false);
});

test("move one date, and put it back", () => {
  const a = change(base(), (S) => moveTaxDate(S, 1, "2027-01-31", "2027-02-10", ctx));
  assert.deepEqual(a.lines, [["Moved a report date", "Yearly statement · was 31 Jan 2027, now 10 Feb 2027"]]);
  assert.deepEqual(a.S.taxItems[0].moved, { "2027-01-31": "2027-02-10" });
  const b = change(a.S, (S) => moveTaxDate(S, 1, "2027-01-31", "", ctx));
  assert.deepEqual(b.lines, [["Moved a report date", "Yearly statement · was 10 Feb 2027, now 31 Jan 2027"]]);
  assert.deepEqual(b.S.taxItems[0].moved, {});
  assert.equal(moveTaxDate(base(), 1, "2027-01-31", "2027-01-31", ctx), false);
  assert.equal(moveTaxDate(base(), 1, "2027-01-31", "soon", ctx), false);
});

test("mark a period sent and paid, change it, and mark it not done", () => {
  const S0 = base(); S0.taxItems[0].moved = { "2027-01-31": "2027-02-10" };
  const a = change(S0, (S) => markTaxDone(S, 1, "2027-01-31", { sent: true, paid: "1620.4" }, "2027-02-01", ctx));
  assert.deepEqual(a.lines, [["Marked report as done", "Yearly statement, due 10 Feb 2027 · sent · paid ₪1,620"]]);
  assert.deepEqual(a.S.taxItems[0].done, { "2027-01-31": { sent: true, paid: 1620, at: "2027-02-01" } });
  assert.equal(markTaxDone(structuredClone(a.S), 1, "2027-01-31", { sent: true, paid: 1620 }, "2027-02-03", ctx), false, "same again: no change");
  const b = change(a.S, (S) => markTaxDone(S, 1, "2027-01-31", { paid: 0 }, "2027-02-03", ctx));
  assert.deepEqual(b.lines, [["Marked report as done", "Yearly statement, due 10 Feb 2027 · paid ₪0"]]);
  const c = change(b.S, (S) => unmarkTaxDone(S, 1, "2027-01-31", ctx));
  assert.deepEqual(c.lines, [["Marked report as not done", "Yearly statement, due 10 Feb 2027"]]);
  assert.deepEqual(c.S.taxItems[0].done, {});
  assert.deepEqual(change(b.S, (S) => markTaxDone(S, 1, "2027-01-31", {}, "2027-02-03", ctx)).lines, c.lines, "neither sent nor paid: not done");
  assert.equal(unmarkTaxDone(c.S, 1, "2027-01-31", ctx), false);
});

test("set the business types, sorted by the day each starts", () => {
  const a = change(base(), (S) => setBizTypes(S, [{ id: "murshe", n: "Murshe", from: "2026-07-01", x: 1 }, { id: "patur", n: "Patur", from: "2026-01-01" }, { id: "bad", from: "July" }], ctx));
  assert.deepEqual(a.lines, [["Changed business type", "Patur since 1 Jan 2026 · Murshe since 1 Jul 2026"]]);
  assert.deepEqual(a.S.bizTypes, [{ id: "patur", n: "Patur", from: "2026-01-01" }, { id: "murshe", n: "Murshe", from: "2026-07-01" }]);
  assert.equal(setBizTypes(structuredClone(a.S), a.S.bizTypes, ctx), false);
  assert.deepEqual(change(a.S, (S) => setBizTypes(S, [], ctx)).lines, [["Changed business type", "none"]]);
});

test("the history lines show in Hebrew", () => {
  for (const [en, he] of [
    ["Added report", "נוסף דיווח"], ["Changed report", "שונה דיווח"], ["Deleted report", "נמחק דיווח"], ["Moved a report date", "הוזז תאריך של דיווח"],
    ["Marked report as done", "דיווח סומן כבוצע"], ["Marked report as not done", "דיווח סומן כלא בוצע"], ["Changed business type", "שונה סוג העסק"],
    ["Yearly statement · was 31 Jan 2027, now 10 Feb 2027", "Yearly statement · היה 31 בינו׳ 2027, עכשיו 10 בפבר׳ 2027"],
    ["Yearly statement, due 10 Feb 2027 · sent · paid ₪1,620", "Yearly statement, עד 10 בפבר׳ 2027 · נשלח · שולם ₪1,620"],
    ["Yearly statement, due 10 Feb 2027", "Yearly statement, עד 10 בפבר׳ 2027"],
    ["Patur since 1 Jan 2026 · Murshe since 1 Jul 2026", "Patur מ־1 בינו׳ 2026 · Murshe מ־1 ביולי 2026"],
    ["Marked report as done: Yearly statement, due 10 Feb 2027 · paid ₪0", "דיווח סומן כבוצע: Yearly statement, עד 10 בפבר׳ 2027 · שולם ₪0"],
  ]) assert.equal(heSaved(en), he, en);
  assert.equal(heSaved("Synced since last night"), "Synced since last night", "\"since\" without a date is left as it is");
});
