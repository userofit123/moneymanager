import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { reset, pool, q } from "./helpers.js";
import * as auth from "../src/auth.js";
import { encrypt, decrypt, scrub } from "../src/secrets.js";
import { saveCreds, getCreds, listConnections, recordResult, isLocked, unlock, connectionStatus } from "../src/connections.js";
import { parseBankCsv } from "../src/sources/csv.js";
import { ntfyProblem } from "../src/notify.js";

before(reset);
after(() => pool.end());

test("passwords: scrypt hash verifies, wrong one fails, weak ones are refused", () => {
  const h = auth.hashPassword("correct horse battery");
  assert.ok(auth.checkPassword("correct horse battery", h));
  assert.ok(!auth.checkPassword("correct horse batterx", h));
  assert.ok(!h.includes("correct"));
  assert.ok(auth.passwordProblem("short"));
  assert.ok(auth.passwordProblem("aaaaaaaaaaaa"));
  assert.equal(auth.passwordProblem("a long enough one"), null);
});

test("TOTP matches the RFC 6238 test vector and accepts one step of drift", () => {
  const secret = auth.b32encode(Buffer.from("12345678901234567890"));
  assert.equal(auth.totp(secret, 59000, 30, 8), "94287082");
  assert.equal(auth.totp(secret, 59000), "287082");
  assert.ok(auth.totpOk(secret, "287082", 59000));
  assert.ok(auth.totpOk(secret, "287082", 59000 + 30000));
  assert.ok(!auth.totpOk(secret, "287082", 59000 + 120000));
  assert.ok(!auth.totpOk(secret, "abc123", 59000));
});

test("encryption round trip, random IV, tamper is detected", () => {
  const a = encrypt("hunter2"), b = encrypt("hunter2");
  assert.notEqual(a, b);
  assert.equal(decrypt(a), "hunter2");
  assert.ok(!a.includes("hunter2"));
  const parts = a.split(":"); parts[3] = Buffer.from("tampered").toString("base64");
  assert.throws(() => decrypt(parts.join(":")));
});

test("scrub removes secret values from messages", () => {
  assert.equal(scrub("login failed for hunter2 with abc", ["hunter2", "ab"]), "login failed for *** with abc");
});

test("credentials are stored encrypted and read back; missing fields are refused", async () => {
  await assert.rejects(saveCreds("max", { username: "u" }), /Password is required/);
  await saveCreds("max", { username: "me@example.com", password: "s3cret-pass" });
  const raw = (await q("SELECT data FROM credentials WHERE source='max'")).rows[0].data;
  assert.ok(!raw.includes("s3cret-pass") && !raw.includes("me@example.com"));
  assert.deepEqual(await getCreds("max"), { username: "me@example.com", password: "s3cret-pass" });
  const list = await listConnections();
  assert.ok(list.find((c) => c.source === "max").configured);
  assert.ok(!JSON.stringify(list).includes("s3cret-pass"));
});

test("two failures in a row lock a source, a success or an unlock clears it", async () => {
  await saveCreds("isracard", { id: "123456789", card6Digits: "123456", password: "pw-isracard" });
  assert.equal(await recordResult("isracard", false, "bad login pw-isracard", { password: "pw-isracard" }), false);
  assert.equal(await isLocked("isracard"), false);
  assert.equal(await recordResult("isracard", false, "bad login", {}), true);
  assert.equal(await isLocked("isracard"), true);
  const err = (await q("SELECT last_error FROM source_state WHERE source='isracard'")).rows[0].last_error;
  assert.ok(!err.includes("pw-isracard"));
  await unlock("isracard");
  assert.equal(await isLocked("isracard"), false);
});

test("bank CSV: English and Hebrew headers, card charges positive, debit/credit columns", () => {
  const card = "תאריך עסקה,שם בית עסק,סכום חיוב\n05/10/2026,וולט,87.50\n06/10/2026,שופרסל,\"1,234.10\"\n";
  const r = parseBankCsv(card, { positiveIsExpense: true });
  assert.deepEqual(r.map((x) => [x.date, x.amount]), [["2026-10-05", -87.5], ["2026-10-06", -1234.1]]);
  const bank = "junk line\nDate,Description,Debit,Credit\n2026-10-01,Rent,5500,\n2026-10-03,Salary,,15000\n";
  const b = parseBankCsv(bank);
  assert.deepEqual(b.map((x) => x.amount), [-5500, 15000]);
  assert.throws(() => parseBankCsv("a,b\n1,2"), /header/);
});

// ---------- the real HTTP app ----------
// the built app may not exist in a test run: a stand-in page is enough to check what the server sends with it
if (!process.env.WEB_DIR) {
  const fs = await import("node:fs"), os = await import("node:os"), path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "money-web-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>Money</title>");
  process.env.WEB_DIR = dir;
}
const { app } = await import("../src/index.js");
let base, srv, mock;
const call = async (method, path, { body, cookie, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; }
  return { status: r.status, body: j, setCookie: r.headers.get("set-cookie"), headers: r.headers };
};
before(async () => {
  await new Promise((r) => { srv = app.listen(0, r); }); base = `http://127.0.0.1:${srv.address().port}`;
});
after(() => { srv.close(); mock?.close(); });
const X = { "x-requested-with": "money" };

test("API refuses everything until you sign in; the page itself carries no data", async () => {
  assert.equal((await call("GET", "/api/state")).status, 401);
  assert.equal((await call("GET", "/api/connections")).status, 401);
  assert.equal((await call("GET", "/api/documents/1")).status, 401);
  assert.equal((await call("POST", "/api/sync")).status, 401);
  const st = await call("GET", "/api/auth/status");
  assert.deepEqual([st.body.setup, st.body.authed], [true, false]);
  assert.deepEqual([st.body.api, st.body.apiMin], [1, 1]); // the apps decide with these whether they fit this server
  assert.equal(typeof st.body.version, "string"); // the desktop app reads it to see whether its own screens fit (empty when the changelog is not found)
  const page = await call("GET", "/");
  assert.equal(page.status, 200);
  assert.ok(page.headers.get("content-security-policy").includes("frame-ancestors 'self'"));
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
});

let cookie;
test("first-run setup, then login rules: wrong password, rate limit, cookie flags", async () => {
  assert.equal((await call("POST", "/api/auth/setup", { body: { password: "short" } })).status, 400);
  const s = await call("POST", "/api/auth/setup", { body: { password: "my long password" } });
  assert.equal(s.status, 200);
  assert.match(s.setCookie, /HttpOnly/); assert.match(s.setCookie, /SameSite=Strict/);
  assert.equal((await call("POST", "/api/auth/setup", { body: { password: "another long one" } })).status, 409);
  for (let i = 0; i < 5; i++) assert.equal((await call("POST", "/api/auth/login", { body: { password: "wrong password" } })).status, 401);
  assert.equal((await call("POST", "/api/auth/login", { body: { password: "my long password" } })).status, 429);
  await q("DELETE FROM login_attempts");
  const ok = await call("POST", "/api/auth/login", { body: { password: "my long password" } });
  assert.equal(ok.status, 200);
  cookie = ok.setCookie.split(";")[0];
});

test("signed in: reads work, changes need the custom header, state saves", async () => {
  const st = await call("GET", "/api/state", { cookie });
  assert.equal(st.status, 200);
  assert.equal((await call("PUT", "/api/state", { cookie, body: st.body })).status, 403);
  assert.equal((await call("PUT", "/api/state", { cookie, headers: X, body: st.body })).status, 200);
});

test("credentials saved through the API are never sent back", async () => {
  const put = await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "AB12345", password: "very-secret-pw" } });
  assert.equal(put.status, 200);
  const list = await call("GET", "/api/connections", { cookie });
  assert.ok(list.body.find((c) => c.source === "hapoalim").configured);
  const all = JSON.stringify(list.body) + JSON.stringify((await call("GET", "/api/state", { cookie })).body);
  assert.ok(!all.includes("very-secret-pw") && !all.includes("AB12345"));
  assert.equal((await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "x" } })).status, 400);
});

test("2FA: enable, then login needs the code", async () => {
  const start = await call("POST", "/api/auth/2fa/start", { cookie, headers: X });
  const secret = start.body.secret;
  assert.equal((await call("POST", "/api/auth/2fa/enable", { cookie, headers: X, body: { code: "000000" } })).status, 400);
  assert.equal((await call("POST", "/api/auth/2fa/enable", { cookie, headers: X, body: { code: auth.totp(secret) } })).status, 200);
  const noCode = await call("POST", "/api/auth/login", { body: { password: "my long password" } });
  assert.deepEqual([noCode.status, noCode.body.need2fa], [401, true]);
  const good = await call("POST", "/api/auth/login", { body: { password: "my long password", code: auth.totp(secret) } });
  assert.equal(good.status, 200);
  const stored = (await q("SELECT totp_secret FROM auth_user")).rows[0].totp_secret;
  assert.ok(!stored.includes(secret)); // encrypted at rest
  // a stolen session must not be able to switch 2FA off by starting over: with 2FA on, "start" is refused and nothing changes
  assert.equal((await call("POST", "/api/auth/2fa/start", { cookie, headers: X })).status, 409);
  assert.equal((await q("SELECT totp_enabled FROM auth_user")).rows[0].totp_enabled, true);
  await call("POST", "/api/auth/2fa/disable", { cookie, headers: X, body: { password: "my long password" } });
});

test("sync with a mock scraper: credentials are sent, data lands, lock-out stops retries", async () => {
  const seen = [];
  mock = http.createServer(async (req, res) => {
    let b = ""; for await (const c of req) b += c;
    if (req.url.startsWith("/assist/")) {
      const act = req.url.slice(8); globalThis.__assist = (globalThis.__assist || []).concat(act + (b ? " " + b : ""));
      if (act === "screen") { res.setHeader("content-type", "image/jpeg"); return res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); }
      res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ ok: true, width: 1024, height: 768 }));
    }
    const j = JSON.parse(b); seen.push({ key: req.headers["x-scraper-key"], j });
    if (globalThis.__delay) await new Promise((r) => setTimeout(r, globalThis.__delay));
    res.setHeader("content-type", "application/json");
    if (j.credentials.password === "wrong") { res.statusCode = 500; return res.end(JSON.stringify({ success: false, error: "INVALID_PASSWORD for wrong" })); }
    res.end(JSON.stringify({ success: true, accounts: [{ accountNumber: "77", balance: 1000, txns: [{ date: "2026-10-02T00:00:00Z", description: "Shufersal", chargedAmount: -120, identifier: "t1" }] }] }));
  });
  await new Promise((r) => mock.listen(18099, "127.0.0.1", r));
  await q("INSERT INTO exchange_rates (date,base,quote,rate) VALUES (current_date,'USD','ILS',3.1) ON CONFLICT DO NOTHING");
  const r1 = await call("POST", "/api/sync/hapoalim", { cookie, headers: X });
  assert.equal(r1.body.ok, true);
  assert.equal(r1.body.added, 1);
  assert.equal(seen[0].key, "test-key");
  assert.equal(seen[0].j.credentials.password, "very-secret-pw");
  assert.equal((await q("SELECT balance FROM accounts WHERE name='Bank Hapoalim'")).rows[0].balance, 1000);
  assert.equal((await call("POST", "/api/sync/hapoalim", { cookie, headers: X })).body.added, 0); // never twice

  await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "AB12345", password: "wrong" } });
  const f1 = await call("POST", "/api/sync/hapoalim", { cookie, headers: X });
  assert.equal(f1.body.ok, false); assert.ok(!f1.body.error.includes("wrong password") && !/for wrong/.test(f1.body.error));
  const f2 = await call("POST", "/api/sync/hapoalim", { cookie, headers: X });
  assert.equal(f2.body.locked, true);
  const calls = seen.length;
  const f3 = await call("POST", "/api/sync/hapoalim", { cookie, headers: X });
  assert.equal(f3.body.locked, true);
  assert.equal(seen.length, calls); // no third attempt reached the bank
  const t = await call("POST", "/api/connections/hapoalim/test", { cookie, headers: X });
  assert.equal(t.body.locked, true);
  await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "AB12345", password: "very-secret-pw" } }); // saving new credentials unlocks
  const test30 = await call("POST", "/api/connections/hapoalim/test", { cookie, headers: X });
  assert.equal(test30.body.ok, true); assert.equal(test30.body.accounts[0].transactions, 1);
});

test("bank CSV import through the API, then sign out ends the session", async () => {
  const r = await fetch(base + "/api/import/bank-csv?account=Bank%20Hapoalim", { method: "POST", headers: { cookie, ...X, "content-type": "text/csv" }, body: "Date,Description,Debit,Credit\n2026-10-01,Rent,5500,\n" });
  assert.equal(r.status, 200); assert.equal((await r.json()).added, 1);
  assert.equal((await call("POST", "/api/auth/logout", { cookie, headers: X })).status, 200);
  assert.equal((await call("GET", "/api/state", { cookie })).status, 401);
});

test("only one connection job at a time: a second test or sync is refused while one runs", async () => {
  await call("PUT", "/api/connections/max", { cookie, headers: X, body: { username: "u@example.com", password: "pw-max-1" } });
  await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "AB12345", password: "very-secret-pw" } });
  cookie = (await call("POST", "/api/auth/login", { body: { password: "my long password" } })).setCookie.split(";")[0];
  globalThis.__delay = 600;
  const first = call("POST", "/api/connections/max/test", { cookie, headers: X });
  await new Promise((r) => setTimeout(r, 150));
  const job = await call("GET", "/api/jobs", { cookie });
  assert.deepEqual([job.body.source, job.body.kind], ["max", "test"]);
  const t2 = await call("POST", "/api/connections/hapoalim/test", { cookie, headers: X });
  assert.equal(t2.status, 409); assert.equal(t2.body.busy, true); assert.match(t2.body.error, /Wait for it to finish/);
  const s2 = await call("POST", "/api/sync/hapoalim", { cookie, headers: X });
  assert.equal(s2.status, 409);
  const all = await call("POST", "/api/sync", { cookie, headers: X });
  assert.equal(all.status, 409);
  assert.equal((await first).body.ok, true);
  globalThis.__delay = 0;
  assert.equal((await call("GET", "/api/jobs", { cookie })).body, null);
  assert.equal((await call("POST", "/api/connections/hapoalim/test", { cookie, headers: X })).status, 200); // free again
});

test("ntfy alerts may only go to your own network", () => {
  for (const ok of ["http://localhost:8080/money", "http://192.168.1.20/money", "http://10.0.0.4:2586/x", "http://100.101.102.103/x", "https://rhs.taile6739f.ts.net/money", "http://ntfy/money", "http://nas.local/x"]) assert.equal(ntfyProblem(ok), null, ok);
  for (const bad of ["https://ntfy.sh/mytopic", "https://example.com/x", "http://8.8.8.8/x", "http://172.32.0.1/x"]) assert.ok(ntfyProblem(bad), bad);
  assert.ok(ntfyProblem("not a url"));
});

test("a bank asking for a one-time code locks the source on the first failure", async () => {
  await saveCreds("max", { username: "u@example.com", password: "pw-otp-test" });
  assert.equal(await recordResult("max", false, "OTP_REQUIRED: the bank asked for a one-time code, which this scraper cannot enter", {}), true);
  assert.equal(await isLocked("max"), true);
  await unlock("max");
});

test("connection status wording covers every state", () => {
  const T0 = new Date("2026-10-10T12:00:00Z").getTime(), iso = (d) => new Date(T0 - d * 864e5).toISOString();
  const base = { configured: true, locked: false, failures: 0, lastError: "", savedAt: iso(5), testedAt: null, syncedAt: null };
  const k = (o) => connectionStatus({ ...base, ...o }, T0);
  assert.deepEqual([k({ configured: false }).key, k({ configured: false }).tone], ["none", "gray"]);
  assert.deepEqual([k({}).key, k({}).tone], ["untested", "yellow"]);
  assert.deepEqual([k({ testedAt: iso(1) }).key, k({ testedAt: iso(1) }).tone], ["tested", "yellow"]);
  assert.deepEqual([k({ syncedAt: iso(0.2) }).key, k({ syncedAt: iso(0.2) }).tone], ["connected", "green"]);
  assert.equal(k({ syncedAt: iso(3) }).key, "stale");
  assert.deepEqual([k({ failures: 1, syncedAt: iso(0.2) }).key, k({ failures: 1 }).tone], ["failed", "red"]);
  assert.equal(k({ locked: true, failures: 2 }).key, "locked");
  assert.equal(k({ locked: true, lastError: "OTP_REQUIRED: x" }).key, "otp");
  // credentials saved again after the last good sync or test: those no longer count
  assert.equal(k({ savedAt: iso(0.1), syncedAt: iso(1), testedAt: iso(1) }).key, "untested");
});

test("status is computed end to end: save, test, sync", async () => {
  await q("TRUNCATE credentials, source_state, sync_runs");
  const st = async () => (await listConnections()).find((c) => c.source === "isracard").status.key;
  assert.equal(await st(), "none");
  await saveCreds("isracard", { id: "123456789", card6Digits: "123456", password: "pw-status-1" });
  assert.equal(await st(), "untested");
  const { markTested } = await import("../src/connections.js");
  await markTested("isracard");
  assert.equal(await st(), "tested");
  await q("INSERT INTO sync_runs (source,finished_at,ok,added) VALUES ('isracard', now() + interval '1 second', true, 3)");
  assert.equal(await st(), "connected");
  await recordResult("isracard", false, "boom", {});
  assert.equal(await st(), "failed");
});

test("device verification: one window at a time, drives the scraper, never reveals credentials, unlocks the source", async () => {
  globalThis.__assist = [];
  await call("PUT", "/api/connections/hapoalim", { cookie, headers: X, body: { userCode: "AB12345", password: "very-secret-pw" } });
  await recordResult("hapoalim", false, "OTP_REQUIRED: the bank asked for a one-time code", {});
  assert.equal(await isLocked("hapoalim"), true);
  assert.equal((await call("POST", "/api/connections/wise/assist/start", { cookie, headers: X })).status, 404);
  assert.equal((await call("GET", "/api/assist/screen", { cookie })).status, 409); // no window yet
  const start = await call("POST", "/api/connections/hapoalim/assist/start", { cookie, headers: X });
  assert.equal(start.status, 200);
  assert.equal((await call("GET", "/api/jobs", { cookie })).body.kind, "assist");
  await call("PUT", "/api/connections/max", { cookie, headers: X, body: { username: "u@example.com", password: "pw-max-assist" } });
  assert.equal((await call("POST", "/api/connections/max/assist/start", { cookie, headers: X })).status, 409);
  assert.equal((await call("POST", "/api/connections/max/test", { cookie, headers: X })).status, 409);
  assert.equal((await call("POST", "/api/sync", { cookie, headers: X })).status, 409);
  const img = await fetch(base + "/api/assist/screen", { headers: { cookie } });
  assert.equal(img.headers.get("content-type"), "image/jpeg");
  await call("POST", "/api/assist/click", { cookie, headers: X, body: { x: 10, y: 20 } });
  await call("POST", "/api/assist/key", { cookie, headers: X, body: { key: "Tab" } });
  const typed = await call("POST", "/api/assist/credential", { cookie, headers: X, body: { field: "password" } });
  assert.deepEqual(typed.body, { ok: true }); // the response never carries the value
  assert.equal((await call("POST", "/api/assist/credential", { cookie, headers: X, body: { field: "nonsense" } })).status, 400);
  assert.ok(globalThis.__assist.some((a) => a.startsWith("type") && a.includes("very-secret-pw"))); // it went to the scraper
  assert.equal((await call("POST", "/api/assist/stop", { cookie, headers: X })).status, 200);
  assert.equal(await isLocked("hapoalim"), false); // verified: the OTP lock is lifted
  assert.equal((await call("GET", "/api/jobs", { cookie })).body, null);
  assert.equal((await call("GET", "/api/assist/screen", { cookie })).status, 409);
  const c = (await call("GET", "/api/connections", { cookie })).body.find((x) => x.source === "hapoalim");
  assert.ok(c.assistedAt);
});

test("an uploaded PDF can be viewed again; bad ids are a clean 404", async () => {
  await q("INSERT INTO transactions (date,description,amount) VALUES ('2026-10-01','Receipt test',-5)");
  const id = (await q("SELECT max(id) AS id FROM transactions")).rows[0].id;
  const up = await fetch(base + `/api/transactions/${id}/documents`, { method: "POST", headers: { cookie, ...X, "x-filename": encodeURIComponent("חשבונית (1).pdf"), "content-type": "application/pdf" }, body: Buffer.from("%PDF-1.4 test") });
  const meta = await up.json();
  assert.equal(up.status, 200, JSON.stringify(meta));
  const r = await fetch(base + "/api/documents/" + meta.id, { headers: { cookie } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/pdf");
  assert.equal(await r.text(), "%PDF-1.4 test");
  assert.equal((await fetch(base + "/api/documents/abc", { headers: { cookie } })).status, 404);
  assert.equal((await fetch(base + "/api/documents/99999", { headers: { cookie } })).status, 404);
});

test("sync settings: only known values are accepted and they change what a sync reads", async () => {
  const g = await call("GET", "/api/sync/settings", { cookie });
  assert.equal(g.body.hours, 8);
  const p = await call("PUT", "/api/sync/settings", { cookie, headers: X, body: { hours: 12, firstDays: 1825, routineDays: 7 } });
  assert.equal(p.body.hours, 12);
  assert.equal(p.body.firstDays, 1825);
  assert.equal(p.body.routineDays, 30); // 7 is not an offered value, so it is ignored
});
