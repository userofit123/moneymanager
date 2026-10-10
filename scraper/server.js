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

async function scrape(company, credentials, startDate) {
  const s = createScraper({
    companyId: COMPANIES[company], startDate: new Date(startDate), combineInstallments: false, showBrowser: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const r = await s.scrape(credentials);
  if (!r.success) throw new Error(`${r.errorType || "error"}: ${r.errorMessage || "login failed"}`);
  return { success: true, accounts: r.accounts };
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
