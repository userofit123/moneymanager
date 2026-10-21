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
  assert.deepEqual(f.calls.filter((u) => u !== "/api/fx"), ["/api/state"]);
  assert.equal(typeof onChange, "function");
});

test("a live message loads again only when the version changed", async () => {
  let rev = 1, onChange; const calls = [];
  const fetchJson = async (u) => { if (u !== "/api/fx") calls.push(u); return u === "/api/rev" ? { rev } : { rev }; };
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

// ---- saving ----
const store = (over = {}) => {
  const sent = [];
  const s = createDataStore({ fetchJson: async () => ({ rev: 1, tx: [{ id: 1, c: "" }], audit: [], jars: [] }), connect: () => () => {}, delay: 5, send: async (S) => { sent.push(structuredClone(S)); return over.reply ? over.reply(S) : { status: 200, ok: true, json: { rev: S.rev + 1, auditIds: [77] } }; }, ...over.opts });
  return { s, sent };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("a change shows at once, adds a history line, and is saved once with the new version back", async () => {
  const { s, sent } = store();
  await s.load();
  s.change((S) => { S.tx[0].c = "Food"; return [["Category changed", "x → Food", { type: "tx", id: 1, f: "c", old: "" }]]; });
  assert.equal(s.state.value.tx[0].c, "Food");
  assert.equal(s.state.value.audit[0].action, "Category changed");
  await wait(30);
  assert.equal(sent.length, 1);
  assert.equal(s.state.value.rev, 2);
  assert.equal(s.state.value.audit[0].id, 77);
});

test("several quick changes are sent together", async () => {
  const { s, sent } = store();
  await s.load();
  s.change((S) => { S.tx[0].c = "A"; });
  s.change((S) => { S.tx[0].c = "B"; });
  await wait(30);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].tx[0].c, "B");
});

test("when the server has a newer version, its copy is taken and the person is told", async () => {
  const told = [];
  const { s } = store({ reply: () => ({ status: 409, ok: false, json: { state: { rev: 5, tx: [{ id: 1, c: "Server" }], audit: [] } } }), opts: { notify: (k) => told.push(k) } });
  await s.load();
  s.change((S) => { S.tx[0].c = "Mine"; });
  await wait(30);
  assert.equal(s.state.value.rev, 5);
  assert.equal(s.state.value.tx[0].c, "Server");
  assert.ok(told.includes("stale"));
});

test("undo puts the old value back and writes that to the history", async () => {
  const { s } = store();
  await s.load();
  const [e] = s.change((S) => { S.tx[0].c = "Food"; return [["Category changed", "x", { type: "tx", id: 1, f: "c", old: "" }]]; });
  s.undo(e);
  assert.equal(s.state.value.tx[0].c, "");
  assert.equal(s.state.value.audit[0].action, "Undid a change");
  assert.equal(s.state.value.audit[1].undo, null);
});

test("a change that returns false changes nothing and saves nothing", async () => {
  const { s, sent } = store();
  await s.load();
  const before = s.state.value;
  s.change(() => false);
  await wait(30);
  assert.equal(s.state.value, before);
  assert.equal(sent.length, 0);
});
