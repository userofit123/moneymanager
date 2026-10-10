// Wise: balances through the API with a personal token.
//  1. Balance statements (account-statement style, most reliable) are refused for personal tokens in most regions
//     (PSD2: EU, UK and others). If they work for your account they are used.
//  2. Otherwise the Activities endpoint (GET /v1/profiles/{id}/activities) is used: Wise lists personal tokens as accepted
//     for it. It returns what the Wise app shows (transfers, card payments, deposits, fees), as display text.
// The app is read-only: only GET requests are ever sent.
const BASE = process.env.WISE_API || "https://api.wise.com";

async function api(path, token) {
  const r = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw Object.assign(new Error(`Wise ${path.split("?")[0]}: HTTP ${r.status}`), { status: r.status });
  return r.json();
}

const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// "<positive>+ 1,234.50 USD</positive>", "- 12 ILS", "ILS 45.00", "$12.50" ... -> { amount (signed), currency } or null.
// Incoming money is marked positive by Wise; anything not marked positive and without a leading plus is treated as money out.
export function parseActivityAmount(raw) {
  const text = stripTags(raw);
  const cur = text.match(/\b([A-Z]{3})\b/);
  const num = text.match(/\d[\d,]*(?:\.\d+)?/);
  if (!cur || !num) return null;
  const value = parseFloat(num[0].replace(/,/g, ""));
  if (!isFinite(value)) return null;
  const incoming = /<positive>/i.test(String(raw)) || /^\s*\+/.test(text);
  const explicitMinus = /^\s*[-\u2212\u2013]/.test(text);
  return { amount: incoming && !explicitMinus ? value : -value, currency: cur[1] };
}

export function activityToRow(a) {
  if (!a || !a.id || a.status === "CANCELLED") return null;
  const m = parseActivityAmount(a.primaryAmount);
  const date = String(a.createdOn || a.updatedOn || "").slice(0, 10);
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const title = stripTags(a.title) || stripTags(a.description) || "Wise";
  return { date, description: title, amount: m.amount, currency: m.currency, externalId: `act:${a.id}`, counterparty: title, pending: a.status && a.status !== "COMPLETED" };
}

export async function fetchActivities(token, profileId, days = 30) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = []; let skipped = 0, cursor = null;
  for (let page = 0; page < 30; page++) {
    const q = new URLSearchParams({ size: "100", since });
    if (cursor) q.set("nextCursor", cursor);
    const j = await api(`/v1/profiles/${profileId}/activities?${q}`, token);
    for (const a of j.activities || []) { const r = activityToRow(a); r ? rows.push(r) : skipped++; }
    cursor = j.cursor || null;
    if (!cursor || !(j.activities || []).length) break;
  }
  return { rows, skipped };
}

export async function fetchWise(token, { days = 30 } = {}) {
  const profiles = await api("/v2/profiles", token);
  const profile = profiles.find((p) => p.type === "PERSONAL") || profiles[0];
  if (!profile) throw new Error("Wise: no profile on this token");
  const balances = await api(`/v4/profiles/${profile.id}/balances?types=STANDARD`, token);
  const out = { balances: balances.map((b) => ({ currency: b.currency, value: b.amount.value, id: b.id })), transactions: [], note: "" };

  // 1) statements, if this token is allowed to read them
  const end = new Date().toISOString(), start = new Date(Date.now() - days * 864e5).toISOString();
  let statements = true;
  for (const b of out.balances) {
    try {
      const s = await api(`/v1/profiles/${profile.id}/balance-statements/${b.id}/statement.json?currency=${b.currency}&intervalStart=${start}&intervalEnd=${end}&type=COMPACT`, token);
      for (const t of s.transactions || []) {
        out.transactions.push({
          date: t.date.slice(0, 10), description: t.details?.description || t.details?.type || "Wise", amount: t.amount.value,
          currency: t.amount.currency, externalId: t.referenceNumber, counterparty: t.details?.merchant?.name || t.details?.recipient?.name,
        });
      }
    } catch { statements = false; break; }
  }
  if (statements) { out.note = "Statements available"; return out; }
  out.transactions = [];

  // 2) activities
  try {
    const { rows, skipped } = await fetchActivities(token, profile.id, days);
    out.transactions = rows;
    out.note = `Activity list used (statements are not available for personal tokens): ${rows.length} item${rows.length === 1 ? "" : "s"}${skipped ? `, ${skipped} could not be read` : ""}`;
  } catch (e) {
    out.note = `Balances only: statements and activities are not available for this token (${e.status ? "HTTP " + e.status : "error"})`;
  }
  return out;
}
