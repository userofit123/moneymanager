// src/core/heSaved.js puts English text from saved data or the server (history lines, server messages, built-in names) into Hebrew,
// and src/core/heGender.js turns the Hebrew "you" forms to a man or a woman.
// fixtures/he-text.json holds every known text and its Hebrew (first written from the old dictionary, so nothing that showed in Hebrew was lost).
// A new text to check: add its English to the right part of the file with any Hebrew, run with UPDATE_SAVED=1 and check the diff.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { matchesSaved, saved } from "./golden.js";
import { heSaved } from "../src/core/heSaved.js";
import { genderize } from "../src/core/heGender.js";

const T = (s, g) => genderize(heSaved(s), g);

test("it translates saved English history lines, with numbers inside", () => {
  assert.equal(T("Undid a change"), "שינוי בוטל");
  assert.equal(T("513 sample transactions"), "513 תנועות לדוגמה");
  assert.equal(T("123 transactions"), "123 תנועות");
  assert.equal(T("Next 6 Nov"), "הבא: 6 בנוב׳");
  for (const [en, he] of [["Changed budget", "שונה תקציב"], ["Added bill", "נוסף תשלום קבוע"], ["Marked to cancel", "סומן לביטול"], ["Bill detected", "זוהה תשלום קבוע"],
    ["Transfer confirmed", "העברה אושרה"], ["Renamed an entry", "שינוי שם לתנועה"], ["Edited category", "עריכת קטגוריה"]]) assert.equal(T(en), he, en);
  assert.equal(T("Netflix · monthly · about ₪55"), "Netflix · חודשי · בערך ₪55");
  assert.equal(T("#food → #meals · 1 transaction"), "#food ← #meals · תנועה אחת");
});

test("it translates built-in category and bank names", () => {
  for (const [en, he] of [["Groceries", "קניות מזון"], ["Eating out", "אוכל בחוץ"], ["Salary", "משכורת"], ["Bank Hapoalim", "בנק הפועלים"]]) assert.equal(T(en), he, en);
});

test("text it does not know stays as it is", () => {
  assert.equal(T("Some unknown sentence xyz"), "Some unknown sentence xyz");
  assert.equal(T("Moses Burger: Eating out → Groceries"), "Moses Burger: Eating out → Groceries");
  assert.equal(T("  Undid a change "), "  שינוי בוטל ", "spaces around it are kept");
  assert.equal(T("₪500"), "₪500");
  assert.equal(T(null), null);
});

test("the Hebrew follows the gender in the profile", () => {
  assert.equal(T("Save the login first."), "קודם שמרו את פרטי ההתחברות.");
  assert.equal(T("Save the login first.", "m"), "קודם שמור את פרטי ההתחברות.");
  assert.equal(T("Save the login first.", "f"), "קודם שמרי את פרטי ההתחברות.");
  assert.equal(genderize("אתם רואים", "f"), "את רואה");
  assert.equal(genderize("עברו את הגבול", "m"), "עברו את הגבול", "'they passed' stays");
});

test("every known text gives the same Hebrew as saved", () => {
  for (const [part, texts] of Object.entries(saved("he-text"))) {
    if (part === "stays in English") matchesSaved("he-text#" + part, texts.filter((s) => heSaved(s) === s), part);
    else if (part === "for a man" || part === "for a woman") { const g = part === "for a man" ? "m" : "f"; matchesSaved("he-text#" + part, Object.fromEntries(Object.keys(texts).map((s) => [s, T(s, g)])), part); }
    else if (part === "app texts for a man and a woman") matchesSaved("he-text#" + part, Object.fromEntries(Object.keys(texts).map((s) => [s, [genderize(s, "m"), genderize(s, "f")]])), part);
    else matchesSaved("he-text#" + part, Object.fromEntries(Object.keys(texts).map((s) => [s, heSaved(s)])), part);
  }
});

// ---- every history action in the code has Hebrew ----
// The change history is saved in English (data.change() in the app, audit() on the server) and shown through heSaved.js.
const ROOT = new URL("../../", import.meta.url).pathname;
function files(dir, out = []) {
  for (const f of fs.readdirSync(ROOT + dir, { withFileTypes: true })) {
    const p = dir + "/" + f.name;
    if (f.isDirectory()) { if (f.name !== "node_modules" && f.name !== "locales") files(p, out); } else if (/\.(js|vue)$/.test(f.name)) out.push(p);
  }
  return out;
}
const SHAPES = [
  /\[\[\s*"([A-Z][a-z][^"]*)"/g, // return [["Added rule", detail]]
  /\[\[\s*[^"\][]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g, // [[b.flag ? "Marked to cancel" : "Kept bill", …]]
  /(?:lines|logs)\.push\(\[\s*"([A-Z][^"]*)"/g, // lines.push(["Bill detected", …])
  /\bline = \[\s*"([A-Z][^"]*)"/g, // const line = ["Changed rule", …]
  /\bsys\(\s*"([^"]+)"/g, // core/settle.js: sys("Transfer detected", …)
  /\}\)?,\s*"([A-Z][a-z][^"]*)"\s*,/g, // a page's save((s) => { … }, "Hid a merchant", detail)
  /\baudit\([^,"]*,\s*"([^"]+)"/g, // server: audit(c, "Account created", …)
  /\baudit\([^,"]*,\s*[^"]*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/g, // audit(c, used ? "Gap cleared" : "Gap reduced", …)
  /'System',\s*'([^']+)'/g, // server: written into the history table by SQL
];
function historyActions() {
  const found = new Map();
  for (const f of [...files("frontend/src"), ...files("server/src")]) {
    const c = fs.readFileSync(ROOT + f, "utf8");
    for (const re of SHAPES) for (const m of c.matchAll(re)) for (const a of m.slice(1)) if (a) found.set(a, f);
  }
  // actions put together from a word list: "Changed jar " + the field, "Edited " + the field
  const jars = fs.readFileSync(ROOT + "frontend/src/lib/jars.js", "utf8").match(/const FLD = \{([^}]*)\}/)[1];
  for (const m of jars.matchAll(/"([^"]+)"/g)) found.set("Changed jar " + m[1], "frontend/src/lib/jars.js");
  const ed = fs.readFileSync(ROOT + "frontend/src/lib/txactions.js", "utf8").match(/"Edited " \+ \(\{([^}]*)\}/)[1];
  for (const m of ed.matchAll(/"([^"]+)"/g)) found.set("Edited " + m[1], "frontend/src/lib/txactions.js");
  return found;
}

test("every history action written by the app or the server has its Hebrew in core/heSaved.js", () => {
  const found = historyActions();
  assert.ok(found.size > 90, "the search finds the history actions (" + found.size + ")");
  for (const a of ["Renamed category", "Changed budget", "Bill detected", "Hid a merchant", "Kept bill", "Gap reduced", "Jars filled", "Changed jar target", "Edited note"]) assert.ok(found.has(a), a);
  const missing = [...found].filter(([a]) => !/[א-ת]/.test(heSaved(a))).map(([a, f]) => a + " (" + f + ")");
  assert.deepEqual(missing, [], "history actions with no Hebrew: add them to HISTORY in src/core/heSaved.js");
});
