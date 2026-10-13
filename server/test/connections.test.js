// Several logins at one company, nicknames, and one account per card.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { reset, q } from "./helpers.js";
const { saveCreds, nextId, listConnections, setNickname, validId, baseOf } = await import("../src/connections.js");
const { syncSource } = await import("../src/sync.js");

let reply, seen = [];
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const j = b ? JSON.parse(b) : {}; seen.push(j); res.setHeader("content-type", "application/json"); res.end(JSON.stringify(reply(j))); });
});
await new Promise((r) => srv.listen(18099, "127.0.0.1", r));
test.after(() => srv.close());
const card = (num, desc, amt, bal) => ({ accountNumber: num, balance: bal, txns: [{ date: "2026-10-02T00:00:00Z", description: desc, chargedAmount: amt, identifier: desc + num, status: "completed" }] });
const names = async () => (await q("SELECT name FROM accounts WHERE source LIKE 'max%' ORDER BY name")).rows.map((r) => r.name);

test("ids: first login is the provider, extras are provider~N", async () => {
  await reset();
  assert.ok(validId("max") && validId("wise~2") && !validId("wise~1") && !validId("nope~2") && !validId("max~x"));
  assert.equal(baseOf("wise~3"), "wise");
  assert.equal(await nextId("wise"), "wise~2");
  await saveCreds("wise~2", { nickname: "Business", token: "tok-business" });
  assert.equal(await nextId("wise"), "wise~3");
  await assert.rejects(saveCreds("wise~3", { token: "x" }), /nickname/);
  const l = await listConnections();
  assert.equal(l.find((c) => c.source === "wise~2").label, "Wise · Business");
  assert.equal(l.find((c) => c.source === "wise").label, "Wise");
});

test("two cards under one login become two accounts, each with its own balance", async () => {
  await reset();
  await saveCreds("max", { username: "u-max", password: "pw-max" });
  reply = () => ({ success: true, accounts: [card("1111", "Coffee", -10, -100), card("2222", "Books", -30, -250)] });
  const r = await syncSource("max");
  assert.equal(r.ok, true);
  assert.deepEqual(await names(), ["Max ·· 1111", "Max ·· 2222"]);
  const bal = Object.fromEntries((await q("SELECT name,balance::float AS b FROM accounts WHERE source='max'")).rows.map((x) => [x.name, x.b]));
  assert.equal(bal["Max ·· 1111"], -100); assert.equal(bal["Max ·· 2222"], -250);
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions WHERE from_name='Max ·· 2222'")).rows[0].n, 1);
  assert.equal(seen.at(-1).profile, "max");
  const again = await syncSource("max"); // same data: nothing doubled
  assert.equal(again.added, 0);
});

test("a login that used to be one combined account is split without losing history", async () => {
  await reset();
  await saveCreds("max", { username: "u-max", password: "pw-max" });
  reply = () => ({ success: true, accounts: [card("1111", "Coffee", -10, -100)] });
  await syncSource("max");
  assert.deepEqual(await names(), ["Max"]); // a single card keeps the plain name
  reply = () => ({ success: true, accounts: [card("1111", "Coffee", -10, -100), card("2222", "Books", -30, -250)] });
  await syncSource("max");
  assert.deepEqual(await names(), ["Max ·· 1111", "Max ·· 2222"]);
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions")).rows[0].n, 2); // the old coffee row moved, not copied
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions WHERE from_name='Max ·· 1111'")).rows[0].n, 1);
});

test("a second login at the same company gets its own accounts and browser profile; a nickname renames everything", async () => {
  await reset();
  await saveCreds("max", { username: "a", password: "pa" });
  await saveCreds("max~2", { nickname: "Spouse", username: "b", password: "pb" });
  reply = (j) => ({ success: true, accounts: [card(j.profile === "max" ? "1111" : "3333", j.profile === "max" ? "Coffee" : "Shoes", -20, -50)] });
  await syncSource("max"); await syncSource("max~2");
  assert.deepEqual(await names(), ["Max", "Max · Spouse"]);
  assert.deepEqual(seen.slice(-2).map((s) => s.profile), ["max", "max~2"]);
  await setNickname("max~2", "Partner");
  assert.deepEqual(await names(), ["Max", "Max · Partner"]);
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions WHERE from_name='Max · Partner'")).rows[0].n, 1);
});

test("a card purchase listed with a charged amount of 0 shows what was spent, so the balance change is explained", async () => {
  const { shownAmount } = await import("../src/sync.js");
  assert.equal(shownAmount({ chargedAmount: 0, originalAmount: -412, originalCurrency: "ILS" }), -412);
  assert.equal(shownAmount({ chargedAmount: 0, originalAmount: -50, originalCurrency: "USD" }), 0);
  assert.equal(shownAmount({ chargedAmount: -12, originalAmount: -12 }), -12);
  assert.equal(shownAmount({ originalAmount: -7 }), -7);
});
