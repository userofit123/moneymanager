// The words of one alert (title, text), from the language files. The same sentences as alerts() in web/js/04-transactions.js.
// x: an alert from alertsModel (lib/alerts.js). c: { t, catName, an, dstr, monthYear } for the language to write in.
export function alertTexts(x, c) {
  const { t, catName, an, dstr, monthYear } = c, tk = t;
  const p = { ...x.p }; if (p.k) p.k = catName(p.k); if (p.n && x.key === "card") p.n = an(p.n);
  if ((p.date && /^\d{4}-/.test(String(p.date))) || p.date instanceof Date) p.date = dstr(p.date);
  const T = (k, q) => tk("al." + k + "T", q ?? p), X = (k, q) => tk("al." + k + "X", q ?? p);
  switch (x.key) {
    case "overdue": return [T("overdue"), X("overdue")];
    case "due": return [p.d == 0 ? t("al.dueToday", p) : p.d == 1 ? t("al.dueT1", p) : t("al.dueT", p), X("due")];
    case "price": return [tk(p.up ? "al.priceUp" : "al.priceDown", p), `${p.was} → ${p.amt} (${p.pct})`];
    case "jarAsk": return [t("al.jarAskT"), X("jarAsk")];
    case "large": return [tk(p.inc ? "al.largeIn" : "al.largeOut", p), X("large")];
    case "xfer": return [tk("al.xferT" + (p.n == 1 ? "1" : ""), p), X("xfer")];
    case "dup": return [tk("al.dupT" + (p.n == 1 ? "1" : ""), p), X("dup")];
    case "gapBill": return [T("gapBill"), X("gapBill")];
    case "gap": return [tk(p.down ? "al.gapDown" : "al.gapUp", p), t("al.gapX")];
    case "pending": return [tk("al.pendingT" + (p.c == 1 ? "1" : ""), p), t("al.pendingX")];
    case "syncFail": return [t("al.syncFailT", p), p.msg === "Check the login" ? t("al.syncCheck") : p.msg];
    case "syncOld": return [t("al.syncOldT", p), t("al.syncLast", { when: (p.msg.match(/^Last synced (.*) \(over/) || [])[1] || "" })];
    case "uncat": return [tk("al.uncatT" + (p.n == 1 ? "1" : ""), p), t("al.uncatX")];
    case "forecast": return [t("al.fcT", { when: monthYear(p.when) }), t("al.fcX", p)];
    case "docs": return [t("al.docsT", p), X("docs")];
    default: return [T(x.key), X(x.key)];
  }
}

// The history keeps each alert as the English sentence it had. To show it in another language, the sentence is matched back to
// its template in the English language file and written again with the same numbers and names. A sentence that matches nothing is shown as it is.
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
export function reverseTable(en) {
  const L = [];
  for (const [key, v] of Object.entries(en.al || {})) {
    if (typeof v !== "string" || v.includes(" | ")) continue;
    const names = [], src = v.split(/(\{\w+\})/).map((part) => { const m = /^\{(\w+)\}$/.exec(part); if (m) { names.push(m[1]); return "(.+?)"; } return esc(part); }).join("");
    L.push({ key, names, re: new RegExp("^" + src + "$"), size: v.replace(/\{\w+\}/g, "").length });
  }
  return L.sort((a, b) => b.size - a.size);
}
export function reverseText(table, t, text, c) {
  for (const r of table) {
    const m = r.re.exec(text); if (!m) continue;
    const p = {}; r.names.forEach((n, i) => { p[n] = m[i + 1]; });
    if (p.k) p.k = c.catName(p.k);
    if (p.n && /^card/.test(r.key)) p.n = c.an(p.n);
    if (r.key === "fcT" && p.when) { const d = new Date("1 " + p.when); if (!isNaN(d)) p.when = c.monthYear(d); }
    return { key: r.key, p, text: t("al." + r.key, p) };
  }
  return null;
}
