// Everything for one Taxes and reports period in one zip file: summary.csv (for a spreadsheet), summary.html (to read or
// print) and every file attached to the period's transactions in a "files" folder. The numbers are the period's report
// (lib/taxReports.js periodReport) as the page shows them. Here: the names and the two summaries; the page fetches the
// files and lib/zip.js writes the zip.
import { csvText, nohtml } from "./csv.js";

// A name that is safe for a file on every system: no \ / : * ? " < > | or control characters, no dot at the start.
export const safeName = (s, max = 60) => String(s == null ? "" : s).replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, max).trim(); // eslint-disable-line no-control-regex -- control characters are not allowed in file names

// The months of a period as the zip's name writes them: "2026" (a whole year), "2026-09", "2026-09–10", "2026-12–2027-03".
export function periodTag(P) {
  const s = P.start, e = P.end;
  if (s.slice(5) == "01-01" && e.slice(5) == "12-31" && s.slice(0, 4) == e.slice(0, 4)) return s.slice(0, 4);
  if (s.slice(0, 7) == e.slice(0, 7)) return s.slice(0, 7);
  return s.slice(0, 4) == e.slice(0, 4) ? s.slice(0, 7) + "–" + e.slice(5, 7) : s.slice(0, 7) + "–" + e.slice(0, 7);
}

const extOf = (n) => (/\.[a-z0-9]{1,5}$/i.exec(String(n || "")) || [""])[0].toLowerCase();
// Bidi marks that keep numbers in order on the Hebrew screen; a spreadsheet cell does not need them.
const plain = (v) => (typeof v == "string" ? v.replace(/[⁦-⁩‎‏؜]/g, "") : v);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The zip's name, the files to fetch ({ id, path }) and the two summaries.
// o: { name, report, W (the words, in the app's language), lang, cat(c) → category name, money(n) → "₪1,234", day(d) → date }
export function taxZipPlan(o) {
  const { name, report: R, W, cat, money, day, lang } = o, P = R.period;
  const rows = [...R.rows.in, ...R.rows.out].sort((a, b) => String(a.d).localeCompare(String(b.d)) || String(a.id).localeCompare(String(b.id)));
  const missing = new Map(R.missing.map((m) => [m.t.id, m]));
  // each attached file once, named after its transaction: "files/2026-09-14 Logo design.pdf", "… (2).pdf" when taken
  const used = new Set(), fetch = [], docsOf = new Map();
  for (const t of rows) {
    const L = [];
    (t.docs || []).forEach((dn, i) => {
      const id = t.docIds?.[i], has = t.docHas ? t.docHas[i] !== false : true;
      if (!id || !has) { L.push(dn + " (" + W.notHere + ")"); return; }
      const base = "files/" + (safeName(t.d + " " + nohtml(t.desc), 60) || t.d), ext = extOf(dn);
      let path = base + ext;
      for (let k = 2; used.has(path.toLowerCase()); k++) path = base + " (" + k + ")" + ext;
      used.add(path.toLowerCase()); fetch.push({ id, path }); L.push(path);
    });
    docsOf.set(t.id, L);
  }
  const amt = R.amount == null ? null : { n: Math.abs(R.amount), back: R.amount < 0 };
  // [title, number]: the same whole numbers as the page
  const totals = [[W.in, R.totals.in], [W.out, R.totals.out]];
  if (amt) totals.push([amt.back ? W.back : W.amt, amt.n]);
  if (R.vat) totals.push([W.vatIn, R.vat.in], [W.vatOut, R.vat.out]);
  const tags = (t) => (t.tags || []).join(" "), need = (t) => (missing.has(t.id) ? W.need[missing.get(t.id).need] : "");
  const tx = rows.map((t) => [t.d, nohtml(t.desc), nohtml(t.from), nohtml(t.to), cat(t.c), tags(t), t.a, docsOf.get(t.id).join("; "), need(t)]);
  const head = [W.c.date, W.c.desc, W.c.from, W.c.to, W.c.cat, W.c.tags, W.c.amount, W.c.docs, W.papers];

  const csvRows = [[name, W.span], [W.last], [], ...totals, [], head, ...tx, [], [W.papers]];
  if (R.missing.length) for (const m of R.missing) csvRows.push([m.t.d, nohtml(m.t.desc), m.t.a, W.need[m.need], m.note]);
  else csvRows.push([W.papersNone]);
  csvRows.push([], [W.note]);
  const csv = csvText(csvRows.map((r) => r.map(plain)));

  const rtl = lang == "he", arrow = rtl ? " ← " : " → ", num = (n) => `<td class="n"><bdi>${esc(money(n))}</bdi></td>`;
  const html = `<!doctype html>
<html lang="${rtl ? "he" : "en"}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name + " · " + W.span)}</title>
<style>
body{font:14px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#1d1d1f;background:#fff;margin:32px auto;max-width:960px;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}.sm{color:#5f6368;margin:0}
table{border-collapse:collapse;width:100%}th,td{text-align:start;padding:6px 8px;border-bottom:1px solid #e3e3e6;vertical-align:top}
th{font-weight:600;color:#5f6368;font-size:12px}td.n{text-align:end;white-space:nowrap}.tot{width:auto;min-width:280px;margin-top:16px}.tot td:first-child{padding-inline-start:0}
.miss{color:#b3261e}ul{padding-inline-start:20px;margin:0}@media print{body{margin:0}}
</style></head><body>
<h1>${esc(name)}</h1>
<p class="sm">${esc(W.span)} · ${esc(W.last)}</p>
<p class="sm">${esc(W.made)}</p>
<table class="tot">${totals.map(([k, v]) => `<tr><td>${esc(k)}</td>${num(v)}</tr>`).join("")}${amt ? "" : `<tr><td>${esc(W.amt)}</td><td class="n">${esc(W.noAmt)}</td></tr>`}</table>
<h2>${esc(W.papers)}</h2>
${R.missing.length ? `<ul>${R.missing.map((m) => `<li>${esc(day(m.t.d))} · ${esc(nohtml(m.t.desc))} · <bdi>${esc(money(m.t.a))}</bdi> · <span class="miss">${esc(W.need[m.need])}</span>${m.note ? " · " + esc(m.note) : ""}</li>`).join("")}</ul>` : `<p class="sm">${esc(W.papersNone)}</p>`}
<h2>${esc(W.tx)}</h2>
${rows.length ? `<table><thead><tr>${[W.c.date, W.c.desc, W.c.from + arrow + W.c.to, W.c.cat, W.c.tags].map((h) => `<th>${esc(h)}</th>`).join("")}<th style="text-align:end">${esc(W.c.amount)}</th><th>${esc(W.c.docs)}</th></tr></thead><tbody>
${rows.map((t) => `<tr><td style="white-space:nowrap">${esc(day(t.d))}</td><td>${esc(nohtml(t.desc))}${need(t) ? `<br><span class="miss">${esc(need(t))}</span>` : ""}</td><td>${esc(nohtml(t.from))}${arrow}${esc(nohtml(t.to))}</td><td>${esc(cat(t.c))}</td><td>${esc(tags(t))}</td>${num(t.a)}<td>${docsOf.get(t.id).map((x) => `<bdi>${esc(x)}</bdi>`).join("<br>")}</td></tr>`).join("\n")}
</tbody></table>` : `<p class="sm">${esc(W.txNone)}</p>`}
<p class="sm" style="margin-top:28px">${esc(W.note)}</p>
</body></html>
`;
  return { zipName: (safeName(name + " " + periodTag(P), 100) || "report") + ".zip", fetch, csv, html };
}
