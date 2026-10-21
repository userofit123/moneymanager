// The alerts the current app works out (alerts() in web/js/04-transactions.js, jarSuggest in 08-jars.js), the same rules, in the same order.
// Each alert is { id, type, sev, key, p, go, ... }: key and p (the numbers and names) fill the English and Hebrew sentences in the language files.
import { forecastSurplus } from "./jars.js";
import { balanceGaps, gapBill, duplicateIds, transferIds, isIgnored, rn } from "./activity.js";
import { addM, rdOf } from "./home.js";

const f = (n) => Math.abs(n).toLocaleString("en-IL", { maximumFractionDigits: 0 });
export const fm = (n) => (n < 0 ? "−" : "") + "₪" + f(n);
const SYM = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
const sym = (c) => SYM[c] || c + " ";
const iso = (d) => d.toISOString().slice(0, 10);
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

// "Paid from a jar?": which open jar earlier, similar payments were attached to.
function jarIndex(S, XS) {
  const store = new Map(), cat = new Map(), catAll = new Map();
  (S.tx || []).forEach((t) => {
    if (t.a >= 0 || t.virtual || XS.has(t.id)) return;
    if (t.c) catAll.set(t.c, (catAll.get(t.c) || 0) + 1);
    if (!t.jar) return;
    const j = t.jar.id, s = rn(t.to || t.desc);
    if (s) { const m = store.get(s) || new Map(); m.set(j, (m.get(j) || 0) + 1); store.set(s, m); }
    if (t.c) { const m = cat.get(t.c) || new Map(); m.set(j, (m.get(j) || 0) + 1); cat.set(t.c, m); }
  });
  return { store, cat, catAll };
}
function jarSuggest(S, X, XS, catJars, jarsS, t) {
  if (t.a >= 0 || t.jar || t.virtual || XS.has(t.id) || isIgnored(S, t) || (t.c && catJars[t.c])) return null;
  const open = new Set(jarsS.map((j) => j.id)), sc = new Map(), add = (id, v) => { if (open.has(id)) sc.set(id, (sc.get(id) || 0) + v); };
  const s = rn(t.to || t.desc); if (s) { const m = X.store.get(s); if (m) m.forEach((n, id) => add(id, 3 + Math.min(n, 3))); }
  if (t.c) { const m = X.cat.get(t.c), all = X.catAll.get(t.c) || 0; if (m) m.forEach((n, id) => { if (n >= 2 && n / all >= 0.4) add(id, 2); }); }
  let best = null, bs = 0; sc.forEach((v, id) => { if (v > bs) { bs = v; best = id; } });
  return bs >= 2 ? jarsS.find((j) => j.id === best) || null : null;
}
const fmtWhen = (t) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// The connections list on Home's sync alerts (SRC in web/js/02-state-data.js).
function sources(S) {
  const DEF = [["Bank Hapoalim", "hapoalim"], ["Max", "max"], ["Isracard", "isracard"], ["Wise", "wise"]];
  const L = Object.keys(S.connStatus || {}).filter((k) => S.connected?.[k]).map((k) => [S.connStatus[k].label || k, k]);
  return (L.length ? L : DEF).map(([n, k]) => {
    const c = (S.connStatus || {})[k] || { key: "none", label: "No credentials", tone: "gray" }, when = c.since ? fmtWhen(c.since) : "never", state = c.tone == "green" ? "ok" : c.tone == "red" ? "bad" : "warn";
    return { n, k, failed: state == "bad", stale: c.key == "stale" ? 3 : 0, t: when, error: c.error, key: c.key };
  });
}

// M: homeModel(...). now: today's date. fc: the Forecast page's choices ({ n, m }). friendly: turns a bank's raw error text into plain words.
export function alertsModel(S, M, now = new Date(), fc = {}, friendly = (e) => e) {
  S = M.S || S; const c = S.cfg || {}, out = [], dism = S.dismissed || {};
  const add = (id, type, sev, key, p, go, x) => { if (c[type] && !dism[id]) out.push({ id, type, sev, key, p: p || {}, go, ...(x || {}) }); };
  const TODAY = ymd(now), MK = TODAY.slice(0, 7), DAYN = now.getDate(), DIM = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const XS = transferIds(S), BC = M.billsAll || [], active = BC.filter((b) => b.flag != "canceled" && !b.ended);
  active.forEach((b) => {
    if (b.status == "overdue") add("ov-" + b.n + b.pd.toISOString().slice(0, 10), "bills", "high", "overdue", { n: b.n, date: b.pd, amt: fm(b.pred), src: b.src }, "bills");
    else if (b.nx && b.days <= c.billDays) add("due-" + b.n + b.nx.toISOString().slice(0, 10), "bills", "med", "due", { n: b.n, d: b.days, amt: fm(b.pred), src: b.src }, "bills");
    if (b.fresh && !b.vari && Math.abs(b.amt - b.was) > b.was * 0.001) add("pr-" + b.n + b.amt, "price", "low", "price", { n: b.n, up: b.amt > b.was ? 1 : 0, was: fm(b.was), amt: fm(b.amt), pct: (b.amt > b.was ? "+" : "") + ((b.amt / b.was - 1) * 100).toFixed(0) + "%" }, "bills");
  });
  // jars
  const jarsS = (S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p), catJars = {};
  jarsS.forEach((j) => (j.cats || []).forEach((x) => { if (!catJars[x.c]) catJars[x.c] = { j, since: x.since }; }));
  { const lim = iso(new Date(now.getTime() - 45 * 864e5)), X = jarIndex(S, XS), name = M.nameOf;
    (S.tx || []).forEach((t) => { if (t.d < lim || t.virtual) return; const j = jarSuggest(S, X, XS, catJars, jarsS, t); if (j) add("jar-" + t.id + "-" + j.id, "jars", "med", "jarAsk", { name: name(t), amt: fm(Math.abs(t.a)), jar: j.n }, "tx", { attach: t.id }); }); }
  // budgets
  M.budgets.forEach((b) => {
    if (b.st == "over") add("bo-" + b.k + MK, "budget", "high", "budOver", { k: b.k, s: fm(b.s), lim: fm(b.lim) }, "budg");
    else if (b.st == "warn") add("bw-" + b.k + MK, "budget", "med", "budWarn", { k: b.k, pc: Math.round(b.pc), left: fm(b.left), days: Math.max(1, DIM - DAYN) }, "budg");
    else if (b.st == "pace") add("bp-" + b.k + MK, "budget", "low", "budPace", { k: b.k, pace: fm(b.pace), lim: fm(b.lim) }, "budg");
  });
  { const seen = new Set(); Object.values(catJars).forEach(({ j }) => { if (seen.has(j.id)) return; seen.add(j.id); const mine = Object.keys(catJars).filter((k) => catJars[k].j.id == j.id);
    if (j.bal < 1 && (S.tx || []).some((t) => t.jarNo && t.jarNo === t.c && catJars[t.c] && catJars[t.c].j.id == j.id && t.d.startsWith(MK))) add("je-" + j.id + MK, "jars", "med", "jarOut", { j: j.n, cats: mine.join(", ") }, "jars"); }); }
  // cards
  M.cards.forEach((cd) => { const u = cd.now, l = cd.last; if (l > 0 && u > l * (1 + c.cardPct / 100)) add("cd-" + cd.n + MK, "card", "med", "card", { n: cd.n, pct: Math.round((u / l - 1) * 100), u: fm(u), l: fm(l) }, "dash"); });
  // large amounts
  M.rows.filter((t) => Math.abs(t.a) >= c.largeAmt && (now - new Date(t.d)) / 864e5 <= 7 && !t.virtual).forEach((t) => add("lg-" + t.id, "large", "low", "large", { inc: t.a > 0 ? 1 : 0, name: M.nameOf(t), amt: fm(t.a), date: t.d, lim: fm(c.largeAmt) }, "tx", { ids: [t.id] }));
  const xs = (S.xf || []).filter((x) => x.st == "auto").length; if (xs) add("xf-" + xs, "xfer", "med", "xfer", { n: xs }, "tx", { tab: "rev" });
  const dups = duplicateIds(S); if (dups.size) add("dp-" + dups.size, "xfer", "med", "dup", { n: dups.size }, "tx", { ids: [...dups] });
  // balance gaps
  balanceGaps(S).forEach((r) => {
    const old = (now - new Date(r.from)) / 864e5 >= c.gapDays, gb = gapBill(r, BC), amt = sym(r.cur) + f(Math.abs(r.diff));
    if (gb) { add("rc-" + r.id + "-" + r.diff, "recon", "low", "gapBill", { n: r.n, amt, bill: gb.n, bamt: fm(gb.pred), date: gb.pd }, "tx", { tab: "rev" }); return; }
    add("rc-" + r.id + "-" + r.diff, "recon", old ? "high" : "med", "gap", { n: r.n, down: r.diff < 0 ? 1 : 0, amt }, "tx", { tab: "rev" });
  });
  { const pg = {}; (S.tx || []).forEach((t) => { if (t.pending && !t.virtual && t.a < 0 && !XS.has(t.id)) (pg[t.from] = pg[t.from] || []).push(t); });
    Object.entries(pg).forEach(([n, L]) => { const tot = L.reduce((x, t) => x - t.a, 0); add("pd-" + n + "-" + L.length + "-" + Math.round(tot), "pending", "low", "pending", { n, c: L.length, tot: fm(tot) }, "tx", { ids: L.map((t) => t.id) }); }); }
  sources(S).filter((s) => s.failed || s.stale > 2).forEach((s) => add("sy-" + s.n + (s.t || ""), "sync", "low", s.failed ? "syncFail" : "syncOld", { n: s.n, d: Math.floor(s.stale), msg: s.failed ? friendly(s.error) || "Check the login" : s.key == "stale" ? "Last synced " + s.t + " (over 2 days ago)" : "" }, "set"));
  { const un = (S.tx || []).filter((t) => !t.c && !XS.has(t.id)); if (un.length) add("un-" + un.length, "uncat", "low", "uncat", { n: un.length }, "tx", { ids: un.map((t) => t.id) }); }
  try {
    const sur = forecastSurplus(S, M, now, fc); let b = M.flow.cash, k = -1;
    for (let i = 1; i <= 12; i++) { b += sur(i); if (b < 0) { k = i; break; } }
    if (k > 0) add("fc-" + MK, "forecast", "high", "forecast", { when: addM(MK, k), n: [3, 6, 12].includes(+fc.n) ? +fc.n : 6 }, "fc");
  } catch { /* no forecast */ }
  M.rows.filter((t) => t.a > 0 && !(t.docs || []).length && !t.virtual).forEach((t) => add("dc-" + t.id, "docs", "low", "docs", { name: M.nameOf(t), amt: fm(t.a) }, "tx", { ids: [t.id] }));
  return out.sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] - { high: 0, med: 1, low: 2 }[b.sev]));
}
