// Bank scrapers run in their own container (see /scraper). Credentials are sent per request over the private
// compose network and are never stored there.
const URL_ = process.env.SCRAPER_URL || "http://scraper:8080";

export async function scrape(company, credentials, days = 30) {
  const r = await fetch(`${URL_}/scrape`, {
    method: "POST", headers: { "content-type": "application/json", "x-scraper-key": process.env.SCRAPER_KEY || "" },
    body: JSON.stringify({ company, credentials, startDate: new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) }),
    signal: AbortSignal.timeout(5 * 60 * 1000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(j.error || `scraper HTTP ${r.status}`);
  return j; // { accounts: [{ accountNumber, balance, txns: [{date, description, chargedAmount, identifier, status, category}] }] }
}
