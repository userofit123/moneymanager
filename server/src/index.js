import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, q, audit } from "./db.js";
import { loadKey } from "./secrets.js";
import { ensureDefaults, getState, putState, StaleError } from "./state.js";
import { ratesSummary, refreshRates, rateOn } from "./fx.js";
import { recordGap } from "./gaps.js";
import { syncSource, syncAll, SOURCE_NAMES, startScheduler, snapshotNetWorth, getSyncSettings, putSyncSettings, testSource, syncLog, activeJob, acquireJob, releaseJob, extendJob } from "./sync.js";
import { assist as scraperAssist } from "./sources/scraper.js";
import { saveDoc, sendDoc } from "./docs.js";
import { ingest } from "./sources/ingest.js";
import { parseWiseCsv, parseBankCsv } from "./sources/csv.js";
import { seedDemo } from "./seed.js";
import { addSuggested } from "./categories.js";
import { fillJars, readJars } from "./jars.js";
import { bumpRev, tx } from "./db.js";
import { applyRules } from "./engine.js";
import { sendNtfy, ntfyProblem, ntfyUrl } from "./notify.js";
import { listConnections, saveCreds, removeCreds, unlock, getCreds, markAssisted, FIELDS } from "./connections.js";
import * as auth from "./auth.js";

const WEB = process.env.WEB_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1"); // set when Caddy or another proxy sits in front

const ASSIST_BANKS = ["hapoalim", "max", "isracard"];
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { console.error(req.method, req.path, e.message); res.status(500).json({ error: "Something went wrong" }); });
const json = express.json({ limit: "20mb" });

// ---------- security headers ----------
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'self'; base-uri 'none'; form-action 'self'; frame-src 'self'; frame-ancestors 'self'",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(self)",
  });
  if (req.secure) res.set("Strict-Transport-Security", "max-age=31536000");
  next();
});

app.get("/healthz", wrap(async (_req, res) => { await q("SELECT 1"); res.json({ ok: true }); }));

// ---------- auth ----------
const cookieOpts = (req) => ({ httpOnly: true, sameSite: "strict", secure: req.secure, path: "/", maxAge: auth.cookieMaxAge * 1000 });
const setCookie = (req, res, token) => res.cookie(auth.COOKIE, token, cookieOpts(req));

app.get("/api/auth/status", wrap(async (req, res) => {
  const u = await auth.getUser();
  res.set("Cache-Control", "no-store").json({ setup: !u, authed: !!u && (await auth.sessionValid(auth.readCookie(req))), totp: !!u?.totp_enabled });
}));
app.post("/api/auth/setup", json, wrap(async (req, res) => {
  if (await auth.getUser()) return res.status(409).json({ error: "Already set up" });
  try { await auth.createUser(req.body?.password); } catch (e) { return res.status(400).json({ error: e.message }); }
  setCookie(req, res, await auth.startSession(req.get("user-agent")));
  res.json({ ok: true });
}));
app.post("/api/auth/login", json, wrap(async (req, res) => {
  const ip = req.ip;
  if (await auth.tooManyAttempts(ip)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const u = await auth.getUser();
  if (!u) return res.status(409).json({ setup: true });
  const okPw = typeof req.body?.password === "string" && auth.checkPassword(req.body.password, u.password_hash);
  if (okPw && u.totp_enabled) {
    if (!req.body.code) return res.status(401).json({ need2fa: true });
    if (!auth.totpOk(auth.readTotpSecret(u), req.body.code)) { await auth.noteAttempt(ip, false); await new Promise((r) => setTimeout(r, 400)); return res.status(401).json({ error: "That code is not right.", need2fa: true }); }
  } else if (!okPw) { await auth.noteAttempt(ip, false); await new Promise((r) => setTimeout(r, 400)); return res.status(401).json({ error: "Wrong password." }); }
  await auth.noteAttempt(ip, true);
  setCookie(req, res, await auth.startSession(req.get("user-agent")));
  res.json({ ok: true });
}));

// Everything else under /api needs a session; changes also need the custom header (on top of SameSite=Strict).
app.use("/api", (req, res, next) => {
  auth.sessionValid(auth.readCookie(req)).then((ok) => {
    if (!ok) return res.status(401).json({ error: "auth" });
    if (!["GET", "HEAD"].includes(req.method) && req.get("x-requested-with") !== "money") return res.status(403).json({ error: "bad request" });
    next();
  }).catch(() => res.status(500).json({ error: "Something went wrong" }));
});

app.post("/api/auth/logout", wrap(async (req, res) => { await auth.endSession(auth.readCookie(req)); res.clearCookie(auth.COOKIE, { path: "/" }).json({ ok: true }); }));
app.post("/api/auth/logout-all", wrap(async (_req, res) => { await q("DELETE FROM sessions"); res.clearCookie(auth.COOKIE, { path: "/" }).json({ ok: true }); }));
app.post("/api/auth/password", json, wrap(async (req, res) => {
  const u = await auth.getUser();
  if (!auth.checkPassword(String(req.body?.current || ""), u.password_hash)) return res.status(400).json({ error: "Current password is wrong." });
  try { await auth.setPassword(req.body?.next); } catch (e) { return res.status(400).json({ error: e.message }); }
  setCookie(req, res, await auth.startSession(req.get("user-agent"))); // other sessions were signed out
  res.json({ ok: true });
}));
app.post("/api/auth/2fa/start", wrap(async (_req, res) => {
  const s = auth.newTotpSecret();
  await auth.storeTotpSecret(s);
  res.json({ secret: s, uri: `otpauth://totp/Money%20Manager?secret=${s}&issuer=Money%20Manager` });
}));
app.post("/api/auth/2fa/enable", json, wrap(async (req, res) => {
  const s = auth.readTotpSecret(await auth.getUser());
  if (!s || !auth.totpOk(s, req.body?.code)) return res.status(400).json({ error: "That code is not right." });
  await auth.enableTotp(); res.json({ ok: true });
}));
app.post("/api/auth/2fa/disable", json, wrap(async (req, res) => {
  const u = await auth.getUser();
  if (!auth.checkPassword(String(req.body?.password || ""), u.password_hash)) return res.status(400).json({ error: "Password is wrong." });
  await auth.disableTotp(); res.json({ ok: true });
}));

// ---------- app data ----------
app.get("/api/state", wrap(async (_req, res) => { res.set("Cache-Control", "no-store"); res.json(await getState()); }));
app.put("/api/state", json, wrap(async (req, res) => {
  try { res.json(await putState(req.body)); }
  catch (e) { if (e instanceof StaleError) return res.status(409).json({ error: "stale", state: await getState() }); throw e; }
}));

app.get("/api/fx/rate", wrap(async (req, res) => res.json({ rate: await rateOn(String(req.query.cur || "ILS"), String(req.query.date || new Date().toISOString().slice(0, 10))) })));
app.get("/api/fx", wrap(async (_req, res) => res.json(await ratesSummary(30))));
app.post("/api/fx/refresh", wrap(async (_req, res) => res.json({ rows: await refreshRates() })));

// ---------- connections (credentials are write-only) ----------
app.get("/api/connections", wrap(async (_req, res) => res.json(await listConnections())));
app.put("/api/connections/:source", json, wrap(async (req, res) => {
  if (!FIELDS[req.params.source]) return res.status(404).json({ error: "unknown source" });
  try { await saveCreds(req.params.source, req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ ok: true });
}));
app.delete("/api/connections/:source", wrap(async (req, res) => {
  await removeCreds(req.params.source);
  if (ASSIST_BANKS.includes(req.params.source)) { try { await scraperAssist("forget", { company: req.params.source }); } catch {} } // also forget the remembered device
  res.json({ ok: true });
}));
app.post("/api/connections/:source/unlock", wrap(async (req, res) => { await unlock(req.params.source); res.json({ ok: true }); }));
app.post("/api/connections/:source/test", wrap(async (req, res) => {
  if (!FIELDS[req.params.source]) return res.status(404).json({ error: "unknown source" });
  const r = await testSource(req.params.source);
  res.status(r.busy ? 409 : 200).json(r);
}));
app.get("/api/jobs", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(activeJob())));
// ---------- assisted login: verify this device by hand (log in, enter the bank's code, tick "remember this device") ----------
const ASSIST_TTL = 11 * 60 * 1000;
const assistJob = () => { const j = activeJob(); return j && j.kind === "assist" ? j : null; };
const needAssist = (res) => { const j = assistJob(); if (!j) { res.status(409).json({ error: "No verification window is open." }); return null; } extendJob(ASSIST_TTL); return j; };
const assistErr = (e) => String(e.message || e).slice(0, 160);
app.post("/api/connections/:source/assist/start", wrap(async (req, res) => {
  const src = req.params.source;
  if (!ASSIST_BANKS.includes(src)) return res.status(404).json({ error: "Not available for this source" });
  if (!(await getCreds(src))) return res.status(400).json({ error: "Save the login first." });
  const busy = acquireJob(src, "assist", ASSIST_TTL);
  if (busy) return res.status(409).json(busy);
  try { res.json(await scraperAssist("start", { company: src })); }
  catch (e) { releaseJob("assist"); res.status(502).json({ error: "The scraper could not open the bank page: " + assistErr(e) }); }
}));
app.get("/api/assist/screen", wrap(async (_req, res) => {
  if (!needAssist(res)) return;
  try { res.set("Content-Type", "image/jpeg").set("Cache-Control", "no-store").send(await scraperAssist("screen", null, { raw: true })); }
  catch { res.status(409).json({ error: "The verification window closed." }); }
}));
const num = (v) => Number.isFinite(+v) ? +v : 0;
app.post("/api/assist/click", json, wrap(async (req, res) => { if (needAssist(res)) res.json(await scraperAssist("click", { x: num(req.body?.x), y: num(req.body?.y) })); }));
app.post("/api/assist/type", json, wrap(async (req, res) => { if (needAssist(res)) res.json(await scraperAssist("type", { text: String(req.body?.text || "").slice(0, 200) })); }));
app.post("/api/assist/key", json, wrap(async (req, res) => { if (needAssist(res)) { try { res.json(await scraperAssist("key", { key: String(req.body?.key || "") })); } catch (e) { res.status(400).json({ error: assistErr(e) }); } } }));
app.post("/api/assist/scroll", json, wrap(async (req, res) => { if (needAssist(res)) res.json(await scraperAssist("scroll", { dy: num(req.body?.dy) })); }));
// type one of your saved credentials into the focused field. The value goes server to scraper only; the browser never receives it.
app.post("/api/assist/credential", json, wrap(async (req, res) => {
  const j = needAssist(res); if (!j) return;
  const creds = await getCreds(j.source), f = String(req.body?.field || "");
  if (!creds || !FIELDS[j.source].some((x) => x.k === f) || !creds[f]) return res.status(400).json({ error: "No such saved field." });
  await scraperAssist("type", { text: creds[f] });
  res.json({ ok: true });
}));
app.post("/api/assist/stop", wrap(async (_req, res) => {
  const j = assistJob();
  try { await scraperAssist("stop", {}); } catch {}
  if (j) { releaseJob("assist"); await unlock(j.source); await markAssisted(j.source); await audit(null, "Device verified", `${j.source}: browser profile saved for later automatic logins`, "You"); }
  res.json({ ok: true });
}));

app.post("/api/ntfy/test", wrap(async (_req, res) => {
  const url = await ntfyUrl();
  const reason = url ? ntfyProblem(url) : "Save your ntfy address first.";
  if (reason) return res.json({ ok: false, reason });
  res.json({ ok: await sendNtfy("Money", "Test alert: background notifications work"), reason: "The ntfy server did not accept it." });
}));

// ---------- sync and import ----------
app.get("/api/sync/settings", wrap(async (_req, res) => res.json(await getSyncSettings())));
app.put("/api/sync/settings", json, wrap(async (req, res) => res.json(await putSyncSettings(req.body || {}))));
app.get("/api/sync/log", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(await syncLog())));
app.post("/api/sync", wrap(async (_req, res) => { const r = await syncAll(); res.status(r.busy ? 409 : 200).json(r); }));
app.post("/api/sync/:source", wrap(async (req, res) => {
  if (!SOURCE_NAMES.includes(req.params.source)) return res.status(404).json({ error: "unknown source" });
  const days = Math.max(0, Math.min(1825, parseInt(req.query.days, 10) || 0)); // 0 = the usual window; up to 5 years of history
  const r = await syncSource(req.params.source, { days: days || undefined });
  res.status(r.busy ? 409 : 200).json(r);
}));

app.post("/api/import/wise-csv", express.text({ type: "*/*", limit: "10mb" }), wrap(async (req, res) => {
  let rows; try { rows = parseWiseCsv(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const byCur = {};
  rows.forEach((r) => (byCur[r.currency] ||= []).push(r));
  const out = {};
  for (const [cur, list] of Object.entries(byCur)) {
    await q("INSERT INTO accounts (name,currency,kind,source,subtitle,sort) VALUES ('Wise',$1,'wallet','wise',$2,50) ON CONFLICT (name,currency) DO NOTHING", [cur, `${cur} balance`]);
    out[cur] = await ingest({ name: "Wise", currency: cur, source: "wise" }, list, { mergeManual: true });
  }
  res.json(out);
}));
// A bank or card export as CSV: the fallback for any source
app.post("/api/import/bank-csv", express.text({ type: "*/*", limit: "10mb" }), wrap(async (req, res) => {
  const a = (await q("SELECT name,currency,source FROM accounts WHERE name=$1 AND kind IN ('bank','card')", [String(req.query.account || "")])).rows[0];
  if (!a) return res.status(400).json({ error: "Choose a bank or card account" });
  let rows; try { rows = parseBankCsv(req.body, { positiveIsExpense: req.query.positiveIsExpense === "1" }); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ rows: rows.length, ...(await ingest({ name: a.name, currency: a.currency, source: a.source }, rows, { mergeManual: true })) });
}));

// ---------- documents ----------
app.post("/api/transactions/:id/documents", express.raw({ type: "*/*", limit: "25mb" }), wrap(async (req, res) => {
  const name = decodeURIComponent(req.get("x-filename") || "file");
  res.json(await saveDoc(+req.params.id, name, req.get("content-type") || "application/octet-stream", req.body));
}));
app.get("/api/documents/:id", wrap((req, res) => sendDoc(+req.params.id, res)));
// everything the bank returned for one transaction (kept out of the main state so it stays small)
app.get("/api/transactions/:id/details", wrap(async (req, res) => {
  const r = await q("SELECT source,external_id,bank_category,pending,details FROM transactions WHERE id=$1", [+req.params.id]);
  if (!r.rowCount) return res.status(404).json({ error: "No such transaction" });
  const x = r.rows[0];
  res.set("Cache-Control", "no-store").json({ source: x.source, externalId: x.external_id, bankCategory: x.bank_category, pending: !!x.pending, details: x.details || null });
}));


app.post("/api/gaps/:id/:action", json, wrap(async (req, res) => {
  let r; try { r = await recordGap(+req.params.id, req.params.action, req.body || {}); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!r) return res.status(404).json({ error: "no such open gap" });
  res.json(r);
}));
app.post("/api/jars/fill", wrap(async (_req, res) => { const r = await fillJars(); res.json({ ...r, jars: await readJars({ query: q }) }); }));
app.post("/api/categories/suggested", wrap(async (_req, res) => { const r = await addSuggested(); const applied = await tx((c) => applyRules(c)); if (r.categories || r.rules || applied) await bumpRev(); res.json({ ...r, applied }); }));
app.post("/api/networth/snapshot", wrap(async (_req, res) => { await snapshotNetWorth(); res.json({ ok: true }); }));
if (process.env.ALLOW_DEMO_SEED === "1") app.post("/api/demo/seed", wrap(async (_req, res) => res.json(await seedDemo())));

app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

// ---------- front end: the page and service worker are never cached ----------
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html") || req.path === "/sw.js") res.set("Cache-Control", req.path === "/sw.js" ? "no-store" : "no-cache");
  next();
});
app.use(express.static(WEB, { extensions: ["html"] }));

export async function start() {
  loadKey(); // fails early if the key is unusable
  await migrate();
  await ensureDefaults();
  const port = +process.env.PORT || 8080;
  app.listen(port, () => console.log("money manager on :" + port));
  if (process.env.SCHEDULER !== "0") startScheduler();
  refreshRates().catch((e) => console.error("rates:", e.message)).then(async () => {
    if (process.env.AUTO_DEMO_SEED !== "1") return;
    const n = (await q("SELECT count(*)::int AS n FROM transactions")).rows[0].n;
    if (!n) console.log("sample data loaded:", await seedDemo());
  }).catch((e) => console.error("seed:", e.message));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) start().catch((e) => { console.error("startup failed:", e.message); process.exit(1); });
