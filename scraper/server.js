// Read-only bank scraper service. The app sends the credentials with each request over the private compose network;
// they are used for that one login, kept only in memory, and never logged or written to disk.
// POST /scrape { company: "hapoalim" | "max" | "isracard", credentials: {...}, startDate: "YYYY-MM-DD" }
// A failed login is NOT retried here, so an account is never locked by a retry loop.
import http from "node:http";
import { createScraper, CompanyTypes } from "israeli-bank-scrapers";

const KEY = process.env.SCRAPER_KEY || "";
const COMPANIES = { hapoalim: CompanyTypes.hapoalim, max: CompanyTypes.max, isracard: CompanyTypes.isracard };
const NEED = { hapoalim: ["userCode", "password"], max: ["username", "password"], isracard: ["id", "card6Digits", "password"] };
let busy = false;

const scrub = (msg, creds) => Object.values(creds || {}).reduce((m, v) => (v && String(v).length >= 3 ? m.split(String(v)).join("***") : m), String(msg)).slice(0, 200);

const DEBUG = process.env.SCRAPER_DEBUG === "1";
const UA = process.env.SCRAPER_UA || "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

async function scrape(company, credentials, startDate) {
  let page = null;
  const s = createScraper({
    companyId: COMPANIES[company], startDate: new Date(startDate), combineInstallments: false, showBrowser: false,
    timeout: 120000, defaultTimeout: 90000, skipCloseBrowser: true, verbose: false,
    viewportSize: { width: 1366, height: 900 },
    args: [
      "--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled", "--window-size=1366,900", "--lang=he-IL,he,en-US",
      // no background phone-home from the browser (updates, sync, metrics, safe-browsing pings)
      "--disable-background-networking", "--disable-component-update", "--disable-sync", "--no-pings", "--metrics-recording-only",
      "--disable-features=OptimizationHints,Translate,MediaRouter,InterestFeedContentSuggestions",
      // strict mode: the browser may only go out through the allowlist proxy
      ...(process.env.SCRAPER_PROXY ? [`--proxy-server=${process.env.SCRAPER_PROXY}`] : []),
    ],
    // look like an ordinary desktop browser: banks often stall headless-looking sessions
    preparePage: async (p) => {
      page = p;
      await p.setUserAgent(UA);
      await p.setExtraHTTPHeaders({ "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7" });
      await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); });
    },
  });
  try {
    const r = await s.scrape(credentials);
    if (!r.success) throw new Error(`${r.errorType || "error"}: ${r.errorMessage || "login failed"}`);
    return { success: true, accounts: r.accounts };
  } catch (e) {
    if (page && (await asksForCode(page))) {
      const err = new Error("OTP_REQUIRED: the bank asked for a one-time code, which this scraper cannot enter");
      if (DEBUG) { try { await page.screenshot({ path: `/debug/${company}.png` }); } catch {} }
      throw err;
    }
    // opt-in diagnostics: a screenshot of where it got stuck (a captcha, a notice, a changed page). No credentials are typed into it after login.
    if (DEBUG && page) { try { await page.screenshot({ path: `/debug/${company}.png` }); console.log(`debug screenshot: /debug/${company}.png (${page.url().split("?")[0]})`); } catch {} }
    throw e;
  } finally {
    try { if (page) await page.browser().close(); } catch {}
  }
}

http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "GET" && req.url === "/healthz") return send(200, { ok: true });
  if (req.method !== "POST" || req.url !== "/scrape") return send(404, { error: "not found" });
  if (!KEY || req.headers["x-scraper-key"] !== KEY) return send(401, { error: "unauthorized" });
  if (busy) return send(429, { error: "another scrape is running" });
  let body = "";
  for await (const c of req) { body += c; if (body.length > 20000) return send(413, { error: "too large" }); }
  let credentials;
  try {
    const j = JSON.parse(body);
    credentials = j.credentials;
    if (!COMPANIES[j.company]) return send(400, { error: "unknown company" });
    if (!NEED[j.company].every((k) => typeof credentials?.[k] === "string" && credentials[k])) return send(400, { error: "missing credentials" });
    busy = true;
    send(200, await scrape(j.company, credentials, j.startDate));
  } catch (e) { send(500, { success: false, error: scrub(e.message, credentials) }); }
  finally { busy = false; }
}).listen(8080, () => console.log("scraper ready"));
