// Home's "In your accounts": how long the money would last at your usual spending.
// Every expected number below is worked out by hand in the comment next to it.
import test from "node:test";
import assert from "node:assert/strict";
import { spentEachMonth, moneyLasts } from "../src/lib/moneyLasts.js";

// 6 months, the last is this month (not over yet); the data starts at index 1
const FH = { keys: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"], last: 5, first: 1, inc: [0, 0, 0, 0, 0, 0], exp: [900, 3000, 4000, 5000, 6000, 99999] };

test("usual spending: the average money out over the last full months, this month and months before the data left out", () => {
  assert.deepEqual(spentEachMonth(FH, 3), { avg: 5000, months: ["2026-07", "2026-08", "2026-09"] }); // (4,000 + 5,000 + 6,000) / 3
  assert.equal(spentEachMonth(FH, 12).avg, 4500); // only 4 full months with data: (3,000 + 4,000 + 5,000 + 6,000) / 4
  assert.equal(spentEachMonth({ ...FH, first: 5 }, 3).avg, null); // no full month yet
  assert.equal(spentEachMonth({ ...FH, exp: [0, 0, 0, 0, 0, 500] }, 3).avg, null); // nothing went out
  assert.equal(spentEachMonth(null).avg, null);
});

test("how long it lasts: less than a month, whole months up to 24, then years; nothing to say without money or spending", () => {
  assert.deepEqual(moneyLasts(4000, 5000), { less: true, exact: 0.8 }); // 4,000 / 5,000
  assert.equal(moneyLasts(5000, 5000).months, 1); // exactly one month
  assert.equal(moneyLasts(17000, 5000).months, 3); // 3.4 → 3
  assert.equal(moneyLasts(17500, 5000).months, 4); // 3.5 → 4
  assert.equal(moneyLasts(120000, 5000).months, 24); // 24 months: still in months
  assert.equal(moneyLasts(122500, 5000).months, undefined); // 24.5 → 25 months: over 24, so shown in years
  assert.equal(moneyLasts(122500, 5000).years, 2); // 24.5 / 12 = 2.04 → 2
  assert.equal(moneyLasts(450000, 5000).years, 8); // 90 months = 7.5 years → 8
  assert.equal(moneyLasts(0, 5000), null); // nothing in the accounts
  assert.equal(moneyLasts(-200, 5000), null); // below zero
  assert.equal(moneyLasts(10000, 0), null); // no spending
  assert.equal(moneyLasts(10000, null), null);
});
