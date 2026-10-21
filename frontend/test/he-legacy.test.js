// src/core/he-legacy.js is made from the current app's Hebrew files; it must be rebuilt when they change.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "../scripts/sync-he.mjs";

test("he-legacy.js is up to date with web/he-*.js (run node scripts/sync-he.mjs)", () => {
  assert.equal(fs.readFileSync(new URL("../src/core/he-legacy.js", import.meta.url), "utf8"), build());
});
test("it translates saved English history lines", async () => {
  const HE = (await import("../src/core/he-legacy.js")).default;
  HE.on = true;
  assert.equal(HE.T("Undid a change"), "שינוי בוטל");
  assert.equal(HE.T("3 changes saved"), "3 שינויים נשמרו");
});
