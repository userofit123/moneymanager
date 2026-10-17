import test from "node:test";
import assert from "node:assert/strict";
import { createDataStore } from "../src/stores/data.js";
import { connectLive } from "../src/live.js";

const fake = (rev) => {
  const calls = [];
  const fetchJson = async (url) => { calls.push(url); return url === "/api/rev" ? { rev } : { rev, tx: [] }; };
  return { fetchJson, calls };
};

test("start loads the data once and starts listening", async () => {
  const f = fake(1); let onChange;
  const s = createDataStore({ fetchJson: f.fetchJson, connect: (cb) => { onChange = cb; return () => {}; } });
  await s.start(); await s.start();
  assert.equal(s.state.value.rev, 1);
  assert.deepEqual(f.calls, ["/api/state"]);
  assert.equal(typeof onChange, "function");
});

test("a live message loads again only when the version changed", async () => {
  let rev = 1, onChange; const calls = [];
  const fetchJson = async (u) => { calls.push(u); return u === "/api/rev" ? { rev } : { rev }; };
  const s = createDataStore({ fetchJson, connect: (cb) => { onChange = cb; return () => {}; } });
  await s.start();
  await onChange();
  assert.deepEqual(calls, ["/api/state", "/api/rev"]);
  rev = 2; await onChange();
  assert.deepEqual(calls, ["/api/state", "/api/rev", "/api/rev", "/api/state"]);
  assert.equal(s.state.value.rev, 2);
});

test("a failed load keeps the old data and reports the error", async () => {
  let fail = false;
  const s = createDataStore({ fetchJson: async () => { if (fail) throw new Error("down"); return { rev: 1 }; }, connect: () => () => {} });
  await s.load(); fail = true; await s.load();
  assert.equal(s.state.value.rev, 1);
  assert.equal(s.error.value.message, "down");
});

test("connectLive listens to /api/events and stops cleanly", () => {
  let es, closed = false, n = 0;
  class ES { constructor(u) { es = this; this.u = u; this.h = {}; } addEventListener(t, f) { this.h[t] = f; } close() { closed = true; } }
  const stop = connectLive(() => n++, { EventSourceImpl: ES, pollMs: 1e9 });
  assert.equal(es.u, "/api/events");
  es.h.rev(); assert.equal(n, 1);
  stop(); assert.equal(closed, true);
});
