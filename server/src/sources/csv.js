// CSV import: the Wise statement export, and a generic file (date, description, amount, currency).
export function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

function toIso(s) { // 25-12-2026, 25/12/2026, 2026-12-25 (with optional time)
  s = String(s).trim().split(" ")[0];
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  throw new Error("Unrecognised date: " + s);
}

export function parseWiseCsv(text) {
  const [head, ...body] = parseCsv(text);
  const ix = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
  for (const need of ["date", "amount", "currency", "description"]) if (!(need in ix)) throw new Error(`CSV is missing the "${need}" column`);
  return body.map((r) => ({
    date: toIso(r[ix["date"]]),
    description: r[ix["description"]] || r[ix["payment reference"]] || "Wise",
    amount: parseFloat(r[ix["amount"]]),
    currency: r[ix["currency"]],
    externalId: ix["transferwise id"] != null ? r[ix["transferwise id"]] : undefined,
    counterparty: r[ix["merchant"]] || (parseFloat(r[ix["amount"]]) < 0 ? r[ix["payee name"]] : r[ix["payer name"]]) || undefined,
  })).filter((x) => !isNaN(x.amount));
}

// ---------- generic bank / card export (Hapoalim, Max, Isracard CSV) ----------
const norm = (h) => String(h).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const H = {
  date: ["date", "transaction date", "purchase date", "תאריך", "תאריך עסקה", "תאריך רכישה", "תאריך ערך"],
  desc: ["description", "business", "merchant", "details", "שם בית עסק", "תיאור", "תיאור הפעולה", "פירוט", "פרטים", "שם בית העסק"],
  amount: ["amount", "charge amount", "סכום", "סכום חיוב", "סכום עסקה", "סכום בשקלים"],
  debit: ["debit", "חובה", "בחובה"],
  credit: ["credit", "זכות", "בזכות"],
  ref: ["reference", "reference number", "אסמכתא", "מספר אסמכתא"],
};
const pickCol = (ix, names) => names.map(norm).map((n) => ix[n]).find((i) => i != null);

function toNumber(v) {
  if (v == null || v === "") return NaN;
  let s = String(v).trim().replace(/[₪$€\s]/g, "");
  const neg = /^\(.*\)$/.test(s) || s.endsWith("-");
  s = s.replace(/[()]/g, "").replace(/-$/, "");
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return neg ? -Math.abs(n) : n;
}

/** positiveIsExpense: card exports list charges as positive numbers. */
export function parseBankCsv(text, { positiveIsExpense = false } = {}) {
  const table = parseCsv(text);
  let hi = table.findIndex((r) => r.map(norm).some((c) => H.date.map(norm).includes(c)) && r.map(norm).some((c) => [...H.amount, ...H.debit, ...H.credit].map(norm).includes(c)));
  if (hi < 0) throw new Error("Could not find the header row. Expected columns like date, description and amount.");
  const ix = Object.fromEntries(table[hi].map((h, i) => [norm(h), i]));
  const cDate = pickCol(ix, H.date), cDesc = pickCol(ix, H.desc), cAmt = pickCol(ix, H.amount), cDeb = pickCol(ix, H.debit), cCre = pickCol(ix, H.credit), cRef = pickCol(ix, H.ref);
  if (cDesc == null) throw new Error("No description column found.");
  const rows = [];
  for (const r of table.slice(hi + 1)) {
    let amount;
    if (cAmt != null) { amount = toNumber(r[cAmt]); if (positiveIsExpense) amount = -amount; }
    else { const d = toNumber(r[cDeb]), c = toNumber(r[cCre]); amount = (isNaN(c) ? 0 : c) - (isNaN(d) ? 0 : d); if (isNaN(d) && isNaN(c)) amount = NaN; }
    if (isNaN(amount) || amount === 0 || !r[cDate]) continue;
    let date; try { date = toIso(r[cDate]); } catch { continue; }
    rows.push({ date, description: String(r[cDesc] || "").trim() || "Transaction", amount, externalId: cRef != null && r[cRef] ? `ref:${r[cRef]}:${date}:${amount}` : undefined });
  }
  return rows;
}
