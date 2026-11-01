// "Forgot password?": the recovery key and the code sent to the phone (src/passwordRecovery.js), through the real HTTP app.
// The phone is a fake ntfy server on this machine that keeps what it was sent. Made-up passwords only.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { reset, pool, q } from "./helpers.js";
import * as auth from "../src/auth.js";
import { newRecoveryKey, plainKey } from "../src/passwordRecovery.js";

if (!process.env.WEB_DIR) {
  const fs = await import("node:fs"), os = await import("node:os"), path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "money-web-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>Money</title>");
  process.env.WEB_DIR = dir;
}
const { app } = await import("../src/index.js");
let base, srv, phone;
const inbox = []; // what the fake phone received
const call = async (method, path, { body, cookie, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; }
  return { status: r.status, body: j, setCookie: r.headers.get("set-cookie") };
};
const X = { "x-requested-with": "money" };
const unword = (h) => { const m = /^=\?UTF-8\?B\?(.*)\?=$/.exec(h || ""); return m ? Buffer.from(m[1], "base64").toString() : h; };
const lastCode = () => /(\d{6})/.exec(inbox.at(-1)?.body || "")?.[1];
const clearLimits = () => q("DELETE FROM reset_attempts");
const setupPhone = async () => {
  await q("INSERT INTO settings (key,value) VALUES ('ntfy',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=$1::jsonb", [JSON.stringify(`http://127.0.0.1:${phone.address().port}/money`)]);
};

let firstKey, cookie;
before(async () => {
  await reset();
  await new Promise((r) => { srv = app.listen(0, r); }); base = `http://127.0.0.1:${srv.address().port}`;
  phone = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { inbox.push({ title: unword(req.headers.title), body: b }); res.end("ok"); }); });
  await new Promise((r) => phone.listen(0, "127.0.0.1", r));
  const s = await call("POST", "/api/auth/setup", { body: { password: "first long password" } });
  firstKey = s.body.recoveryKey; cookie = s.setCookie.split(";")[0];
});
after(() => { srv.close(); phone.close(); return pool.end(); });

test("a recovery key: 5 groups of 4 easy characters, stored only as a slow hash", async () => {
  for (let i = 0; i < 50; i++) assert.match(newRecoveryKey(), /^([A-HJKMNP-Z2-9]{4}-){4}[A-HJKMNP-Z2-9]{4}$/);
  assert.match(firstKey, /^([A-Z2-9]{4}-){4}[A-Z2-9]{4}$/);
  const u = await auth.getUser();
  assert.match(u.recovery_hash, /^scrypt\$/);
  assert.ok(!u.recovery_hash.includes(plainKey(firstKey)));
  assert.equal(plainKey(" abcd-efgh jkmn "), "ABCDEFGHJKMN");
  assert.deepEqual((await call("GET", "/api/auth/recovery-key", { cookie })).body.has, true);
  assert.equal((await call("GET", "/api/auth/recovery-key")).status, 401, "signed out cannot ask whether a key exists");
});

test("no alert channel: the signed-out screen hears 'no phone', and no code is sent", async () => {
  assert.deepEqual((await call("GET", "/api/auth/reset")).body, { phone: false });
  const r = await call("POST", "/api/auth/reset/code");
  assert.equal(r.status, 400);
  assert.equal(inbox.length, 0);
});

test("a new key needs the password and makes the old one stop working", async () => {
  assert.equal((await call("POST", "/api/auth/recovery-key", { cookie, headers: X, body: { password: "wrong" } })).status, 400);
  const r = await call("POST", "/api/auth/recovery-key", { cookie, headers: X, body: { password: "first long password" } });
  assert.equal(r.status, 200);
  assert.notEqual(r.body.key, firstKey);
  const old = await call("POST", "/api/auth/reset/check", { body: { way: "key", secret: firstKey } });
  assert.equal(old.status, 400);
  assert.equal(old.body.error, "That recovery key does not work.");
  const now = await call("POST", "/api/auth/reset/check", { body: { way: "key", secret: r.body.key.toLowerCase().replace(/-/g, " ") } });
  assert.deepEqual(now.body, { ok: true, need2fa: false });
  firstKey = r.body.key;
  await clearLimits();
});

test("the recovery key resets the password once: every session ends, a new key comes back, history and alert", async () => {
  await setupPhone();
  assert.equal((await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "short" } })).status, 400, "the usual password rules");
  const r = await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "second long password" } });
  assert.equal(r.status, 200);
  assert.match(r.body.recoveryKey, /^([A-Z2-9]{4}-){4}[A-Z2-9]{4}$/);
  assert.equal((await call("GET", "/api/state", { cookie })).status, 401, "the old session ended");
  cookie = r.setCookie.split(";")[0];
  assert.equal((await call("GET", "/api/state", { cookie })).status, 200, "and the reset signs in");
  assert.ok(auth.checkPassword("second long password", (await auth.getUser()).password_hash));
  assert.equal((await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "third long password" } })).status, 400, "used up");
  const h = (await q("SELECT action FROM audit_log ORDER BY id")).rows.map((x) => x.action);
  assert.ok(h.includes("Password reset with the recovery key"));
  await new Promise((res) => setTimeout(res, 100));
  assert.equal(inbox.at(-1).title, "Money · password changed");
  firstKey = r.body.recoveryKey;
  await clearLimits();
});

test("a code to the phone: in the app language, works once, ends after 10 minutes, a new code ends the old one", async () => {
  assert.deepEqual((await call("GET", "/api/auth/reset")).body, { phone: true });
  await q("INSERT INTO settings (key,value) VALUES ('ui_prefs',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value=$1::jsonb", [JSON.stringify({ moneyLang: "he" })]);
  assert.equal((await call("POST", "/api/auth/reset/code")).status, 200);
  const c1 = lastCode();
  assert.match(inbox.at(-1).body, /^קוד לאיפוס הסיסמה של Money: \d{6}\./);
  assert.match((await auth.getUser()).reset_code_hash, /^scrypt\$/);
  assert.equal((await call("POST", "/api/auth/reset/code")).status, 429, "one a minute");
  await clearLimits();
  assert.equal((await call("POST", "/api/auth/reset/code")).status, 200);
  const c2 = lastCode();
  if (c1 !== c2) assert.equal((await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: c1 } })).status, 400, "the old code stopped working");
  assert.equal((await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: c2 } })).status, 200);
  await q("UPDATE auth_user SET reset_code_expires=now() - interval '1 second'");
  const old = await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: c2 } });
  assert.equal(old.status, 400, "too old");
  assert.equal(old.body.error, "That code does not work. It may be wrong or too old: ask for a new one.");
  await clearLimits();
  await call("POST", "/api/auth/reset/code");
  const r = await call("POST", "/api/auth/reset/finish", { body: { way: "code", secret: lastCode(), password: "third long password" } });
  assert.equal(r.status, 200);
  assert.equal(r.body.recoveryKey, undefined, "the key stays as it was");
  assert.equal((await call("POST", "/api/auth/reset/finish", { body: { way: "code", secret: lastCode(), password: "fourth long password" } })).status, 400, "works once");
  assert.ok((await q("SELECT 1 FROM audit_log WHERE action='Password reset with a phone code'")).rowCount);
  await q("UPDATE settings SET value='{}'::jsonb WHERE key='ui_prefs'");
  await clearLimits();
});

test("a code: 5 wrong tries end it; changing the password ends it too", async () => {
  await call("POST", "/api/auth/reset/code");
  const good = lastCode(), wrong = good === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) assert.equal((await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: wrong } })).status, 400);
  await q("DELETE FROM reset_attempts"); // only the lock is lifted: the code itself is gone
  assert.equal((await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: good } })).status, 400);
  await call("POST", "/api/auth/reset/code");
  await auth.setPassword("fifth long password");
  assert.equal((await call("POST", "/api/auth/reset/check", { body: { way: "code", secret: lastCode() } })).status, 400);
  await clearLimits();
});

test("rate limits: 5 codes an hour; repeated wrong tries lock resets for 15 minutes", async () => {
  await q("INSERT INTO reset_attempts (kind,ok,at) SELECT 'send', true, now() - interval '10 minutes' FROM generate_series(1,5)");
  const r = await call("POST", "/api/auth/reset/code");
  assert.equal(r.status, 429);
  assert.equal(r.body.error, "Too many codes were asked for. Try again in an hour.");
  await clearLimits();
  for (let i = 0; i < 5; i++) await call("POST", "/api/auth/reset/check", { body: { way: "key", secret: "AAAA-BBBB-CCCC-DDDD-EEEE" } });
  const locked = await call("POST", "/api/auth/reset/check", { body: { way: "key", secret: firstKey } });
  assert.equal(locked.status, 429, "even the right key waits");
  assert.equal(locked.body.error, "Too many tries. Try again in 15 minutes.");
  assert.equal((await call("POST", "/api/auth/reset/code")).status, 429);
  await clearLimits();
});

test("with two-step sign-in on, a reset also needs the authenticator code", async () => {
  const secret = auth.newTotpSecret();
  await auth.storeTotpSecret(secret); await auth.enableTotp();
  assert.deepEqual((await call("POST", "/api/auth/reset/check", { body: { way: "key", secret: firstKey } })).body, { ok: true, need2fa: true });
  const none = await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "sixth long password" } });
  assert.deepEqual([none.status, none.body.need2fa], [400, true]);
  const bad = await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "sixth long password", code: auth.totp(secret, Date.now() - 600000) } });
  assert.equal(bad.status, 400);
  assert.ok(!auth.checkPassword("sixth long password", (await auth.getUser()).password_hash), "nothing changed");
  const ok = await call("POST", "/api/auth/reset/finish", { body: { way: "key", secret: firstKey, password: "sixth long password", code: auth.totp(secret) } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.recoveryKey);
});
