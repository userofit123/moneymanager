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
