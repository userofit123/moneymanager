// The Forecast page's numbers, kept apart from the screen so they can be tested.
// Nothing here changes the data.
import { homeModel } from "./home.js";
import { forecastHistory, proj, jarProject, capOfAt, monthsToOf } from "./jars.js";
import { cardInfo, isCardPay } from "./activity.js";

const sum = (a) => a.reduce((t, x) => t + x, 0);

// fcOpt: the page's choices { h: how far ahead, n: months to base it on, m: "smart" | "avg" | "trend" }, saved in this browser as "moneyFc".
// H: the Home numbers for the same moment, when they are already worked out (core/derived.js home).
export function forecastModel(S, now = new Date(), fx = {}, fcOpt = {}, H = null) {
  S = S || {}; H = H || homeModel(S, now, fx);
  const FH = forecastHistory(S, H), MK = H.MK;
  const fc = { h: 12, n: 6, m: "smart", ...fcOpt }; if (![3, 6, 12].includes(fc.n)) fc.n = 6;
  const { n, m } = fc, inc = Object.entries(FH.incSrc).map(([k, a]) => ({ k, ...proj(FH, a, n, m, true) })).filter((r) => !r.oneoff);
  const E = {}; Object.entries(FH.cat).forEach(([k, a]) => (E[k] = a.slice(0, FH.last))); E["Other / uncategorized"] = FH.exp.slice(0, FH.last).map((t, i) => t - Object.values(FH.cat).reduce((s, a) => s + a[i], 0));
  const ex = Object.entries(E).map(([k, a]) => ({ k, ...proj(FH, a, n, m) })).filter((r) => Math.abs(r.mean) >= 0.5);
  const nEff = Math.max(1, Math.min(n, FH.last - (FH.first || 0)));
  // Bank and wallet money today, in shekels.
  const rate = { ILS: 1, ...fx };
  const start = sum((S.accounts || []).filter((a) => a.kind != "card" && !a.hide && a.inNW && (a.kind == "bank" || a.kind == "wallet")).map((a) => a.v * (rate[a.cur] || 1)));
  const nets = [];
  for (let j = FH.last - nEff; j < FH.last; j++) nets.push(inc.reduce((s, r) => s + ((FH.incSrc[r.k] || [])[j] || 0), 0) - Object.values(E).reduce((s, a) => s + (a[j] || 0), 0));
  const nm = nets.reduce((a, b) => a + b, 0) / nEff, sd = Math.sqrt(nets.reduce((s, x) => s + (x - nm) ** 2, 0) / Math.max(1, nEff - 1));
  const bal = [start], lo = [start], hi = [start]; let b = start;
  for (let k = 1; k <= 12; k++) { b += inc.reduce((s, r) => s + r.at(k), 0) - ex.reduce((s, r) => s + r.at(k), 0); bal.push(b); const w = sd * Math.sqrt(k); lo.push(b - w); hi.push(b + w); }
  const d = { inc, ex, start, bal, lo, hi, nm, sd, nEff };

  // How many bank payments of a card's bill are left out of the numbers (the purchases are already counted on the card).
  const HS = H.S || S, ci = cardInfo(HS), cardPays = (HS.tx || []).filter((t) => isCardPay(HS, t, ci)).length;

  // What the jars will hold in the coming months: only really free money goes in, shared by priority (the same projection as the Jars page).
  const jars = { ...jarProject(S, H, now, fc), net: d.nm };
  return { fc, FH, MK, d, E, cardPays, jars, capOf: capOfAt(now), monthsTo: monthsToOf(now) };
}

// The money a line adds up to over the whole forecast period, and the words for how it is moving.
export const periodTotal = (r, h) => Array.from({ length: h }, (_, i) => r.at(i + 1)).reduce((a, c) => a + c, 0);
export function direction(r, ty) {
  const pc = r.mean ? (r.sl / r.mean) * 100 : 0, flat = Math.abs(pc) < 2, good = ty == "in" ? pc > 0 : pc < 0;
  return { pc, flat, cls: flat ? "fl" : good ? "dn" : "up", sym: flat ? "● " : pc > 0 ? "▲ " : "▼ ", word: flat ? "steady" : pc > 0 ? "up" : "down" };
}

// The picture of the projected balance: where each point goes in the 780 x 290 drawing (renderFc).
export function chartOf(d, H) {
  const W = 780, Ht = 290, Pl = 66, Pr = 18, Pt = 22, Pb = 30, arr = [];
  for (let k = 0; k <= H; k++) arr.push(d.bal[k], d.lo[k], d.hi[k]);
  let mn = Math.min(...arr), mx = Math.max(...arr); const pad = (mx - mn) * 0.08 || 1000; mn -= pad; mx += pad;
  const X = (k) => Pl + (k * (W - Pl - Pr)) / H, Y = (v) => Ht - Pb - ((v - mn) / (mx - mn)) * (Ht - Pb - Pt);
  const ticks = []; for (let i = 0; i <= 4; i++) { const v = mn + ((mx - mn) * i) / 4; ticks.push({ y: Y(v), label: (v < 0 ? "−" : "") + Math.abs(v / 1000).toFixed(0) + "k" }); }
  const up = [], dn = [], ln = []; for (let k = 0; k <= H; k++) { up.push(X(k) + "," + Y(d.hi[k])); dn.unshift(X(k) + "," + Y(d.lo[k])); ln.push(X(k) + "," + Y(d.bal[k])); }
  let fn = -1, fl = -1; for (let k = 1; k <= H; k++) { if (fn < 0 && d.bal[k] < 0) fn = k; if (fl < 0 && d.lo[k] < 0) fl = k; }
  return { W, Ht, Pl, Pr, Pt, Pb, mn, mx, X, Y, ticks, band: up.join(" ") + " " + dn.join(" "), line: ln.join(" "), zeroY: mn < 0 && mx > 0 ? Y(0) : null, fn, fl };
}
