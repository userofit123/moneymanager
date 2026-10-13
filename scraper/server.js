// Read-only bank scraper service. The app sends the credentials with each request over the private compose network;
// they are used for that one login, kept only in memory, and never logged or written to disk.
//
//   POST /scrape  { company, credentials, startDate }       log in and read
//   POST /assist/start { company }                           open the bank's login page in a persistent browser profile
//   GET  /assist/screen | POST /assist/click|type|key|scroll  drive it from the app (you log in and enter the code yourself)
//   POST /assist/stop                                        close it; the profile (the bank's "remembered device") is kept
//
// Every scrape reuses the same browser profile per bank (PROFILE_DIR/<company>), so once you have verified this device
// by hand, the bank recognises it and stops asking for one-time codes. A failed login is NOT retried here.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { createScraper, CompanyTypes } from "israeli-bank-scrapers";

const KEY = process.env.SCRAPER_KEY || "";
// company -> [scraper id, the login fields it needs, its login page (for "Verify this device")]
const SUPPORTED = {
  hapoalim: ["hapoalim", ["userCode", "password"], "https://login.bankhapoalim.co.il/ng-portals/auth/he/"],
  leumi: ["leumi", ["username", "password"], "https://hb2.bankleumi.co.il/H/Login.html"],
  discount: ["discount", ["id", "password", "num"], "https://start.telebank.co.il/login/#/LOGIN_PAGE"],
  mercantile: ["mercantile", ["id", "password", "num"], "https://start.telebank.co.il/login/#/LOGIN_PAGE"],
  mizrahi: ["mizrahi", ["username", "password"], "https://www.mizrahi-tefahot.co.il/login/"],
  otsarHahayal: ["otsarHahayal", ["username", "password"], "https://www.ebank.ibi.co.il/"],
  union: ["union", ["username", "password"], "https://hb.unionbank.co.il/"],
  beinleumi: ["beinleumi", ["username", "password"], "https://www.fibi.co.il/"],
  massad: ["massad", ["username", "password"], "https://login.bankmassad.co.il/"],
  yahav: ["yahav", ["username", "nationalID", "password"], "https://www.bank-yahav.co.il/"],
  max: ["max", ["username", "password"], "https://www.max.co.il/login"],
  isracard: ["isracard", ["id", "card6Digits", "password"], "https://digital.isracard.co.il/personalarea/login/"],
  visaCal: ["visaCal", ["username", "password"], "https://www.cal-online.co.il/"],
  amex: ["amex", ["username", "card6Digits", "password"], "https://he.americanexpress.co.il/personalarea/login"],
};
const COMPANIES = Object.fromEntries(Object.entries(SUPPORTED).map(([k, [id]]) => [k, CompanyTypes[id]]));
const NEED = Object.fromEntries(Object.entries(SUPPORTED).map(([k, v]) => [k, v[1]]));
const LOGIN_URL = Object.fromEntries(Object.entries(SUPPORTED).map(([k, v]) => [k, v[2]]));
// "Verify this device" may only stay on the bank's own websites. Extra domains are banks' known sign-in / sister sites.
const EXTRA_DOMAINS = { leumi: ["leumi.co.il"], discount: ["discountbank.co.il"], mercantile: ["discountbank.co.il"], mizrahi: ["mizrahi-tefahot.co.il"], max: ["max.co.il"], visaCal: ["cal-online.co.il", "cal.co.il"], isracard: ["isracard.co.il"], amex: ["americanexpress.co.il"], hapoalim: ["bankhapoalim.co.il"] };
const regDomain = (h) => { const p = h.split("."); return p.slice(-(h.endsWith(".co.il") ? 3 : 2)).join("."); };
function allowedHosts(company) {
  const set = new Set([regDomain(new URL(LOGIN_URL[company]).hostname), ...(EXTRA_DOMAINS[company] || [])]);
  if (process.env.TEST_LOGIN_URL) set.add(new URL(process.env.TEST_LOGIN_URL).hostname);
  return (url) => { try { const u = new URL(url); if (["about:", "blob:", "data:"].includes(u.protocol)) return true; if (!/^https?:$/.test(u.protocol)) return false; return [...set].some((d) => u.hostname === d || u.hostname.endsWith("." + d)); } catch { return false; } };
}
const PROFILE_DIR = process.env.PROFILE_DIR || "/profiles";
const DEBUG = process.env.SCRAPER_DEBUG === "1";
const UA = process.env.SCRAPER_UA || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const VIEW = { width: 1024, height: 768 };
const ASSIST_IDLE_MS = +process.env.ASSIST_IDLE_MS || 10 * 60 * 1000;

const LASTSHOT = new Map(); // profile -> { at, url, buf }: where the last failed login stopped (memory only, replaced on the next failure)
// A bank's bot protection needs a moment of page activity before it trusts a data request: let the page finish loading and move the mouse a little, as a person would.
async function settle(p) {
  try { await p.waitForNetworkIdle({ idleTime: 800, timeout: 8000 }); } catch { /* a busy page is fine */ }
  try { for (let i = 0; i < 3; i++) { await p.mouse.move(120 + Math.random() * 600, 100 + Math.random() * 400, { steps: 6 }); await new Promise((r) => setTimeout(r, 250 + Math.random() * 300)); } } catch { /* page navigated away */ }
}
let busy = false;       // a scrape is running
let assist = null;      // { company, browser, page, timer }

const scrub = (msg, creds) => Object.values(creds || {}).reduce((m, v) => (v && String(v).length >= 3 ? m.split(String(v)).join("***") : m), String(msg)).slice(0, 200);

const ARGS = [
  "--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled", `--window-size=${VIEW.width},${VIEW.height}`, "--lang=he-IL,he,en-US",
  // no background phone-home from the browser (updates, sync, metrics, safe-browsing pings)
  "--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-pings", "--metrics-recording-only",
  "--disable-features=OptimizationHints,Translate,MediaRouter,InterestFeedContentSuggestions",
  // strict mode: the browser may only go out through the allowlist proxy
  ...(process.env.SCRAPER_PROXY ? [`--proxy-server=${process.env.SCRAPER_PROXY}`] : []),
];

// Same browser, same profile, same look every time: the bank recognises it as the device you verified.
// profile = the connection id ("max", "max~2"): two logins at one company each keep their own remembered device
const profName = (company, profile) => (/^[a-z][A-Za-z0-9]*(~\d{1,3})?$/.test(profile || "") && String(profile).split("~")[0] === company ? String(profile).replace("~", "_") : company);
async function launch(company, profile) {
  const dir = path.join(PROFILE_DIR, profName(company, profile));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return puppeteer.launch({ headless: true, userDataDir: dir, args: ARGS, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined });
}
async function look(page) {
  // The fixed user agent says "Linux". That matches the Docker browser, but on Windows or macOS it contradicts the real browser (platform, fonts, client hints),
  // which bank bot protection notices: sign-in works and the later data request is refused ("Failed to fetch"). Off Linux, use the browser's own, honest string.
  let ua = UA;
  if (!process.env.SCRAPER_UA && process.platform !== "linux") { try { ua = (await page.browser().userAgent()).replace("HeadlessChrome", "Chrome"); } catch { /* keep the fixed one */ } }
  await page.setUserAgent(ua);
  // The browser's client hints (sec-ch-ua) still say "HeadlessChrome" after the user agent string is changed. Banks read them, so give them the same story as the string.
  try {
    const major = (/Chrome\/(\d+)/.exec(ua) || [])[1] || "124", full = (/Chrome\/([\d.]+)/.exec(ua) || [])[1] || major + ".0.0.0";
    const win = /Windows/.test(ua), mac = /Mac OS X/.test(ua);
    const brands = [{ brand: "Chromium", version: major }, { brand: "Google Chrome", version: major }, { brand: "Not.A/Brand", version: "99" }];
    const cdp = await page.createCDPSession();
    await cdp.send("Network.setUserAgentOverride", {
      userAgent: ua, acceptLanguage: "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7", platform: win ? "Win32" : mac ? "MacIntel" : "Linux x86_64",
      userAgentMetadata: { brands, fullVersionList: brands.map((b) => ({ brand: b.brand, version: b.brand === "Not.A/Brand" ? "99.0.0.0" : full })), fullVersion: full, platform: win ? "Windows" : mac ? "macOS" : "Linux", platformVersion: win ? "10.0.0" : mac ? "14.0.0" : "6.5.0", architecture: "x86", model: "", mobile: false, bitness: "64", wow64: false },
    });
  // israeli-bank-scrapers calls page.setUserAgent(...) again at login (Isracard, American Express) with no client hints, which turns them back into "HeadlessChrome". Keep ours.
    const meta = { brands, fullVersionList: brands.map((b) => ({ brand: b.brand, version: b.brand === "Not.A/Brand" ? "99.0.0.0" : full })), fullVersion: full, platform: win ? "Windows" : mac ? "macOS" : "Linux", platformVersion: win ? "10.0.0" : mac ? "13.0.0" : "6.0.0", architecture: "x86", model: "", mobile: false, bitness: "64", wow64: false };
    const orig = page.setUserAgent.bind(page);
    page.setUserAgent = (u, m) => orig(typeof u === "string" ? u.replace("HeadlessChrome", "Chrome") : u, m || meta);
  } catch { /* the plain user agent above still applies */ }
  await page.setExtraHTTPHeaders({ "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7" });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", { get: () => ["he-IL", "he", "en-US", "en"] });
    if (!window.chrome) window.chrome = { runtime: {}, app: {}, csi() {}, loadTimes() {} }; // a headless browser has no window.chrome, a real one does
  });
}

// The library cannot enter one-time codes for Hapoalim, Max or Isracard. If the page it is stuck on asks for one,
// say so clearly (instead of a bare timeout) so the app stops retrying and the bank stops texting you.
const OTP_RE = /(ה?קוד|את\s*ה?קוד)\s*ה?(חד[\s-]?פעמי|אימות|זיהוי|אבטחה|סודי)|הקוד\s*נשלח|נשלח\s*(אליך\s*)?(קוד|sms|הודעה)|one[\s-]?time\s*(code|password|passcode)|verification\s*code|security\s*code|sms\s*code|enter\s*the\s*code/i;
async function asksForCode(page) {
  try {
    return await page.evaluate((src) => {
      const re = new RegExp(src[0], src[1]);
      return !!document.querySelector('input[autocomplete="one-time-code"],input[name*="otp" i],input[id*="otp" i]') || re.test((document.body && document.body.innerText) || "");
    }, [OTP_RE.source, OTP_RE.flags]);
  } catch { return false; }
}

// What the browser could not load, for the error message: the bare "Failed to fetch" says nothing about which request was refused. Only the host and path are kept (no query, which can hold tokens).
const shortUrl = (u) => { try { const x = new URL(u); return x.host + x.pathname.slice(0, 60); } catch { return String(u).slice(0, 60); } };
function watchNet(p, log) {
  p.on("requestfailed", (r) => { const t = r.failure() && r.failure().errorText; if (t && !/ERR_ABORTED/.test(t)) log.push(`${shortUrl(r.url())} ${t}`); });
  p.on("console", (m) => { if (m.type() === "error") { const t = String(m.text()).replace(/\s+/g, " ").slice(0, 110); if (!/favicon|Failed to load resource/i.test(t)) log.push("page: " + t); } });
  p.on("pageerror", (e) => log.push("page error: " + String(e.message).slice(0, 110)));
  p.on("response", (r) => { if (r.status() >= 400 && ["xhr", "fetch", "document"].includes(r.request().resourceType())) log.push(`${shortUrl(r.url())} HTTP ${r.status()}`); });
}
const netNote = (log, page) => { const u = [...new Set(log)].slice(-4); let where = ""; try { if (page) where = shortUrl(page.url()); } catch { /* closed */ } return (u.length ? " · refused: " + u.join("; ") : "") + (where ? " · stopped on: " + where : ""); };

async function scrape(company, credentials, startDate, profile) {
  if (assist) throw new Error("A verification window is open. Finish or cancel it first.");
  let page = null, browser = null;
  const net = [];
  try {
    browser = await launch(company, profile);
    const s = createScraper({
      companyId: COMPANIES[company], startDate: new Date(startDate), combineInstallments: false, showBrowser: false,
      timeout: 120000, defaultTimeout: 90000, skipCloseBrowser: true, verbose: false, browser,
      viewportSize: { ...VIEW },
      preparePage: async (p) => { page = p; watchNet(p, net); await look(p); const go = p.goto.bind(p); p.goto = async (...a) => { const r = await go(...a); await settle(p); return r; }; },
    });
    const r = await s.scrape(credentials);
    if (!r.success) throw new Error(`${r.errorType || "error"}: ${r.errorMessage || "login failed"}${netNote(net, page)}`);
    return { success: true, accounts: r.accounts };
  } catch (e) {
    if (page && (await asksForCode(page))) {
      if (DEBUG) { try { await page.screenshot({ path: `/debug/${company}.png` }); } catch {} }
      throw new Error("OTP_REQUIRED: the bank asked for a one-time code. Use \"Verify this device\" once so the bank remembers this browser");
    }
    // where it got stuck (a captcha, a notice, a changed page): kept in memory so the app can show it, never written to disk
    if (page) { try { LASTSHOT.set(profName(company, profile), { at: Date.now(), url: shortUrl(page.url()), buf: await page.screenshot({ type: "jpeg", quality: 60 }) }); } catch {} }
    // opt-in diagnostics: the same screenshot saved to /debug
    if (DEBUG && page) { try { await page.screenshot({ path: `/debug/${company}.png` }); console.log(`debug screenshot: /debug/${company}.png (${page.url().split("?")[0]})`); } catch {} }
    if (e && e.message && net.length && !/refused:/.test(e.message)) e.message += netNote(net, page);
    throw e;
  } finally {
    try { if (browser) await browser.close(); } catch {} // closing writes the profile
  }
}

// ---------- assisted login ----------
async function assistStop() {
  if (!assist) return;
  const a = assist; assist = null; clearTimeout(a.timer);
  try { await a.browser.close(); } catch {}
}
async function assistStart(company, profile) {
  if (busy) throw new Error("A scrape is running");
  await assistStop();
  const browser = await launch(company, profile);
  const page = (await browser.pages())[0] || (await browser.newPage());
  await look(page); await page.setViewport({ ...VIEW });
  const url = process.env.TEST_LOGIN_URL || LOGIN_URL[company];
  // block any page load (this tab, popups, redirects) that leaves the bank's domains; images/scripts the page itself loads are unaffected
  const ok = allowedHosts(company);
  await page.setRequestInterception(true);
  page.on("request", (rq) => { if (rq.isNavigationRequest() && !ok(rq.url())) rq.abort("blockedbyclient").catch(() => {}); else rq.continue().catch(() => {}); });
  browser.on("targetcreated", async (t) => { try { if (t.type() === "page" && t.url() && !ok(t.url())) { const p = await t.page(); if (p) await p.close(); } } catch {} });
  assist = { company, browser, page, timer: setTimeout(assistStop, ASSIST_IDLE_MS) };
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  return { width: VIEW.width, height: VIEW.height };
}
const touch = () => { if (assist) { clearTimeout(assist.timer); assist.timer = setTimeout(assistStop, ASSIST_IDLE_MS); } };
const KEYS = new Set(["Enter", "Tab", "Backspace", "Escape", "ArrowDown", "ArrowUp", "Space"]);

async function readBody(req, max = 20000) {
  let body = "";
  for await (const c of req) { body += c; if (body.length > max) throw Object.assign(new Error("too large"), { code: 413 }); }
  return body ? JSON.parse(body) : {};
}

http.createServer(async (req, res) => {
  const send = (code, body, type) => { res.writeHead(code, { "content-type": type || "application/json", "cache-control": "no-store" }); res.end(type ? body : JSON.stringify(body)); };
  const route = req.url.split("?")[0];
  if (req.method === "GET" && route === "/healthz") return send(200, { ok: true });
  if (!KEY || req.headers["x-scraper-key"] !== KEY) return send(401, { error: "unauthorized" });
  try {
    if (route.startsWith("/assist/")) {
      const act = route.slice(8);
      if (req.method === "GET" && act === "status") {
        const u = assist ? new URL(assist.page.url() || "about:blank", "about:blank") : null;
        return send(200, { active: !!assist, company: assist?.company || null, host: u?.hostname || "", path: u?.pathname || "" });
      }
      if (req.method === "GET" && act === "lastshot") {
        const q = new URL(req.url, "http://x").searchParams, c = q.get("company") || "", sh = LASTSHOT.get(profName(c, q.get("profile") || ""));
        if (!sh) return send(404, { error: "no failed login to show" });
        return send(200, sh.buf, "image/jpeg");
      }
      if (req.method === "GET" && act === "screen") {
        if (!assist) return send(409, { error: "no verification window is open" });
        touch();
        return send(200, await assist.page.screenshot({ type: "jpeg", quality: 60 }), "image/jpeg");
      }
      if (req.method !== "POST") return send(404, { error: "not found" });
      const b = await readBody(req);
      if (act === "start") { if (!COMPANIES[b.company]) return send(400, { error: "unknown company" }); return send(200, { ok: true, ...(await assistStart(b.company, b.profile)) }); }
      if (act === "stop") { await assistStop(); return send(200, { ok: true }); }
      if (act === "forget") { // wipe the remembered device for a bank (used when its credentials are removed)
        if (!COMPANIES[b.company]) return send(400, { error: "unknown company" });
        if (busy || assist) return send(409, { error: "busy" });
        fs.rmSync(path.join(PROFILE_DIR, profName(b.company, b.profile)), { recursive: true, force: true });
        return send(200, { ok: true });
      }
      if (!assist) return send(409, { error: "no verification window is open" });
      touch();
      if (act === "click") { await assist.page.mouse.click(Math.round(+b.x), Math.round(+b.y)); return send(200, { ok: true }); }
      if (act === "type") { await assist.page.keyboard.type(String(b.text || "").slice(0, 200), { delay: 25 }); return send(200, { ok: true }); }
      if (act === "key") { if (!KEYS.has(b.key)) return send(400, { error: "key not allowed" }); await assist.page.keyboard.press(b.key); return send(200, { ok: true }); }
      if (act === "scroll") { await assist.page.mouse.wheel({ deltaY: Math.max(-1500, Math.min(1500, +b.dy || 0)) }); return send(200, { ok: true }); }
      return send(404, { error: "not found" });
    }
    if (req.method !== "POST" || route !== "/scrape") return send(404, { error: "not found" });
    if (busy) return send(429, { error: "another scrape is running" });
    const j = await readBody(req);
    const credentials = j.credentials;
    try {
      if (!COMPANIES[j.company]) return send(400, { error: "unknown company" });
      if (!NEED[j.company].every((k) => typeof credentials?.[k] === "string" && credentials[k])) return send(400, { error: "missing credentials" });
      busy = true;
      send(200, await scrape(j.company, credentials, j.startDate, j.profile));
    } catch (e) { send(500, { success: false, error: scrub(e.message, credentials) }); }
    finally { busy = false; }
  } catch (e) { send(e.code === 413 ? 413 : 500, { error: String(e.message).slice(0, 200) }); }
}).listen(+process.env.PORT || 8080, process.env.HOST || undefined, () => console.log("scraper ready"));
