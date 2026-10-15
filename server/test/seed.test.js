import test from "node:test";
import assert from "node:assert/strict";
import { reset, q } from "./helpers.js";
const { seedDemo, buildDemo } = await import("../src/seed.js");
const { getState } = await import("../src/state.js");

test("demo data: a year or more of realistic, dated rows that never run past today", async () => {
  await reset();
  const d = buildDemo(new Date("2026-10-12T10:00:00Z"));
  assert.ok(d.rows.length > 500);
  assert.ok(d.rows.every((r) => r.d <= "2026-10-12"));
  assert.ok(d.rows.some((r) => r.a > 0) && d.rows.some((r) => r.a < 0));
  const r = await seedDemo();
  assert.equal(r.transactions, buildDemo(new Date()).rows.length); // seedDemo() builds the demo for today, so compare with today's rows
  const s = await getState();
  assert.ok(s.accounts.length >= 5);
  await assert.rejects(seedDemo(), /already has transactions/);
});
