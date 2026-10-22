const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const S = require("../servers.js");

test("an address is cleaned to https and the bare origin", () => {
  assert.equal(S.normalizeUrl("money.home"), "https://money.home");
  assert.equal(S.normalizeUrl(" https://Money.Example.com/some/path/ "), "https://money.example.com");
  assert.equal(S.normalizeUrl("192.168.1.5:8080"), "https://192.168.1.5:8080");
  assert.equal(S.normalizeUrl("http://money.local:3000"), "http://money.local:3000");
  assert.equal(S.normalizeUrl("ftp://x"), null);
  assert.equal(S.normalizeUrl(""), null);
});

test("servers are added, used and removed; the same address twice is refused", () => {
  let st = S.load(fs.mkdtempSync(path.join(os.tmpdir(), "mm-")));
  assert.equal(st.active, null);
  st = S.add(st, { name: "Home", url: "money.home" });
  assert.throws(() => S.add(st, { url: "https://money.home/" }), /already/);
  assert.throws(() => S.add(st, { url: "" }), /badAddress/);
  const id = st.list[0].id;
  st = S.use(st, id);
  assert.equal(S.current(st).name, "Home");
  st = S.use(st, S.LOCAL);
  assert.equal(S.current(st), null);
  assert.equal(st.active, S.LOCAL);
  assert.throws(() => S.use(st, "nope"), /unknown/);
  st = S.use(st, id); st = S.remove(st, id);
  assert.equal(st.list.length, 0);
  assert.equal(st.active, null);
});

test("the list survives a restart, and a broken file starts empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mm-"));
  let st = S.add(S.load(dir), { name: "Cabin", url: "https://cabin.example.org" });
  st = S.trust(S.use(st, st.list[0].id), st.list[0].id, "sha256/abc");
  S.save(dir, st);
  assert.deepEqual(S.load(dir), st);
  fs.writeFileSync(path.join(dir, "servers.json"), "{not json");
  assert.deepEqual(S.load(dir), { v: 1, active: null, list: [] });
});
