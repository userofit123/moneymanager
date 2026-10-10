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
