// Read-only bank scraper service. Credentials come from a mounted file (permissions 600) and are never logged.
// POST /scrape { company: "hapoalim" | "max" | "isracard", startDate: "YYYY-MM-DD" }
// A failed login is NOT retried automatically, so an account is never locked by a retry loop.
import http from "node:http";
import fs from "node:fs";
import { createScraper, CompanyTypes } from "israeli-bank-scrapers";

const KEY = process.env.SCRAPER_KEY || "";
const COMPANIES = { hapoalim: CompanyTypes.hapoalim, max: CompanyTypes.max, isracard: CompanyTypes.isracard };
let busy = false;

function credentials(company) {
  const all = JSON.parse(fs.readFileSync(process.env.CREDENTIALS_FILE, "utf8"));
  if (!all[company]) throw new Error(`no credentials configured for ${company}`);
  return all[company];
}

async function scrape(company, startDate) {
  const s = createScraper({
    companyId: COMPANIES[company], startDate: new Date(startDate), combineInstallments: false, showBrowser: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const r = await s.scrape(credentials(company));
  if (!r.success) throw new Error(`${r.errorType || "error"}: ${r.errorMessage || "login failed"}`.slice(0, 200));
  return { success: true, accounts: r.accounts };
}

http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "GET" && req.url === "/healthz") return send(200, { ok: true });
  if (req.method !== "POST" || req.url !== "/scrape") return send(404, { error: "not found" });
  if (!KEY || req.headers["x-scraper-key"] !== KEY) return send(401, { error: "unauthorized" });
  if (busy) return send(429, { error: "another scrape is running" });
  let body = ""; for await (const c of req) body += c;
  try {
    const { company, startDate } = JSON.parse(body);
    if (!COMPANIES[company]) return send(400, { error: "unknown company" });
    busy = true;
    send(200, await scrape(company, startDate));
  } catch (e) { send(500, { success: false, error: String(e.message).slice(0, 200) }); }
  finally { busy = false; }
}).listen(8080, () => console.log("scraper ready"));
