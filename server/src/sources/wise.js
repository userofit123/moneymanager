// Wise: balances through the API with a personal token. Statements are refused for personal tokens, so that part reports clearly.
const BASE = process.env.WISE_API || "https://api.wise.com";

async function api(path, token) {
  const r = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw Object.assign(new Error(`Wise ${path}: HTTP ${r.status}`), { status: r.status });
  return r.json();
}

export async function fetchWise(token) {
  const profiles = await api("/v2/profiles", token);
  const profile = profiles.find((p) => p.type === "PERSONAL") || profiles[0];
  if (!profile) throw new Error("Wise: no profile on this token");
  const balances = await api(`/v4/profiles/${profile.id}/balances?types=STANDARD`, token);
  const out = { balances: balances.map((b) => ({ currency: b.currency, value: b.amount.value, id: b.id })), transactions: [], note: "" };
  // Try statements for the last 30 days. Personal tokens are normally refused (needs strong customer authentication).
  const end = new Date().toISOString(), start = new Date(Date.now() - 30 * 864e5).toISOString();
  for (const b of out.balances) {
    try {
      const s = await api(`/v1/profiles/${profile.id}/balance-statements/${b.id}/statement.json?currency=${b.currency}&intervalStart=${start}&intervalEnd=${end}&type=COMPACT`, token);
      for (const t of s.transactions || []) {
        out.transactions.push({
          date: t.date.slice(0, 10), description: t.details?.description || t.details?.type || "Wise", amount: t.amount.value,
          currency: t.amount.currency, externalId: t.referenceNumber, counterparty: t.details?.merchant?.name || t.details?.recipient?.name,
        });
      }
    } catch (e) {
      out.note = "Balances only · statements are not available for personal tokens";
      break;
    }
  }
  return out;
}
