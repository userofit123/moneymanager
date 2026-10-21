// The export: what goes in the file and how it is written (CSV or JSON).
// The file's column names and words are always English (a file leaves the app and is read by other programs).
import { kinds, rdOf, rangeOf } from "./activity.js";
import { costRows } from "./txrows.js";

const nohtml = (s) => String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
export const EXWHAT = ["tx", "cat", "bills", "budgets", "jars", "accounts", "audit", "all"];
// [key, file column name, value]
export const exCols = (K) => [["date", "Date", (t) => t.d], ["desc", "Description", (t) => nohtml(t.desc)], ["from", "From", (t) => nohtml(t.from)], ["to", "To", (t) => nohtml(t.to)], ["amount", "Amount (₪)", (t) => t.a], ["ocur", "Original currency", (t) => (t.orig ? t.orig.cur : "")], ["oamt", "Original amount", (t) => (t.orig ? t.orig.amt : "")], ["cat", "Category", (t) => t.c || (K.isXf(t) ? "Transfer" : "Uncategorized")], ["tags", "Tags", (t) => (t.tags || []).join(" ")], ["note", "Note", (t) => t.note || ""], ["docs", "Attachments", (t) => (t.docs || []).join("; ")], ["src", "Source", (t) => t.src || ""], ["id", "ID", (t) => t.id]];
export const COLKEYS = exCols({ isXf: () => false }).map((c) => c[0]);
export const exDef = () => ({ what: "tx", p: "all", from: "", to: "", cats: null, accts: null, ty: "all", q: "", tag: "", xf: false, cp: false, fut: false, fmt: "csv", cols: ["date", "desc", "from", "to", "amount", "cat", "tags", "note"], name: "" });
// Starting from Activity's filters (buildExport with from="activity").
export function exFromActivity(f) {
  const E = exDef();
  E.p = f.p; E.from = f.from; E.to = f.to; E.q = f.q || "";
  if (f.src) E.accts = new Set([f.src]);
  if (f.cat) E.cats = new Set([f.cat]);
  if (f.tag) E.tag = f.tag;
  if (f.type == "income" || f.type == "expense") E.ty = f.type;
  if (f.type == "transfer" || f.type == "cardpay") { E.xf = f.type == "transfer"; E.cp = f.type == "cardpay"; }
  return E;
}
const exCat = (t) => t.c || "Uncategorized";
export function exTx(S, E, today, now) {
  const K = kinds(S, today), [a, b] = rangeOf(E.p, now, "sun", E.from, E.to), q = E.q.toLowerCase(), tg = E.tag.toLowerCase().replace(/^#/, "");
  return (S.tx || []).concat(costRows(S)).filter((t) => rdOf(t) >= a && rdOf(t) <= b && (E.xf || (!K.isXf(t) && !K.isIgn(t))) && (E.cp || !K.isCp(t)) && (E.fut || !K.isFut(t)) && (E.ty == "all" || (E.ty == "income") == (t.a > 0)) && (!E.cats || E.cats.has(exCat(t))) && (!E.accts || E.accts.has(t.from) || E.accts.has(t.to)) && (!q || (t.desc + " " + t.from + " " + t.to + " " + (t.note || "")).toLowerCase().includes(q)) && (!tg || (t.tags || []).some((x) => x.toLowerCase() == tg)))
    .sort((x, y) => y.d.localeCompare(x.d) || String(y.id).localeCompare(String(x.id)));
}
// { head, rows, n } for a table, or { all: true } for everything as JSON. L: the transactions (for the preview's In and Out).
export function exData(S, E, today, now) {
  const w = E.what, K = kinds(S, today);
  if (w == "tx") { const cols = exCols(K).filter((c) => E.cols.includes(c[0])), L = exTx(S, E, today, now); return { head: cols.map((c) => c[1]), rows: L.map((t) => cols.map((c) => c[2](t))), n: L.length, L }; }
  if (w == "cat") {
    const L = exTx(S, E, today, now).filter((t) => !K.isXf(t)), ms = [...new Set(L.map((t) => rdOf(t).slice(0, 7)))].sort(), M = {};
    L.forEach((t) => { const k = (t.a > 0 ? "Income" : "Expense") + "|" + exCat(t), r = (M[k] = M[k] || {}); r[rdOf(t).slice(0, 7)] = (r[rdOf(t).slice(0, 7)] || 0) + t.a; });
    const rows = Object.entries(M).map(([k, r]) => { const [ty, c] = k.split("|"); return [c, ty, ...ms.map((m) => +(r[m] || 0).toFixed(2)), +ms.reduce((s, m) => s + (r[m] || 0), 0).toFixed(2)]; }).sort((x, y) => x[1].localeCompare(y[1]) || Math.abs(y[y.length - 1]) - Math.abs(x[x.length - 1]));
    return { head: ["Category", "Type", ...ms, "Total (₪)"], rows, n: rows.length };
  }
  if (w == "bills") { const B = S.bills || [], keys = [...new Set(B.flatMap((b) => Object.keys(b).filter((k) => ["string", "number", "boolean"].includes(typeof b[k]))))]; return { head: keys, rows: B.map((b) => keys.map((k) => (b[k] == null ? "" : b[k]))), n: B.length }; }
  if (w == "budgets") { const rows = Object.entries(S.budgets || {}).map(([k, v]) => [k, v]); return { head: ["Category", "Monthly limit (₪)"], rows, n: rows.length }; }
  if (w == "jars") { const rows = (S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p).map((j) => [j.n, j.need, j.bal, j.cap == null ? "refill to target" : j.cap, j.due || "", j.p]); return { head: ["Jar", "Target (₪)", "Saved (₪)", "Per month (₪)", "Deadline", "Priority"], rows, n: rows.length }; }
  if (w == "accounts") { const rows = (S.accounts || []).map((a) => [a.n, a.cur, a.kind, a.v, a.at || ""]); return { head: ["Account", "Currency", "Kind", "Balance", "As of"], rows, n: rows.length }; }
  if (w == "audit") { const rows = (S.audit || []).map((a) => [a.t, a.who || "", a.action, a.detail || ""]); return { head: ["When", "Who", "Action", "Detail"], rows, n: rows.length }; }
  return { head: [], rows: [], n: 1, all: true };
}
// CSV with a byte-order mark so Excel reads Hebrew; a leading ' stops spreadsheets from running text as a formula.
export const exCsv = (head, rows) => { const cell = (v) => { let s = v == null ? "" : String(v); if (typeof v == "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"); };
export const exExt = (E) => (E.what == "all" || E.fmt == "json" ? ".json" : ".csv");
export const exFile = (E, today) => `money-${E.what}-${today}`;
// The file's name and contents. S: the whole data (for "everything").
export function exBuild(S, E, d, today) {
  const base = (E.name || "").trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\.(csv|json)$/i, "").slice(0, 80) || exFile(E, today);
  if (d.all || E.fmt == "json") { const o = d.all ? S : d.rows.map((r) => Object.fromEntries(d.head.map((h, i) => [h, r[i]]))); return { body: JSON.stringify(o, null, 1), mime: "application/json", name: base + ".json" }; }
  return { body: exCsv(d.head, d.rows), mime: "text/csv;charset=utf-8", name: base + ".csv" };
}
