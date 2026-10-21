// src/core/heDict.js puts English text from saved data (history lines, category and bank names) into Hebrew.
import test from "node:test";
import assert from "node:assert/strict";

const HE = (await import("../src/core/heDict.js")).default;
const T = (s, on = true) => { HE.on = on; try { return HE.T(s); } finally { HE.on = true; } };

test("it translates saved English history lines, with numbers inside", () => {
  assert.equal(T("Undid a change"), "שינוי בוטל");
  assert.equal(T("3 changes saved"), "3 שינויים נשמרו");
  for (const [en, he] of [["Changed budget", "שונה תקציב"], ["Added bill", "נוסף תשלום קבוע"], ["Marked to cancel", "סומן לביטול"], ["Bill detected", "זוהה תשלום קבוע"],
    ["Transfer confirmed", "העברה אושרה"], ["Renamed an entry", "שינוי שם לתנועה"], ["Edited category", "עריכת קטגוריה"], ["Delete", "מחיקה"]]) assert.equal(T(en), he, en);
});

test("it translates built-in category and bank names", () => {
  for (const [en, he] of [["Groceries", "קניות מזון"], ["Eating out", "אוכל בחוץ"], ["Salary", "משכורת"], ["Bank Hapoalim", "בנק הפועלים"]]) assert.equal(T(en), he, en);
});

test("text it does not know stays as it is, and nothing changes when Hebrew is off", () => {
  assert.equal(T("Some unknown sentence xyz"), "Some unknown sentence xyz");
  assert.equal(T("Moses Burger: Eating out → Groceries"), "Moses Burger: Eating out → Groceries");
  assert.equal(T("Undid a change", false), "Undid a change");
});
