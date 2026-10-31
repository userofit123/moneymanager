import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool } from "./helpers.js";
import { inboxAdd, inboxRead, inboxAlive, sendNtfy, pushKey, pushSubscribe, pushStatus } from "../src/notify.js";
import { q } from "../src/db.js";

before(reset);
after(() => pool.end());

test("the app inbox hands over only what is after the last number seen, and keeps 50", async () => {
  assert.equal(await inboxAlive(), false);
  assert.deepEqual(await inboxRead("latest"), { last: 0, items: [] });
  assert.equal(await inboxAlive(), true);
  await inboxAdd("Money", "one");
  await inboxAdd("Money", "two");
  assert.deepEqual((await inboxRead("1")).items.map((i) => i.body), ["two"]);
  assert.deepEqual((await inboxRead("latest")).items, []);
  for (let i = 0; i < 60; i++) await inboxAdd("Money", "n" + i);
  const all = await inboxRead("0");
  assert.equal(all.items.length, 50);
  assert.equal(all.last, 62);
});

test("an alert is kept for the app only after an app has asked, and then counts as delivered", async () => {
  await reset();
  assert.equal(await sendNtfy("Money", "nobody listens"), false);
  assert.equal((await inboxRead("0")).items.length, 0);
  assert.equal(await sendNtfy("Money", "now the app listens"), true);
  assert.deepEqual((await inboxRead("0")).items.map((i) => i.body), ["now the app listens"]);
});

test("push keys that can no longer be opened (the secret key changed) are made again, and the old devices are forgotten", async () => {
  await reset();
  const first = await pushKey();
  assert.equal(await pushKey(), first);
  await pushSubscribe({ endpoint: "https://push.example.test/a", keys: { p256dh: "x", auth: "y" } }, "test");
  assert.equal((await pushStatus()).devices, 1);
  await q("UPDATE settings SET value = jsonb_set(value, '{priv}', '\"not-readable\"') WHERE key='push_vapid'");
  const next = await pushKey();
  assert.notEqual(next, first);
  assert.equal((await pushStatus()).devices, 0);
});
