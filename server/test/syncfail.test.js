import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool } from "./helpers.js";
import { failKind, failNotice, personLang } from "../src/syncFailNotice.js";
import { q } from "../src/db.js";

before(reset);
after(() => pool.end());

test("a raw scraper error becomes one plain kind", () => {
  assert.equal(failKind("GENERIC: unknown error during login - page went to example.test/Login; net::ERR_FAILED"), "site");
  assert.equal(failKind("TIMEOUT: timed out"), "site");
  assert.equal(failKind("GENERAL_ERROR: fetchPostWithinPage parse error"), "site");
  assert.equal(failKind("scraper HTTP 502"), "site");
  assert.equal(failKind(""), "site");
  assert.equal(failKind("INVALID_PASSWORD: login failed"), "login");
  assert.equal(failKind("Wise /v2/profiles: HTTP 401"), "login");
  assert.equal(failKind("CHANGE_PASSWORD: login failed"), "bank");
  assert.equal(failKind("ACCOUNT_BLOCKED: login failed"), "bank");
  assert.equal(failKind("OTP_REQUIRED: the bank asked for a one-time code"), "otp");
});

test("the alert is short, in the person's language, and never carries the raw error", () => {
  const raw = "GENERIC: unknown error during login - page went to example.test/Login; sent StepOne; net::ERR_FAILED";
  const en = failNotice({ source: "isracard", label: "Isracard", msg: raw, locked: false, lang: "en" });
  assert.equal(en.title, "Money · Isracard was not updated");
  assert.equal(en.body, "The bank's website had a problem during the sync. It will try again on its own.");
  const he = failNotice({ source: "isracard~2", label: "Isracard · Joint", msg: raw, locked: false, lang: "he" });
  assert.equal(he.title, "Money · ישראכרט · Joint לא עודכן");
  assert.match(he.body, /^באתר של הבנק הייתה תקלה/);
  for (const n of [en, he]) assert.doesNotMatch(n.title + n.body, /GENERIC|ERR_FAILED|example\.test/);
  assert.match(failNotice({ source: "max", label: "Max", msg: "INVALID_PASSWORD: x", lang: "en" }).body, /did not accept the login/);
  assert.match(failNotice({ source: "max", label: "Max", msg: "CHANGE_PASSWORD: x", lang: "he" }).body, /סיסמה חדשה/);
});

test("a paused connection says so, and asking for a code keeps its own words", () => {
  assert.match(failNotice({ source: "max", label: "Max", msg: "TIMEOUT: x", locked: true, lang: "en" }).body, /^Automatic attempts are paused after failed attempts/);
  const pw = failNotice({ source: "max", label: "Max", msg: "INVALID_PASSWORD: x", locked: true, lang: "en" }).body.split("\n");
  assert.equal(pw.length, 2);
  assert.match(pw[1], /paused until it is unlocked/);
  assert.match(failNotice({ source: "amex", label: "American Express", msg: "OTP_REQUIRED: x", locked: true, lang: "he" }).body, /^הבנק ביקש קוד חד־פעמי/);
});

test("the language comes from the person's saved choice", async () => {
  assert.equal(await personLang(), "en");
  await q("INSERT INTO settings (key,value) VALUES ('ui_prefs',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify({ moneyLang: "he" })]);
  assert.equal(await personLang(), "he");
});
