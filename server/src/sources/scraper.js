// Bank scrapers run in their own container (see /scraper). Credentials are sent per request over the private
// compose network and are never stored there.
const URL_ = process.env.SCRAPER_URL || "http://scraper:8080";

export async function scrape(company, credentials, days = 30) {
  const r = await fetch(`${URL_}/scrape`, {
    method: "POST", headers: { "content-type": "application/json", "x-scraper-key": process.env.SCRAPER_KEY || "" },
    body: JSON.stringify({ company, credentials, startDate: new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) }),
    signal: AbortSignal.timeout(Math.min(60, 8 + Math.ceil(days / 30) * 0.75) * 60 * 1000), // longer history = longer wait (1 year ≈ 17 min, 5 years ≈ 60 min cap)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(j.error || `scraper HTTP ${r.status}`);
  return j; // { accounts: [{ accountNumber, balance, txns: [{date, description, chargedAmount, identifier, status, category}] }] }
}

// Assisted login: the user drives the scraper's browser from the app (log in, enter the one-time code, tick "remember").
export async function assist(action, body, { raw = false } = {}) {
  const get = action === "screen" || action === "status";
  const r = await fetch(`${URL_}/assist/${action}`, {
    method: get ? "GET" : "POST", headers: { "x-scraper-key": process.env.SCRAPER_KEY || "", ...(get ? {} : { "content-type": "application/json" }) },
    body: get ? undefined : JSON.stringify(body || {}), signal: AbortSignal.timeout(45000),
  });
  if (raw) { if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `scraper HTTP ${r.status}`);
  return j;
}
