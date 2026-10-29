// Money in another currency uses its exchange rate on Home and Accounts (fxRate), never 1 to 1.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fxRate } from "../src/lib/home.js";

test("another currency is turned into shekels with its rate", () => {
  assert.equal(fxRate({ USD: 3.5 }, "USD"), 3.5);
  assert.equal(fxRate({}, "ILS"), 1);
  assert.equal(fxRate(null, "ILS"), 1);
});

test("with no rate at all, another currency is not counted (not 1 to 1)", () => {
  assert.equal(fxRate({}, "USD"), 0);
  assert.equal(fxRate(null, "USD"), 0);
  assert.equal(fxRate({ USD: 0 }, "USD"), 0);
  assert.equal(fxRate({ USD: "x" }, "USD"), 0);
});

test("Accounts uses the same rate rule as Home", () => {
  const src = readFileSync(new URL("../src/lib/accounts.js", import.meta.url), "utf8");
  assert.match(src, /accILS = \(a, fx\) => a\.v \* fxRate\(fx, a\.cur\)/);
  assert.match(src, /hasRate = \(a, fx\) => fxRate\(fx, a\.cur\) > 0/);
});

test("Update balance: with no rate ever, the balance stays in its own currency (never ₪0)", async () => {
  const { inILS } = await import("../src/lib/home.js");
  const { fmCur } = await import("../src/format.js");
  assert.equal(inILS({ v: 100, cur: "USD" }, { USD: 3.5 }), 350);
  assert.equal(inILS({ v: 100, cur: "USD" }, {}), null);
  assert.equal(inILS({ v: 100, cur: "ILS" }, {}), 100);
  assert.equal(fmCur(1200, "USD"), "USD 1,200");
  assert.equal(fmCur(-80, "ILS"), "−₪80");
  const src = readFileSync(new URL("../src/components/forms/BalanceForm.vue", import.meta.url), "utf8");
  assert.match(src, /inILS\(a\.value, data\.fx\.value\.fx\)/);
  assert.doesNotMatch(src, /accILS/);
});
