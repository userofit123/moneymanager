import express from "express";
import { logError, noteRequest, listErrors, clearErrors, systemInfo, recentActions } from "./errlog.js";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, q, audit, pool } from "./db.js";
import { loadKey } from "./secrets.js";
import { ensureDefaults, getState, putState, StaleError } from "./state.js";
import { ratesSummary, refreshRates, rateOn } from "./fx.js";
import { recordGap } from "./gaps.js";
import { syncSource, syncAll, SOURCE_NAMES, startScheduler, snapshotNetWorth, getSyncSettings, putSyncSettings, testSource, syncLog, activeJob, acquireJob, releaseJob, extendJob } from "./sync.js";
import { assist as scraperAssist, lastShot as scraperLastShot } from "./sources/scraper.js";
import { saveDoc, sendDoc } from "./docs.js";
import { ingest } from "./sources/ingest.js";
import { parseWiseCsv, parseBankCsv } from "./sources/csv.js";
import { seedDemo } from "./seed.js";
import { fillJars, readJars } from "./jars.js";
import { sendNtfy, sendNtfyOnly, ntfyProblem, ntfyUrl, channelStatus, saveChannel, removeChannel, sendChannel, pushKey, pushSubscribe, pushUnsubscribe, pushStatus, sendPush } from "./notify.js";
import { listConnections, saveCreds, removeCreds, unlock, getCreds, markAssisted, FIELDS, PROVIDERS, baseOf, validId, nextId, setNickname } from "./connections.js";
import * as auth from "./auth.js";
import * as bk from "./backup.js";
import { createAccount, updateAccount, setBalance, deleteAccount, alertsSeen, alertsOpen, alertHistory } from "./accounts.js";

const WEB = process.env.WEB_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "frontend", "dist"); // the built app (frontend/, npm run build)
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1"); // set when Caddy or another proxy sits in front

const ASSIST_BANKS = Object.keys(FIELDS).filter((k) => k !== "wise");
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { console.error(req.method, req.path, e.message); logError({ source: "server", action: `${req.method} ${req.path}`, error: e, context: { status: 500 } }); res.status(500).json({ error: "Something went wrong" }); });
process.on("unhandledRejection", (e) => { console.error("unhandled:", e && e.message); logError({ source: "process", action: "Unhandled error in the background", error: e }); });
process.on("uncaughtException", (e) => { console.error("uncaught:", e && e.message); logError({ source: "process", action: "Uncaught error", error: e }); });
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
  // version: the desktop app reads it to see whether its own screens fit this server
  res.set("Cache-Control", "no-store").json({ setup: !u, authed: !!u && (await auth.sessionValid(auth.readCookie(req))), totp: !!u?.totp_enabled, version: versionOf(readChangelog()) });
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
    noteRequest(req.method, req.originalUrl.split("?")[0]);
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
  // starting over replaces the secret and switches 2FA off, so with 2FA on it needs the password first (the disable route)
  if ((await auth.getUser())?.totp_enabled) return res.status(409).json({ error: "Two-factor sign-in is already on. Turn it off first (it asks for your password)." });
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
// Appearance and other per-person view choices, kept in the database so they survive a new browser, a new port or a reinstall.
app.get("/api/prefs", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json((await q("SELECT value FROM settings WHERE key='ui_prefs'")).rows[0]?.value || {})));
app.put("/api/prefs", json, wrap(async (req, res) => {
  const b = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const out = {};
  for (const [k, v] of Object.entries(b)) if (/^money[A-Za-z]{2,20}$/.test(k) && typeof v === "string" && v.length < 20000) out[k] = v;
  await q("INSERT INTO settings (key,value) VALUES ('ui_prefs',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify(out)]);
  res.json({ ok: true });
}));
// The error log (Settings → Error log)
app.get("/api/errors", wrap(async (req, res) => res.set("Cache-Control", "no-store").json({ rows: await listErrors(req.query.limit), system: await systemInfo(versionOf(readChangelog())) })));
app.post("/api/errors", json, wrap(async (req, res) => { // an error that happened in the page
  const b = req.body && typeof req.body === "object" ? req.body : {};
  await logError({ source: "web", action: String(b.action || "").slice(0, 300), message: String(b.message || "").slice(0, 4000), detail: String(b.stack || "").slice(0, 12000), context: { view: String(b.view || "").slice(0, 40), ua: String(b.ua || "").slice(0, 300), screen: String(b.screen || "").slice(0, 40), lang: String(b.lang || "").slice(0, 10), clientActions: Array.isArray(b.actions) ? b.actions.slice(-15).map((x) => String(x).slice(0, 120)) : [], recent: recentActions() } });
  res.json({ ok: true });
}));
app.delete("/api/errors", wrap(async (_req, res) => { await clearErrors(); res.json({ ok: true }); }));
app.get("/api/state", wrap(async (_req, res) => { res.set("Cache-Control", "no-store"); res.json(await getState()); }));
app.get("/api/rev", wrap(async (_req, res) => { res.set("Cache-Control", "no-store"); res.json({ rev: parseInt((await q("SELECT value FROM app_meta WHERE key='rev'")).rows[0].value, 10) }); }));
// Live updates: the page keeps this connection open and is told the moment the data changes.
const liveClients = new Set();
let liveRev = null, liveTimer = null;
async function liveTick() {
  try {
    const rev = parseInt((await q("SELECT value FROM app_meta WHERE key='rev'")).rows[0].value, 10);
    if (liveRev !== null && rev !== liveRev) for (const r of liveClients) r.write(`event: rev\ndata: ${rev}\n\n`);
    liveRev = rev;
  } catch { /* try again on the next tick */ }
}
app.get("/api/events", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");
  liveClients.add(res);
  if (!liveTimer) { liveTimer = setInterval(() => { liveTick(); for (const r of liveClients) r.write(": ping\n\n"); }, 1500); liveTimer.unref?.(); }
  req.on("close", () => { liveClients.delete(res); if (!liveClients.size) { clearInterval(liveTimer); liveTimer = null; liveRev = null; } });
});
app.put("/api/state", json, wrap(async (req, res) => {
  try { res.json(await putState(req.body)); }
  catch (e) { if (e instanceof StaleError) return res.status(409).json({ error: "stale", state: await getState() }); throw e; }
}));

app.get("/api/fx/rate", wrap(async (req, res) => res.json({ rate: await rateOn(String(req.query.cur || "ILS"), String(req.query.date || new Date().toISOString().slice(0, 10))) })));
app.get("/api/fx", wrap(async (_req, res) => res.json(await ratesSummary(30))));
app.post("/api/fx/refresh", wrap(async (_req, res) => res.json({ rows: await refreshRates() })));

// ---------- connections (credentials are write-only) ----------
app.get("/api/connections", wrap(async (_req, res) => res.json(await listConnections())));
app.post("/api/connections/:provider/new", wrap(async (req, res) => { // the id for one more login at a company
  if (!FIELDS[req.params.provider]) return res.status(404).json({ error: "unknown source" });
  res.json({ source: await nextId(req.params.provider) });
}));
app.put("/api/connections/:source/nickname", json, wrap(async (req, res) => {
  if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" });
  try { await setNickname(req.params.source, req.body?.nickname); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ ok: true });
}));
app.put("/api/connections/:source", json, wrap(async (req, res) => {
  if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" });
  try { await saveCreds(req.params.source, req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ ok: true });
}));
app.delete("/api/connections/:source", wrap(async (req, res) => {
  if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" });
  await removeCreds(req.params.source);
  if (ASSIST_BANKS.includes(baseOf(req.params.source))) { try { await scraperAssist("forget", { company: baseOf(req.params.source), profile: req.params.source }); } catch {} } // also forget the remembered device
  res.json({ ok: true });
}));
app.post("/api/connections/:source/unlock", wrap(async (req, res) => { if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" }); await unlock(req.params.source); res.json({ ok: true }); }));
app.post("/api/connections/:source/test", wrap(async (req, res) => {
  if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" });
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
  if (!validId(src) || !ASSIST_BANKS.includes(baseOf(src))) return res.status(404).json({ error: "Not available for this source" });
  if (!(await getCreds(src))) return res.status(400).json({ error: "Save the login first." });
  const busy = acquireJob(src, "assist", ASSIST_TTL);
  if (busy) return res.status(409).json(busy);
  try { res.json(await scraperAssist("start", { company: baseOf(src), profile: src })); }
  catch (e) { releaseJob("assist"); res.status(502).json({ error: "The scraper could not open the bank page: " + assistErr(e) }); }
}));
app.get("/api/connections/:source/shot", wrap(async (req, res) => {
  const src = req.params.source;
  if (!validId(src)) return res.status(404).json({ error: "unknown source" });
  try { res.set("Content-Type", "image/jpeg").set("Cache-Control", "no-store").send(await scraperLastShot(baseOf(src), src)); }
  catch { res.status(404).json({ error: "No screenshot of a failed login is kept yet." }); }
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
  if (!creds || !FIELDS[baseOf(j.source)].some((x) => x.k === f) || !creds[f]) return res.status(400).json({ error: "No such saved field." });
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
  res.json({ ok: await sendNtfyOnly("Money", "Test alert: background notifications work"), reason: "The ntfy server did not accept it." });
}));

// ---------- sync and import ----------
// other places alerts can go: Telegram bot, webhook (secrets are write-only)
app.get("/api/notify/channels", wrap(async (_req, res) => res.json(await channelStatus())));
app.put("/api/notify/channels/:kind", json, wrap(async (req, res) => { try { await saveChannel(req.params.kind, req.body); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); } }));
app.delete("/api/notify/channels/:kind", wrap(async (req, res) => { await removeChannel(req.params.kind); res.json({ ok: true }); }));
app.post("/api/notify/channels/:kind/test", wrap(async (req, res) => res.json({ ok: await sendChannel(req.params.kind, "Money", "Test alert: notifications work") })));
app.get("/api/push/key", wrap(async (_req, res) => res.json({ key: await pushKey() })));
app.post("/api/push/status", json, wrap(async (req, res) => res.json(await pushStatus(req.body?.endpoint))));
app.post("/api/push/subscribe", json, wrap(async (req, res) => { try { await pushSubscribe(req.body?.sub, req.body?.label); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); } }));
app.post("/api/push/unsubscribe", json, wrap(async (req, res) => { await pushUnsubscribe(req.body?.endpoint); res.json({ ok: true }); }));
app.post("/api/push/test", wrap(async (_req, res) => res.json({ ok: await sendPush("Money", "Test alert: phone notifications work") })));
app.get("/api/sync/settings", wrap(async (_req, res) => res.json(await getSyncSettings())));
app.put("/api/sync/settings", json, wrap(async (req, res) => res.json(await putSyncSettings(req.body || {}))));
app.get("/api/sync/log", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(await syncLog())));
app.post("/api/sync", wrap(async (_req, res) => { const r = await syncAll(); res.status(r.busy ? 409 : 200).json(r); }));
app.post("/api/sync/:source", wrap(async (req, res) => {
  if (!validId(req.params.source)) return res.status(404).json({ error: "unknown source" });
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
  const want = String(req.query.account || "");
  let a = (await q("SELECT name,currency,source FROM accounts WHERE name=$1 AND kind IN ('bank','card')", [want])).rows[0];
  if (!a) { // nothing connected yet: a company from the list gets its account the first time a file is imported
    const prov = Object.entries(PROVIDERS).find(([k, p]) => k !== "wise" && p.label === want);
    if (!prov) return res.status(400).json({ error: "Choose a bank or card account" });
    await q("INSERT INTO accounts (name,currency,kind,source,subtitle,in_net_worth,sort) VALUES ($1,'ILS',$2,$3,$4,$5,$6) ON CONFLICT (name,currency) DO NOTHING", [want, prov[1].kind, prov[0], prov[1].kind === "card" ? "Credit card" : "Bank account", prov[1].kind !== "card", prov[1].kind === "card" ? 1 : 0]);
    a = { name: want, currency: "ILS", source: prov[0] };
  }
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
// ---------- accounts you make yourself ----------
const bad = (res, e) => res.status(400).json({ error: e.message });
app.post("/api/accounts", json, wrap(async (req, res) => { try { res.json(await createAccount(req.body || {})); } catch (e) { bad(res, e); } }));
app.put("/api/accounts/:id", json, wrap(async (req, res) => { try { res.json(await updateAccount(+req.params.id, req.body || {})); } catch (e) { bad(res, e); } }));
app.post("/api/accounts/:id/balance", json, wrap(async (req, res) => { try { res.json(await setBalance(+req.params.id, req.body?.balance, req.body?.note)); } catch (e) { bad(res, e); } }));
app.delete("/api/accounts/:id", wrap(async (req, res) => { try { res.json(await deleteAccount(+req.params.id)); } catch (e) { bad(res, e); } }));
// ---------- alert history ----------
app.post("/api/alerts/seen", json, wrap(async (req, res) => res.json(await alertsSeen(req.body?.alerts))));
app.get("/api/alerts/open", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(await alertsOpen())));
app.get("/api/alerts/history", wrap(async (req, res) => res.set("Cache-Control", "no-store").json(await alertHistory(req.query.limit, req.query.offset))));
app.post("/api/networth/snapshot", wrap(async (_req, res) => { await snapshotNetWorth(); res.json({ ok: true }); }));
if (process.env.ALLOW_DEMO_SEED === "1") app.post("/api/demo/seed", wrap(async (_req, res) => res.json(await seedDemo())));

// ---------- backups ----------
const bkErr = (res, e) => res.status(e.needPassword ? 401 : 400).json({ error: e.message, needPassword: !!e.needPassword });
app.get("/api/backup", wrap(async (_req, res) => res.set("Cache-Control", "no-store").json(await bk.view())));
app.put("/api/backup/settings", json, wrap(async (req, res) => { try { res.json(await bk.putCfg(req.body || {})); } catch (e) { bkErr(res, e); } }));
app.post("/api/backup/run", wrap(async (_req, res) => { try { await bk.runBackup("manual"); res.json(await bk.view()); } catch (e) { bkErr(res, e); } }));
app.get("/api/backup/file/:name", wrap(async (req, res) => {
  try { const f = bk.filePath(await bk.getCfg(), req.params.name); if (!fs.existsSync(f)) return res.status(404).json({ error: "not found" }); res.download(f, req.params.name); } catch (e) { bkErr(res, e); }
}));
app.delete("/api/backup/file/:name", wrap(async (req, res) => { try { await bk.removeFile(req.params.name); res.json(await bk.view()); } catch (e) { bkErr(res, e); } }));
app.post("/api/backup/upload", express.raw({ type: () => true, limit: "600mb" }), wrap(async (req, res) => {
  try { const name = await bk.saveUpload(req.body, String(req.query.name || "")); res.json({ name, ...(await bk.view()) }); } catch (e) { bkErr(res, e); }
}));
app.post("/api/backup/inspect", json, wrap(async (req, res) => { try { res.json(await bk.inspect(String(req.body?.name || ""), req.body?.password)); } catch (e) { bkErr(res, e); } }));
app.post("/api/backup/restore", json, wrap(async (req, res) => {
  try { res.json({ summary: await bk.restore(String(req.body?.name || ""), req.body?.password), ...(await bk.view()) }); } catch (e) { bkErr(res, e); }
}));

// ---------- version, changelog and "is there a newer version?" ----------
const CHANGELOG = process.env.CHANGELOG_FILE || path.join(process.env.WEB_DIR ? path.join(WEB, "..") : path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."), "CHANGELOG.md"); // next to the app folder (Docker, desktop) or the repository root
const readChangelog = () => { try { return fs.readFileSync(CHANGELOG, "utf8"); } catch { return ""; } };
const versionOf = (t) => (t.match(/^## \[?v?(\d+\.\d+\.\d+)/m) || [])[1] || "";
const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
let latestCache = { at: 0, v: null, err: "" };
const readChangelogHe = () => { try { return fs.readFileSync(CHANGELOG.replace(/\.md$/, ".he.md"), "utf8"); } catch { return ""; } }; // CHANGELOG.he.md next to CHANGELOG.md
app.get("/api/version", wrap(async (_req, res) => { const t = readChangelog(); res.json({ version: versionOf(t), changelog: t, changelogHe: readChangelogHe() }); }));
// asks GitHub (public repository) for the latest release; cached for an hour. No release published yet is not an error.
app.get("/api/update-check", wrap(async (req, res) => {
  const cur = versionOf(readChangelog());
  if (req.query.force) latestCache.at = 0; // the "Check for updates" button
  if (Date.now() - latestCache.at > 36e5) {
    try {
      const r = await fetch("https://api.github.com/repos/userofit123/moneymanager/releases/latest", { headers: { "user-agent": "money-manager", accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(8000) });
      if (r.status === 404) latestCache = { at: Date.now(), v: { version: "", notes: "", url: "" }, err: "" }; // reachable, but nothing has been published yet
      else if (!r.ok) throw new Error(r.status === 403 ? "GitHub refused the request (too many checks, try again later)" : "GitHub answered HTTP " + r.status);
      else { const j = await r.json(); latestCache = { at: Date.now(), v: { version: String(j.tag_name || "").replace(/^v/, ""), notes: String(j.body || "").slice(0, 6000), url: j.html_url }, err: "" }; }
    } catch (e) { latestCache = { at: Date.now() - 36e5 + 6e4, v: null, err: String(e.cause?.code || e.message || e).slice(0, 160) }; } // try again in a minute
  }
  const l = latestCache.v;
  res.json({ current: cur, latest: l && l.version ? l.version : null, reachable: !!l, available: !!(l && l.version && cur && newer(l.version, cur)), notes: l ? l.notes : "", url: l ? l.url : "", error: l ? "" : latestCache.err });
}));

app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

// ---------- front end: the built app (frontend/dist), or the Vite dev server while developing ----------
// The page and the service worker are never cached; the files under /assets/ have their content in their name, so they can be kept for good.
const sendIndex = (_req, res, next) => res.set("Cache-Control", "no-cache").sendFile(path.join(WEB, "index.html"), (e) => e && next());
let devUpgrade = null;
if (process.env.VITE_DEV_URL) {
  // In dev, every page and file comes from the Vite dev server (VITE_DEV_URL), including hot reload over a websocket.
  const target = new URL(process.env.VITE_DEV_URL);
  const forward = (req, res) => {
    const p = http.request({ host: target.hostname, port: target.port, path: req.originalUrl, method: req.method, headers: { ...req.headers, host: target.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on("error", () => res.status(502).type("text").send("The Vite dev server is not running yet."));
    req.pipe(p);
  };
  app.use((req, res, next) => (req.path.startsWith("/api/") ? next() : forward(req, res)));
  devUpgrade = (req, socket, head) => {
    const p = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: target.host } });
    p.on("upgrade", (r, s, h) => {
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(r.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`);
      if (h.length) socket.write(h);
      s.pipe(socket).pipe(s);
    });
    p.on("error", () => socket.destroy());
    p.end(head);
  };
} else {
  app.get(["/", "/index.html"], sendIndex);
  app.use("/assets", express.static(path.join(WEB, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(WEB, { index: false, setHeaders: (res, f) => { if (f.endsWith("sw.js") || f.endsWith(".webmanifest")) res.set("Cache-Control", "no-cache"); } }));
  // every other address that is not a file (/jars, /settings, an old link like /fc) opens the app, which shows that page
  app.get(/^\/(?!api\/|assets\/)[^.]*$/, sendIndex);
}

let httpServer = null;
// closes the web server and the database cleanly (the desktop app calls this when it quits)
export async function stop() { await new Promise((ok) => (httpServer ? httpServer.close(() => ok()) : ok())); await pool.end(); }
export async function start() {
  loadKey(); // fails early if the key is unusable
  await migrate();
  await ensureDefaults({ demoAccounts: false });
  const port = +process.env.PORT || 8080;
  httpServer = app.listen(port, process.env.HOST || undefined, () => console.log("money manager on :" + port)); // HOST=127.0.0.1 keeps it local (the desktop app)
  if (devUpgrade) httpServer.on("upgrade", devUpgrade);
  if (process.env.SCHEDULER !== "0") { startScheduler(); bk.startBackups(); }
  refreshRates().catch((e) => console.error("rates:", e.message)).then(async () => {
    if (process.env.AUTO_DEMO_SEED !== "1") return;
    const n = (await q("SELECT count(*)::int AS n FROM transactions")).rows[0].n;
    if (!n) console.log("sample data loaded:", await seedDemo());
  }).catch((e) => console.error("seed:", e.message));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) start().catch((e) => { console.error("startup failed:", e.message); process.exit(1); });
