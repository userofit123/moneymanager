// Bills: found and predicted from the payments. Shared bill logic, a port of the current app
// (web/js/03-bills-home.js billsInfo, web/js/04-transactions.js renderBills, web/js/08-jars.js bill actions).
// Nothing here touches the screen. Bills the app finds by itself are only worked out; they are saved
// the first time a change is made (withDetected), like the current app saves them when it draws a page.
import { kinds, instOf } from "../views/activity.js";

const p2 = (n) => String(n).padStart(2, "0");
const sum = (a) => a.reduce((t, x) => t + x, 0);
export const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const f0 = (n) => Math.abs(n).toLocaleString("en-IL", { maximumFractionDigits: 0 });
export const fm = (n) => (n < 0 ? "−" : "") + "₪" + f0(n);
const byDate = (a, b) => a.d.localeCompare(b.d);

// How often does this store charge you? Returns null when there is no regular rhythm.
export function cadenceOf(L) {
  if (L.length < 2) return null;
  const gaps = L.slice(1).map((t, i) => (new Date(t.d) - new Date(L[i].d)) / 864e5), md = med(gaps), every = md >= 26 && md <= 35 ? 1 : md >= 55 && md <= 68 ? 2 : md >= 355 && md <= 375 ? 12 : 0;
  if (!every) return null;
  if (every < 12 && L.length < 3) return null;
  const tol = every == 12 ? 15 : 6;
  if (gaps.filter((x) => Math.abs(x - md) <= tol).length < gaps.length * 0.75) return null;
  const am = L.map((t) => -t.a), mean = sum(am) / am.length;
  if (Math.max(...am.map((x) => Math.abs(x - mean))) / mean > 0.25) return null;
  const last = L[L.length - 1];
  return { every, anchor: +last.d.slice(5, 7), dom: +last.d.slice(8, 10), mean };
}

// The payments that count (no transfers, card payments, future or left-out ones), plus the cost of moving money. Like A() in the current app.
export function countedTx(S, today) {
  const k = kinds(S, today), tx = S.tx || [];
  const NR = new Set((S.accounts || []).filter((a) => a.inR === false).map((a) => a.n));
  const noRep = (t) => NR.size > 0 && (NR.has(t.from) || NR.has(t.to));
  const byId = new Map(tx.map((t) => [t.id, t]));
  const costRows = (S.xf || []).filter((x) => x.st != "rej").map((x) => {
    const o = byId.get(x.o), i = byId.get(x.i); if (!o || !i) return null; const c = -o.a - i.a;
    return c > 0.5 ? { id: "v" + x.o, virtual: true, d: o.d, desc: "Transfer cost · " + o.from + " → " + i.to, from: o.from, to: "Transfer fees / FX spread", a: -c, c: "Fees & FX costs" } : null;
  }).filter(Boolean);
  const A = tx.filter((t) => !k.isXf(t) && !k.isIgn(t) && !k.isFut(t) && !k.isCp(t) && !noRep(t)).concat(costRows);
  return { A, k };
}

// A store that charges again and again is a bill. Returns the bills to add; the saved ones and the ignored ones are skipped.
export function detectNew(S, A) {
  const g = {}, bills = [...(S.bills || [])], out = [];
  A.filter((t) => t.a < 0 && !t.virtual).forEach((t) => { const k = String(t.to || t.desc).toLowerCase().trim(); (g[k] = g[k] || []).push(t); });
  Object.entries(g).forEach(([k, L]) => {
    if (L.length < 2 || (S.ignoredBills || []).includes(k) || bills.some((b) => b.mode != "once" && b.match == k)) return;
    L.sort((a, b) => a.d.localeCompare(b.d));
    const c = cadenceOf(L); if (!c) return;
    const last = L[L.length - 1];
    const b = { n: last.to, every: c.every, anchor: c.anchor, dom: c.dom, src: last.from, match: k, cat: last.c || "Subscriptions", manual: false, mode: "rule", rec: "recurring" };
    bills.push(b); out.push({ b, c, last });
  });
  return out;
}

export const billTx0 = (b, A, tx) => (b.mode == "once" ? (tx || []).filter((t) => (b.ids || []).includes(t.id)).sort(byDate) : A.filter((t) => t.a < 0 && (t.desc + " " + t.to).toLowerCase().includes(b.match)).sort(byDate));

// One bill's state: when it is next due, if it was paid, what it usually costs. Like billsInfo0 in the current app.
// Three kinds: recurring (a rhythm is known: predicted and tracked), irregular (every payment still counts) and one-off.
export function billInfo(b, idx, mt, NOW) {
  const last = mt[mt.length - 1], prev = mt[mt.length - 2], ev = mt.slice(-6).map((t) => [t.d, -t.a]);
  let cad = null, ended = false;
  if (b.mode != "once") {
    if (b.every) { cad = { every: b.every, anchor: b.anchor, dom: b.dom }; if (!b.manual && mt.length >= 2) { const R = mt.slice(-3).map((t) => +String(t.d).slice(8, 10)).sort((x, y) => x - y); cad.dom = R[R.length >> 1]; cad.anchor = +String(mt[mt.length - 1].d).slice(5, 7); } } // a bill found automatically follows the days it was really charged
    else if (b.rec != "irregular") cad = cadenceOf(mt);
  }
  if (cad && !b.manual && last) { // an automatic bill stops being predicted once a cycle passes without it, or when its last instalment was paid
    const li = instOf(last), oc0 = [];
    for (let y = NOW.getFullYear() - 2; y <= NOW.getFullYear() + 1; y++) for (let m = 1; m <= 12; m++) if ((((m - cad.anchor) % cad.every) + cad.every) % cad.every == 0) { const d = new Date(y, m - 1, Math.min(cad.dom, 28), 9); if (d <= NOW) oc0.push(d); }
    const pd0 = oc0[oc0.length - 1], pd1 = oc0[oc0.length - 2], ld = new Date(last.d);
    const missed = (pd1 && ld < new Date(pd1 - 4 * 864e5)) || (pd0 && ld < new Date(pd0 - 4 * 864e5) && NOW - pd0 > 10 * 864e5); // a whole cycle went by without it, or the latest one is more than 10 days late
    if (missed || (li && li.n >= li.total)) { cad = null; ended = true; }
  }
  if (!cad) {
    const once = b.mode == "once", yr = mt.filter((t) => (NOW - new Date(t.d)) / 864e5 <= 365), am = mt.slice(-6).map((t) => -t.a), typ = am.length ? med(am) : b.amt || 0;
    const sug = !once && !ended && b.flag != "canceled" && b.sugNo !== mt.length ? cadenceOf(mt) : null;
    return { ...b, idx, ended, sug: sug ? sug.every : 0, irregular: !once, once, status: once ? "once" : "irregular", pd: null, nx: null, days: 99999, lp: last ? last.d : null, amt: last ? -last.a : b.amt || 0, was: prev ? -prev.a : last ? -last.a : 0, pred: typ, vari: true, lo: am.length ? Math.min(...am) : 0, hi: am.length ? Math.max(...am) : 0, fresh: false, mo: once ? 0 : yr.reduce((s, t) => s - t.a, 0) / 12, n_tx: mt.length, cnt12: yr.length, every: 0, ev };
  }
  const B = { ...b, ...cad }, oc = [];
  for (let y = NOW.getFullYear() - 1; y <= NOW.getFullYear() + 2; y++) for (let m = 1; m <= 12; m++) if ((((m - B.anchor) % B.every) + B.every) % B.every == 0) oc.push(new Date(y, m - 1, Math.min(B.dom, 28), 9));
  let pd = null, nx = null; oc.forEach((d) => { if (d <= NOW) pd = d; else if (!nx) nx = d; });
  const amt = last ? -last.a : B.amt || 0, was = prev ? -prev.a : amt, rc = mt.slice(-3).map((t) => -t.a), mean = rc.length ? sum(rc) / rc.length : amt;
  const r4 = mt.slice(-4).map((t) => -t.a), nch = r4.slice(1).filter((x, i) => Math.abs(x - r4[i]) / r4[i] > 0.03).length, vari = r4.length >= 3 && nch >= 2, pred = vari ? mean : amt;
  const lp = last ? last.d : B.lastPaid, paid = lp && new Date(lp) >= new Date(pd - 4 * 864e5), stt = paid ? "paid" : NOW - pd <= 3 * 864e5 ? "pending" : "overdue";
  return { ...B, idx, pd, nx, days: Math.ceil((nx - NOW) / 864e5), lp, status: stt, amt, was, pred, vari, lo: rc.length ? Math.min(...rc) : amt, hi: rc.length ? Math.max(...rc) : amt, fresh: last ? (NOW - new Date(last.d)) / 864e5 <= 45 : false, mo: pred / B.every, n_tx: mt.length, ev };
}

// Everything about the bills for one moment: the saved bills plus the found ones, every bill's state, and the counted payments.
// all = true also keeps canceled and ended bills (billsInfo(true) in the current app).
export function billState(S, now = new Date()) {
  S = S || {};
  const NOW = now, MK = NOW.getFullYear() + "-" + p2(NOW.getMonth() + 1), TODAY = MK + "-" + p2(NOW.getDate());
  const { A, k } = countedTx(S, TODAY), found = detectNew(S, A), bills = [...(S.bills || []), ...found.map((x) => x.b)];
  const cache = new Map();
  const billTx = (b) => { if (b.mode == "once") return billTx0(b, A, S.tx); let r = cache.get(b.match); if (!r) { r = billTx0(b, A, S.tx); cache.set(b.match, r); } return r; };
  const all = bills.map((b, idx) => billInfo(b, idx, billTx(b), NOW)).map((b) => { const L = billTx(bills[b.idx]).filter((t) => t.c && t.c != "Uncategorized"), lc = L.length ? L[L.length - 1].c : null; return { ...b, cat: lc || (b.manual ? b.cat : "") || "" }; });
  const info = (every) => (every ? all : all.filter((b) => b.flag != "canceled" && !b.ended));
  return { NOW, MK, TODAY, A, k, bills, found, billTx, all, info };
}

// "Payment 8 of 10" series: purchases being paid in instalments that still have payments left.
const baseName = (t) => String(t.to || t.desc).replace(/\s*(תשלום|payment)?\s*\d+\s*(\/|מתוך|of)\s*\d+/gi, "").trim();
export function instSeries(S, NOW) {
  const g = {};
  const k = kinds(S, NOW.getFullYear() + "-" + p2(NOW.getMonth() + 1) + "-" + p2(NOW.getDate()));
  (S.tx || []).filter((t) => !t.virtual && t.a < 0 && !k.isIgn(t)).forEach((t) => {
    const i = instOf(t); if (!i) return;
    const key = baseName(t).toLowerCase() + "|" + i.total + "|" + Math.round(Math.log(Math.max(1, Math.abs(t.a))) / Math.log(1.06));
    (g[key] = g[key] || []).push({ t, i });
  });
  return Object.values(g).map((L) => { L.sort((a, b) => a.t.d.localeCompare(b.t.d) || a.i.n - b.i.n); const last = L[L.length - 1], left = last.i.total - last.i.n, amt = Math.abs(last.t.a); return { name: baseName(last.t), paid: last.i.n, total: last.i.total, left, amt, remain: left * amt, last: last.t }; })
    .filter((x) => x.left > 0 && (NOW - new Date(x.last.d)) / 864e5 <= 50)
    .sort((a, b) => b.last.d.localeCompare(a.last.d) || a.left - b.left); // a plan that is still running has a payment in the last 50 days; the newest payment first
}

// The whole Bills page: the three numbers on top, the groups, and the canceled bills.
export function billsModel(S, now = new Date()) {
  const st = billState(S, now), bs = st.info(false);
  const rec = bs.filter((b) => !b.irregular && !b.once), irr = bs.filter((b) => b.irregular), one = bs.filter((b) => b.once).sort((x, y) => (y.lp || "").localeCompare(x.lp || ""));
  const mo = sum(bs.map((b) => b.mo)), soon = rec.filter((b) => b.days <= 14), soonT = sum(soon.map((b) => b.pred)), ch = rec.filter((b) => b.fresh && !b.vari && Math.abs(b.amt - b.was) > b.was * 0.001);
  const chT = ch.reduce((s, b) => s + ((b.amt - b.was) * 12) / b.every, 0);
  rec.sort((a, b) => (a.status == "overdue" ? -1e4 : 0) + a.days - ((b.status == "overdue" ? -1e4 : 0) + b.days));
  const inst = instSeries(S, st.NOW), canceled = st.info(true).filter((b) => b.flag == "canceled");
  return { ...st, rec, irr, one, mo, soon, soonT, ch, chT, inst, canceled,
    tot: { rec: sum(rec.map((b) => b.mo || 0)), irr: sum(irr.map((b) => b.mo || 0)), ins: sum(inst.map((x) => x.remain)), one: sum(one.map((b) => b.amt || 0)) } };
}

// Details of one payment history window (payHist in the current app): the list newest first, the average, lowest and highest, and each change from the one before.
export function payHistory(L) {
  L = [...L].sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
  if (!L.length) return null;
  const abs = L.map((t) => Math.abs(t.a)), tot = sum(abs), mn = Math.min(...abs), mx = Math.max(...abs);
  return { L, tot, avg: tot / L.length, mn, mx, bars: L.length > 2 ? [...L].reverse().slice(-40) : [], rows: L.map((t, i) => { const nx = L[i + 1]; return { t, diff: nx ? abs[i] - abs[i + 1] : 0 }; }) };
}

// ---- Changes. Each one changes a copy of the state and gives back its history lines: [[action, detail, who?], ...] ----
const cadName = { 1: "monthly", 2: "every 2 months", 12: "yearly" };

// Saves the bills the app found by itself, first, so the numbers in the changes below point at the right bills.
export function withDetected(S, now = new Date()) {
  const next = structuredClone(S), today = now.getFullYear() + "-" + p2(now.getMonth() + 1) + "-" + p2(now.getDate());
  const { A } = countedTx(next, today), found = detectNew(next, A), lines = [];
  next.bills = [...(next.bills || [])];
  found.forEach(({ b, c, last }) => { next.bills.push(b); lines.push(["Bill detected", last.to + " · " + cadName[c.every] + " · about " + fm(c.mean), "System"]); });
  return { next, lines };
}
export const addBill = (S, form, now = new Date()) => {
  const n = String(form.n || "").trim(), am = +form.amt, ev = +form.every;
  if (!n || !am) return false;
  const match = String(form.match || n).toLowerCase(), today = now.getFullYear() + "-" + p2(now.getMonth() + 1) + "-" + p2(now.getDate());
  S.ignoredBills = (S.ignoredBills || []).filter((x) => x != match);
  S.bills.push({ n, amt: am, mode: "rule", ...(ev ? { every: ev, rec: "recurring", anchor: now.getMonth() + 1, dom: Math.min(28, +form.dom || 1) } : { rec: "irregular" }), src: form.src, match, cat: "Subscriptions", lastPaid: today, manual: true });
  return [["Added bill", n + " · " + fm(am) + (ev ? "" : " · irregular")]];
};
export const flagBill = (S, i) => { const b = S.bills[i]; if (!b) return false; b.flag = b.flag ? "" : "cancel"; return [[b.flag ? "Marked to cancel" : "Kept bill", b.n]]; };
export const cancelBill = (S, i, today) => { const b = S.bills[i]; if (!b) return false; b.flag = "canceled"; b.canceledAt = today; return [["Marked bill as canceled", b.n]]; };
export const restoreBill = (S, i) => { const b = S.bills[i]; if (!b) return false; b.flag = ""; delete b.canceledAt; return [["Restored bill", b.n]]; };
export const deleteBill = (S, i) => { const b = S.bills[i]; if (!b) return false; S.bills.splice(i, 1); S.ignoredBills = [...(S.ignoredBills || []), b.match]; return [["Removed bill", b.n + " · it will not be detected again"]]; };
// "Change type": monthly, every 2 months, yearly or irregular.
export function setBillType(S, i, v, tx, now = new Date()) {
  const b = S.bills[i]; if (!b) return false;
  if (v == "irregular") { b.rec = "irregular"; delete b.every; delete b.anchor; delete b.dom; }
  else { const last = tx[tx.length - 1], ld = last ? new Date(last.d) : now; b.rec = "recurring"; b.every = +v; b.anchor = ld.getMonth() + 1; b.dom = Math.min(28, ld.getDate() || 1); }
  return [["Changed bill type", b.n + " → " + (v == "irregular" ? "irregular" : "every " + v + " month" + (v == 1 ? "" : "s"))]];
}
// "These payments now look regular": make it regular, or keep it irregular.
export function sugYes(S, i, sug, tx, now = new Date()) {
  const b = S.bills[i]; if (!b || !sug) return false;
  const last = tx[tx.length - 1], ld = last ? new Date(last.d) : now;
  b.rec = "recurring"; b.every = sug; b.anchor = ld.getMonth() + 1; b.dom = Math.min(28, ld.getDate() || 1); delete b.sugNo;
  return [["Bill became regular", b.n + " → " + cadName[sug]]];
}
export const sugNo = (S, i, tx) => { const b = S.bills[i]; if (!b) return false; b.sugNo = tx.length; return []; };
// What the "type" window shows as chosen: "irregular", or the months between charges.
export const typeOf = (b, info) => (b.rec == "irregular" || (!b.every && b.rec == "irregular") ? "irregular" : String(b.every || (info || {}).every || 1));

// ---- Words. These take the translate function t(key, values, count) so the same texts work in both languages. ----
const CADS = { 1: 1, 2: 1, 12: 1 };
const dyn = (t, key, ...a) => t(key, ...a); // for texts whose name is worked out
export const cadText = (t, every) => (every in CADS ? dyn(t, "bills.cad." + every) : t("bills.cad.n", { n: every }));
export const freqText = (t, every, plain) => (every in CADS ? dyn(t, "bills.freq." + every) : plain ? t("bills.freq.regular") : t("bills.freq.n", { n: every }));
// "Why is this a bill?" (whyBill in the current app)
export function whyText(b, t) {
  if (b.once) return t("bills.why.once");
  const told = b.manual ? t("bills.why.told", { match: b.match }) + " " : "", n = b.n_tx;
  if (b.irregular) return told + t("bills.why.irr", { match: b.match }) + " " + t("bills.why.irrSo", { n, c: b.cnt12 || 0 }, n);
  return t("bills.why.part", { name: b.n }) + " " + (b.manual ? told + t("bills.why.repeats", { freq: freqText(t, b.every, true) }) : t("bills.why.found", { n, freq: freqText(t, b.every), amount: fm(b.amt) }, n)) + (b.flag == "canceled" ? " " + t("bills.why.canceled") : "");
}
// The tip on "Found automatically" / "Why is this a bill?": a title, some rows, the last payments, and the reason. Lines are split by new lines, rows by a tab (richtip.js).
export function evTipText(b, t, dstr) {
  const kind = b.once ? "once" : b.irregular ? "irr" : "rec";
  const rows = [...(b.irregular || b.once ? [] : [[t("bills.tip.how"), b.every in CADS ? cadText(t, b.every) : t("bills.g.rec.title")]]), [t("bills.tip.typical"), fm(b.pred || b.amt || 0)], [t("bills.tip.so"), String(b.n_tx || 0)], ...(b.ev && b.ev.length ? ["---", ...b.ev.map((e) => [dstr(e[0]), fm(e[1])])] : [])];
  return [b.n + " · " + dyn(t, "bills.kind." + kind), ...rows.map((r) => (r === "---" ? "---" : r[0] + "\t" + r[1])), "---", whyText(b, t)].join("\n");
}
// Dates the way the current app writes them: day/month/year, or month/day/year when chosen in Settings (df = "mdy").
export function makeDstr(df = "dmy") {
  const dnum = (y, m, d) => { const p = (n) => String(n).padStart(2, "0"); return df === "mdy" ? p(m) + "/" + p(d) + "/" + y : p(d) + "/" + p(m) + "/" + y; };
  return (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); if (m) return dnum(m[1], m[2], m[3]); const x = new Date(d); return isNaN(x) ? String(d) : dnum(x.getFullYear(), x.getMonth() + 1, x.getDate()); };
}
