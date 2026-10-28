<script setup>
// Forecast: where the money is heading:
// the choices at the top, the balance now and ahead, what it is based on, the chart, what drives it and what each jar will hold.
// The numbers come from forecast.js. The choices are saved in this browser ("moneyFc").
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { home } from "../core/derived.js";
import { goActivity } from "../core/shell.js";
import { fm, f0 as n0 } from "../format.js";
import { readJson, writeJson } from "../core/prefs.js";
import { isolateNumbers } from "../core/polish.js";
import { TP } from "../core/tooltip.js";
import { tx } from "../core/heText.js";
import PageHeader from "../components/PageHeader.vue";
import BaseCard from "../components/BaseCard.vue";
import { categoryName } from "../catnames.js";
import { forecastModel, fcChoices, direction, chartOf, forecastTable, barsOf, endPoint } from "../lib/forecast.js";
import "../styles/pages/forecast.css"; // this page's own styles

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const sg = fm;
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));

const fx = computed(() => data.fx.value.fx); // exchange rates, loaded with the data
onMounted(async () => {
  data.start();
});
const S = computed(() => data.state.value);

// The page's choices, saved in this browser.
const fc = ref((() => { let z = null; try { z = readJson("moneyFc", null); } catch { /* none saved */ } return fcChoices(z); })());
const pick = (k, v) => { fc.value = { ...fc.value, [k]: isNaN(+v) ? v : +v }; try { writeJson("moneyFc", (fc.value)); } catch { /* not saved */ } };
const M = computed(() => forecastModel(S.value, now.value, fx.value, fc.value, home.value));

const monthOf = (key, opt) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, opt);
const mshort = (key) => monthOf(key, { month: "short" });
// "Oct 27"; in Hebrew the year keeps its place in the chart (numbers are isolated in translated text)
const mlab = (k) => { const s = new Date(now.value.getFullYear(), now.value.getMonth() + k, 1).toLocaleDateString(loc.value, { month: "short", year: "2-digit" }); return locale.value === "he" ? isolateNumbers(s) : s; };
const jarWhen = (k) => (k ? new Date(+M.value.FH.keys[12].slice(0, 4), +M.value.FH.keys[12].slice(5, 7) - 1 + k, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" }) : "");
const catName = (c) => (c === "Other / uncategorized" ? t("forecast.otherCat") : categoryName(c, locale.value));
const srcName = (k) => (k === "Other income" ? t("forecast.otherInc") : tx(categoryName(k, locale.value))); // names from the data go through tx() (core/heSaved.js)
// A line's name opens Activity with only that category (an income line passes its source's name the same way).
const goCat = (cat) => goActivity({ cat });

const d = computed(() => M.value.d);
const H = computed(() => fc.value.h);

// What it is based on: the months every row learns from (this month and the ones before it, oldest first).
const used = computed(() => d.value.W);
const zeroMonths = computed(() => used.value.filter((i) => i != d.value.last && !M.value.FH.inc[i]).map((i) => mshort(M.value.FH.keys[i])));

// The months group's head names the first and last month ("Aug – Oct").
const monthsHead = computed(() => { const k = used.value.map((j) => mshort(M.value.FH.keys[j])); return k.length > 1 ? k[0] + " – " + k[k.length - 1] : k[0] || ""; });

// The four balance cards.
const CARDS = [[0, ""], [3, "in3"], [6, "in6"], [12, "in12"]];
// a card's change from the first card (the end of this month), from the two whole amounts shown
const gap = (k) => Math.round(d.value.bal[k]) - Math.round(d.value.really);

// The chart.
const cw = ref(780); // the chart is drawn at its real width (same shape as before), so its words keep their size
// the chart's numbers: the last day of this month (the same as the "31 Oct" step), then the end of each month
const target = computed(() => ({ bal: d.value.bal, lo: d.value.lo, hi: d.value.hi, eom: endPoint(d.value) }));
// When the months it learns from change, the points and the line glide to their new places (about 400ms), unless the
// device asks for less motion.
const shown = ref(target.value);
let raf = 0;
watch(target, (to, from) => {
  cancelAnimationFrame(raf);
  const calm = typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm || typeof requestAnimationFrame != "function" || !from || from.bal.length != to.bal.length) { shown.value = to; return; }
  const a = shown.value, t0 = performance.now(), mix = (x, y, f) => x + (y - x) * f, arr = (x, y, f) => y.map((v, i) => mix(x[i], v, f));
  const step = (tm) => {
    const p = Math.min(1, (tm - t0) / 400), f = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2; // ease in and out
    shown.value = p >= 1 ? to : { bal: arr(a.bal, to.bal, f), lo: arr(a.lo, to.lo, f), hi: arr(a.hi, to.hi, f), eom: { v: mix(a.eom.v, to.eom.v, f), lo: mix(a.eom.lo, to.eom.lo, f), hi: mix(a.eom.hi, to.eom.hi, f) } };
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
const C = computed(() => chartOf(shown.value, H.value, cw.value, Math.max(240, Math.round((cw.value * 290) / 780))));
// a point's own numbers (not the gliding ones) for the hover tip
const realPt = (k) => (k === "e" ? target.value.eom : { v: d.value.bal[k], lo: d.value.lo[k], hi: d.value.hi[k] });
const hover = ref(null); // { i: the point, px, py }
const svgEl = ref(null), tipEl = ref(null);
let ro = null;
watch(svgEl, (el) => { if (ro) ro.disconnect(); if (el && typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => { const w = Math.round(el.getBoundingClientRect().width); if (w > 120) cw.value = w; }); ro.observe(el); } });
onBeforeUnmount(() => ro && ro.disconnect());
function onMove(e) {
  const c = C.value, svg = svgEl.value; if (!svg) return;
  const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * c.W;
  if (vx < c.Pl - 14 || vx > c.W - c.Pr + 14) { hover.value = null; return; }
  // the nearest point
  const i = c.pts.reduce((b, p, j) => (Math.abs(p.x - vx) < Math.abs(c.pts[b].x - vx) ? j : b), 0), sx = r.width / c.W, k = c.pts[i].k;
  hover.value = { i, k, px: 0, py: Math.max(0, c.pts[i].y * sx - 76) };
  nextTick(() => { const w = tipEl.value ? tipEl.value.offsetWidth : 0; if (hover.value && hover.value.i === i) hover.value = { ...hover.value, px: Math.max(0, Math.min(r.width - w, c.pts[i].x * sx - w / 2)) }; });
}
const onLeave = () => { hover.value = null; };
// month names under the chart: every month when there is room (about 56px each), else every 2nd or 3rd so they never overlap
const lblStep = computed(() => Math.max(1, Math.ceil(56 / Math.max(1, C.value.u))));
// a point's name: the last day of this month ("31 Oct"), then each month (under the chart, every 2nd or 3rd when narrow)
const ptName = (k) => (k === "e" ? lastDay(0) : mlab(k)); // a month, for the warnings
// a point's own day: every value is for a month's last day ("31 Jan"; a year ahead also names its year, "31 Oct 2027")
const ptDay = (k) => (k === "e" ? lastDay(0) : endLab(k));
// under the chart, no year (it would crowd the last label; "1 year" above it and the hover tip name it)
const ptLabel = (p) => (p.k === "e" || p.k % lblStep.value == 0 || p.k == H.value ? lastDay(p.k === "e" ? 0 : p.k) : "");
const big = (k) => k === "e" || [3, 6, 12].includes(k);
const horizonLabel = (k) => (k == 12 ? t("forecast.y1") : t("forecast.moN", { n: k }));

// The table: each row has one small bar per month used (oldest first, this month lighter: part so far, part expected),
// then the average, next month, the next 12 months and the direction. Tapping a row's bars lists its months with amounts.
const last = computed(() => d.value.last);
const moName = (j) => mshort(M.value.FH.keys[j]);
const amt = (v) => (Math.abs(v) < 0.5 ? "₪0" : (v < 0 ? "−" : "") + "₪" + n0(v));
// one row: v the months as counted (this month made whole), so: this month so far (the same as Activity), up: the known
// payments still due this month (Activity's upcoming ones, already inside v), cv: the months after softening,
// sh: the same amounts as shown (shownLines: whole shekels that add up exactly to the totals shown), lk: what usually still
// comes this month (whole shekels; sh.lk when sh is given)
const rowOf = (key, name, v, so, dr, cv = null, up = 0, sh = null, lk = 0) => ({
  key, name, dr, bars: barsOf(v, so),
  months: used.value.map((j, i) => {
    const now = j == last.value && Math.abs(so - v[i]) >= 0.5;
    return { j, label: moName(j), v: sh ? sh.v[i] : v[i], so: now ? (sh ? sh.so : so) : null, up: now && Math.abs(up) >= 0.5 ? (sh ? sh.up : up) : null, lk: now && (sh ? sh.lk : lk) ? (sh ? sh.lk : lk) : null, counted: cv && Math.abs(cv[i] - v[i]) >= 0.5 ? cv[i] : null };
  }),
});
// the known payments still due: "₪497 still to come" (on Saved, where they are taken off: "₪497 still to go out")
const upText = (up) => (up < 0 ? t("forecast.upcomingOut", { amt: amt(-up) }) : t("forecast.upcomingAmt", { amt: amt(up) }));
// what usually still comes this month: "₪501 usually still to come" (on Saved, when it takes off: "… usually still to go out")
const lkText = (lk) => (lk < 0 ? t("forecast.usualOut", { amt: amt(-lk) }) : t("forecast.usualAmt", { amt: amt(lk) }));
// a bar's tip: the month, then its amount in green (money in) or red (money out; saved: by its sign);
// this month: so far, still to come and the whole month
const keep = (s) => (locale.value === "he" ? isolateNumbers(s) : s);
const money = (key, v) => { const k = key[0] == "t" ? key[1] : key[0], good = k == "i" || (k == "l" && v >= 0); return keep(good ? "++" + amt(v) + "++" : "~~" + amt(v) + "~~"); };
const still = (up) => t(up < 0 ? "forecast.bt.stillOut" : "forecast.bt.stillIn");
// money out's total: the same number as the key number "Likely spending for the rest of …", so it has that name
const usual = (lk, key) => (key == "to" ? t("num.likely", { month: thisMon.value }) : t(lk < 0 ? "forecast.bt.usualOut" : "forecast.bt.usualIn"));
const barTip = (e, i) => {
  const x = e.x, m = x.months[i];
  if (m.so == null) return TP(m.label, [[e.label, money(x.key, m.v)]]);
  return TP(t("forecast.bt.now", { mon: m.label }), [[t("forecast.bt.soFar"), money(x.key, m.so)], ...(m.up != null ? [[still(m.up), keep(amt(Math.abs(m.up)))]] : []), ...(m.lk != null ? [[usual(m.lk, x.key), keep(amt(Math.abs(m.lk)))]] : []), "---", [t("forecast.bt.whole"), money(x.key, m.v)]]);
};
const soOf = (o, k) => ((o[k] || [])[last.value] || 0);
const upOf = (k) => (M.value.UP || {})[k] || 0;
// the lines as shown (forecastModel's d.shown, rounded once there): in every column they add up exactly to the total shown
// above them, and Recap's "A look at …" shows the same numbers
const shIn = computed(() => d.value.shown.inc);
const shOut = computed(() => d.value.shown.out);
const incRows = computed(() => d.value.inc.map((r, i) => ({ r, sh: shIn.value.rows[i], ...rowOf("i" + r.k, srcName(r.k), r.v, soOf(d.value.IR, r.k), direction(r, "in"), r.cv, 0, shIn.value.rows[i]) })));
const exRows = computed(() => d.value.ex.map((r, i) => ({ r, sh: shOut.value.rows[i], ...rowOf("e" + r.k, catName(r.k), r.v, soOf(M.value.ER, r.k), direction(r, "out"), r.cv, upOf(r.k), shOut.value.rows[i]) })));
// the totals' direction, from the lines under them (the same estimate): their changes per month added up
const dirTot = (rows, ty, neg = []) => { const sl = rows.reduce((s, r) => s + r.sl, 0) - neg.reduce((s, r) => s + r.sl, 0), mean = rows.reduce((s, r) => s + r.mean, 0) - neg.reduce((s, r) => s + r.mean, 0); return direction({ sl, mean: Math.abs(mean) }, ty); };
const sumV = (rows, f) => used.value.map((_, i) => rows.reduce((s, x) => s + f(x, i), 0));
const totIn = computed(() => rowOf("ti", "", sumV(incRows.value, (x, i) => x.r.v[i]), incRows.value.reduce((s, x) => s + soOf(d.value.IR, x.r.k), 0), dirTot(d.value.inc, "in"), null, 0, shIn.value.total));
const totOut = computed(() => rowOf("to", "", sumV(exRows.value, (x, i) => x.r.v[i]), exRows.value.reduce((s, x) => s + soOf(M.value.ER, x.r.k), 0), dirTot(d.value.ex, "out"), null, exRows.value.reduce((s, x) => s + upOf(x.r.k), 0), shOut.value.total));
// this month so far, for a row made of others (totals and saved): its so far, or v when the month has nothing still to come
const soAt = (x) => { const m = x.months.find((y) => y.j == last.value); return m ? (m.so ?? m.v) : 0; };
const open = ref(new Set());
// A row's months stay in the page once opened, so opening and closing only slides their box (the months never change).
// The first time, they are put in closed, then opened on the next frame, so the box slides from no height.
const seen = ref(new Set());
const toggle = async (k) => {
  if (!seen.value.has(k)) { seen.value = new Set(seen.value).add(k); await nextTick(); await new Promise((r) => requestAnimationFrame(() => r())); }
  const o = new Set(open.value); if (o.has(k)) o.delete(k); else o.add(k); open.value = o;
};
// Saved: money in less money out, every column (spending counts in the month you buy, card purchases too), from the
// rounded amounts shown above it, so the subtraction can be checked by eye
// (this month: saved so far, the same as Activity's month, the payments still to come taken off, and what usually still comes in
// less what usually still goes out)
const savedRow = computed(() => rowOf("tl", "", used.value.map((_, i) => Math.round(totIn.value.months[i].v) - Math.round(totOut.value.months[i].v)), Math.round(soAt(totIn.value)) - Math.round(soAt(totOut.value)), dirTot(d.value.inc, "in", d.value.ex), null, -(totOut.value.months.find((y) => y.j == last.value)?.up || 0), null, shIn.value.total.lk - shOut.value.total.lk));
// the table's rows in order: money in and its lines, money out and its lines, and what was saved
const body = computed(() => [
  { tr: "grp in", label: t("forecast.in"), x: totIn.value, vals: [shIn.value.total.mean, TT.value.i1, TT.value.iH] },
  ...incRows.value.map((x) => ({ tr: "", label: x.name, link: x.r.k, x, vals: [x.sh.mean, x.sh.next, x.sh.year] })),
  { tr: "grp out", label: t("forecast.out"), x: totOut.value, vals: [shOut.value.total.mean, TT.value.e1, TT.value.eH] },
  ...exRows.value.map((x) => ({ tr: "", label: x.name, link: x.r.k == "Other / uncategorized" ? null : x.r.k, x, vals: [x.sh.mean, x.sh.next, x.sh.year] })),
  { tr: "tot net " + (TT.value.savedH < 0 ? "bad" : "good"), label: t("forecast.left"), tip: t("forecast.leftTip"), x: savedRow.value, vals: [[shIn.value.total.mean, shOut.value.total.mean], [TT.value.i1, TT.value.e1], [TT.value.iH, TT.value.eH]].map(([i, o]) => i - o), signed: true },
]);
// the table's totals and the balance at the end of each month, the chart's own points (forecastTable)
const TT = computed(() => forecastTable(d.value, H.value));
const thisMon = computed(() => monthOf(M.value.FH.keys[M.value.FH.last], { month: "long" }));
const nextMon = computed(() => new Date(now.value.getFullYear(), now.value.getMonth() + 1, 1).toLocaleDateString(loc.value, { month: "long" }));
// How next month is worked out, step by step: the same steps as the chart's first point (and Recap's look at next month):
// today, what is really yours on the last day of this month (after paying for everything bought), what next month saves,
// and what is really yours on its last day.
const m1 = computed(() => d.value.shown.next);
const lastDay = (k) => new Date(now.value.getFullYear(), now.value.getMonth() + k + 1, 0).toLocaleDateString(loc.value, { day: "numeric", month: "short" });
// the last day of month k, with its year when it is a year or more away (so it is never this month's own day)
const endLab = (k) => { const s = new Date(now.value.getFullYear(), now.value.getMonth() + k + 1, 0).toLocaleDateString(loc.value, { day: "numeric", month: "short", ...(k >= 12 ? { year: "numeric" } : {}) }); return locale.value === "he" ? isolateNumbers(s) : s; };
// four equal tiles that read like a sum: today, then (after the rest of this month) its last day, + what next month saves
// (with its money in and out, the table's numbers), = what is really yours on next month's last day
const fmS = (v) => (Math.round(v) < 0 ? "−" : "+") + fm(Math.abs(Math.round(v)));
// The end of this month, part by part (d.eom: whole shekels that add up exactly): the first card's and the "31 Oct" tile's tip.
const eomTip = computed(() => {
  const e = d.value.eom, off = (v) => "~~−" + fm(v) + "~~";
  return TP(t("num.endMonth", { month: thisMon.value }), [[t("num.inAccounts"), fm(e.bank)], [t("num.cardsUnpaid"), off(e.cards)], [t("num.upcoming"), off(e.due)],
    [t("num.likely", { month: thisMon.value }), off(e.usual)], ...(e.inc ? [[t("fc.x.e.inc"), "++" + fm(e.inc) + "++"]] : []), "---", ["=", fm(e.end)]]);
});
const steps = computed(() => {
  // Every amount here is already whole shekels (rounded once in recap.js, jars.js and forecast.js), so the tiles, their
  // tips and the table add up exactly.
  const saved = m1.value.incT - m1.value.outT, e = d.value.eom;
  return [
    { k: "now", label: t("forecast.how.today"), amt: fm(e.bank), sub: [["", t("num.inAccounts")]], tip: t("fc.x.todayTip") },
    { k: "cal", op: "go", label: lastDay(0), amt: fm(m1.value.really), sub: [["", t(e.inc ? "fc.x.afterInc" : "fc.x.after", { amt: fmS(e.end - e.bank) })]], tip: eomTip.value },
    { k: saved < 0 ? "out" : "in", op: "+", label: nextMon.value, amt: fmS(saved), tip: t("forecast.how.nextMonTip", { month: nextMon.value }),
      sub: [["io", t("forecast.how.inOut", { inc: fm(m1.value.incT), out: fm(m1.value.outT) })]] },
    { k: "end", op: "=", label: lastDay(1), amt: fm(m1.value.end), sub: [["", t("forecast.how.land")]], tip: t("forecast.how.nextTip") },
  ];
});
const SUMI = { now: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  in: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>', out: '<path d="M4 7l6 6 4-4 6 7"/><path d="M15 16h5v-5"/>', end: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>' };

// What each jar will hold: the next 12 months, the same months as the tiles under it.
const spark = (j) => {
  const W = 300, Ht = 74, P = 4, n = 12, vals = j.series.slice(0, n + 1), goal = j.need > 0 && j.need <= Math.max(...vals) * 1.5 ? j.need : null, mx = Math.max(1, ...vals, goal || 0);
  const x = (i) => P + (i * (W - 2 * P)) / n, y = (v) => Ht - 8 - (v / mx) * (Ht - 18), pts = vals.map((v, i) => x(i) + "," + y(v)).join(" ");
  return { W, Ht, P, goal: goal != null ? y(goal) : null, area: `${x(0)},${Ht - 8} ${pts} ${x(n)},${Ht - 8}`, pts, dots: [3, 6, 12].map((k) => ({ cx: x(k), cy: y(vals[k]) })), col: `var(--c${(j.p - 1) % 7})` };
};
// Why a jar gets less than planned: the jars before it take the money, or too little money is expected to be left.
const shortText = (j, cp, avg) => t("forecast.j." + (j.ahead12 >= 1 ? "shortAhead" : "short") + (avg >= 1 ? "" : "None"), { planned: fm(cp), avg: fm(avg) });
const WARN = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
const jarCards = computed(() => M.value.jars.J.map((j) => {
  const open = !(j.need > 0), bill = j.cap == null && !open && !!j.bill, cp = M.value.capOf(j, j.got) || 0, at = (k) => j.series[Math.min(k, j.series.length - 1)], gain = (k) => at(k) - at(0);
  const dl = j.due ? M.value.monthsTo(j.due) : null, short = !bill && at(12) < j.planned[12] - 1 && (j.planned[12] - at(12)) / Math.max(1, j.planned[12] - at(0)) > 0.1;
  let chip;
  if (bill && at(0) >= j.need - 0.5) chip = ["dn", t("forecast.j.funded")];
  else if (!open && j.bal >= j.need) chip = ["dn", t("forecast.j.reached")];
  else if (j.eta) chip = dl != null && j.eta > dl ? ["up", t("fc.j.fullLate", { when: jarWhen(j.eta) })] : ["dn", t("fc.j.full", { when: jarWhen(j.eta) })];
  else chip = open ? ["fl", t("forecast.j.noGoal")] : ["fl", t("forecast.j.notIn5")];
  const sub = bill ? t("forecast.j.refilled", { amount: fm(j.need) }) : [cp ? t("forecast.j.perMonth", { amount: fm(cp) }) : t("fc.j.noMonthly"), open ? t("forecast.j.noGoalLow") : t("forecast.j.goal", { amount: fm(j.need) }), ...(j.due ? [t("forecast.j.by", { when: new Date(j.due).toLocaleDateString(loc.value, { month: "short", year: "numeric" }) })] : [])].join(" · ");
  const tile = (label, k) => ({ label, v: fm(at(k)), g: k ? (gain(k) > 0 ? "+" : "") + fm(gain(k)) : t("forecast.j.today"), pos: k && gain(k) > 0 });
  return { j, chip, sub, sp: spark(j), tiles: [tile(t("forecast.now"), 0), tile(t("forecast.j.mo3"), 3), tile(t("forecast.j.mo6"), 6), tile(t("forecast.y1"), 12)], warn: short ? shortText(j, cp, Math.max(0, gain(12) / 12)) : "" };
}));
</script>

<template>
  <PageHeader :title="t('nav.forecast')" />
  <section class="view on" id="fc">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("forecast.loadError") }}</p>
      <p v-else class="sm">{{ t("forecast.loading") }}</p>
    </template>
    <template v-else>
      <div class="ctl" id="fcCtl">
        <div><div class="pl" :data-tip="t('fc.x.ctlTip')">{{ t("forecast.based") }}</div><div class="seg"><button v-for="[v, l] in [[3, 'mo3'], [6, 'mo6'], [12, 'mo12']]" :key="v" :class="{ on: fc.n == v }" data-a="fc" @click="pick('n', v)">{{ tk("forecast." + l) }}</button></div></div>
      </div>

      <div class="grid g4" id="fcK">
        <BaseCard v-for="[k, l] in CARDS" :key="k" :hero="k == H">
          <div class="lbl"><span :data-tip="k ? null : eomTip">{{ k ? tk("forecast." + l) + " · " + endLab(k) : t("num.endMonthS", { month: thisMon }) }}</span></div>
          <div class="val"><small>₪</small>{{ (k ? d.bal[k] : d.really) < 0 ? "−" : "" }}{{ n0(k ? d.bal[k] : d.really) }}</div>
          <template v-if="k">
            <div class="sm"><span class="bd" :class="gap(k) >= 0 ? 'dn' : 'up'">{{ gap(k) >= 0 ? "▲" : "▼" }} ₪{{ n0(gap(k)) }}</span> {{ t("forecast.vsEnd", { month: thisMon }) }}</div>
            <div class="sm" style="margin-top:6px">{{ t("forecast.range", { lo: sg(d.lo[k]), hi: sg(d.hi[k]) }) }}</div>
          </template>
          <template v-else>
            <div class="sm">{{ t("fc.x.bankToday", { amt: fm(d.eom.bank) }) }}</div>
          </template>
        </BaseCard>
      </div>

      <div v-if="zeroMonths.length" class="sm neg" id="fcDiag" style="line-height:1.55">{{ t("forecast.diag.zero", { months: zeroMonths.join(", ") }) }}</div>

      <!-- the inner span keeps the parts around the dot together (polish.js puts the dot inside it) -->
      <h2><span>{{ M.wallet ? t("fc.x.chartTitle") : t("fc.x.chartTitleBank") }}</span></h2>
      <div class="card" id="fcChart">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
          <div class="flex sm" style="gap:18px;flex-wrap:wrap"><span><span class="dot" style="background:var(--acc)" /> {{ t("forecast.legBal") }}</span><span :data-tip="t('forecast.legRangeTip')"><span class="dot" style="background:color-mix(in srgb,var(--acc) 25%,transparent)" /> {{ t("forecast.legRange") }}</span></div>
          <span v-if="C.fn != null" class="bd up">{{ t("forecast.warnNeg", { when: ptName(C.fn) }) }}</span>
          <span v-else-if="C.fl != null" class="bd fl">{{ t("forecast.warnLow", { when: ptName(C.fl) }) }}</span>
          <span v-else class="bd dn">{{ t("forecast.warnOk") }}</span>
        </div>
        <div class="trw fcw">
          <svg ref="svgEl" class="fcs" style="direction:ltr" width="100%" :viewBox="`0 0 ${C.W} ${C.Ht}`" @pointermove="onMove" @pointerdown="onMove" @pointerleave="onLeave">
            <template v-for="(tk2, i) in C.ticks" :key="i"><line class="gl" :x1="0" :x2="C.W" :y1="tk2.y" :y2="tk2.y" stroke-dasharray="3 5" /><text :x="2" :y="tk2.y - 5" text-anchor="start">{{ tk2.label }}</text></template>
            <template v-if="C.zeroY != null"><line :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.zeroY" :y2="C.zeroY" stroke="var(--neg)" stroke-width="1.5" stroke-dasharray="6 4" /><text :x="C.W - C.Pr" :y="C.zeroY - 5" text-anchor="end" style="fill:var(--neg)">{{ t("forecast.zero") }}</text></template>
            <defs><linearGradient id="fcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".06" /></linearGradient></defs>
            <polygon fill="url(#fcg)" :points="C.band" />
            <template v-for="k in [3, 6, 12].filter((x) => x <= H)" :key="'m' + k"><line :x1="C.X(k)" :x2="C.X(k)" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx2)" stroke-opacity=".35" stroke-dasharray="2 5" /><text :x="k == H ? C.W : C.X(k)" :y="C.Pt - 7" :text-anchor="k == H ? 'end' : 'middle'" style="font-weight:600;fill:var(--tx)">{{ horizonLabel(k) }}</text></template>
            <polyline fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" :points="C.line" />
            <template v-for="p in C.pts" :key="'p' + p.k"><circle :cx="p.x" :cy="p.y" :r="big(p.k) ? 5.5 : 4" :fill="big(p.k) ? 'var(--acc)' : 'var(--bg)'" stroke="var(--acc)" stroke-width="2.5" /><text v-if="ptLabel(p)" :x="p.k === 'e' ? 0 : p.k === H ? C.W : p.x" :y="C.Ht - 9" :text-anchor="p.k === 'e' ? 'start' : p.k === H ? 'end' : 'middle'">{{ ptLabel(p) }}</text></template>
            <line class="trx" :x1="hover ? C.pts[hover.i].x : 0" :x2="hover ? C.pts[hover.i].x : 0" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" :style="{ display: hover ? '' : 'none' }" />
            <circle class="trd" :cx="hover ? C.pts[hover.i].x : 0" :cy="hover ? C.pts[hover.i].y : 0" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="2.5" :style="{ display: hover ? '' : 'none' }" />
          </svg>
          <div ref="tipEl" class="trtip" :style="hover ? { display: 'flex', inset: hover.py + 'px auto auto ' + hover.px + 'px' } : { display: 'none' }"><template v-if="hover"><b>{{ ptDay(hover.k) }}</b><span>{{ sg(realPt(hover.k).v) }}</span><small>{{ t("forecast.tipRange", { lo: sg(realPt(hover.k).lo), hi: sg(realPt(hover.k).hi) }) }}</small></template></div>
        </div>
      </div>

      <h2>{{ t("forecast.how.title") }}</h2>
      <div class="card fchow">
        <ol class="fcsum">
          <li v-for="(x, i) in steps" :key="i" :class="'s-' + x.k">
            <span v-if="x.op" class="op" aria-hidden="true"><svg v-if="x.op == 'go'" viewBox="0 0 24 24"><path d="M10 7l5 5-5 5" /></svg><template v-else>{{ x.op }}</template></span>
            <span class="qb" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="SUMI[x.k]" /></span>
            <div class="d">
              <span class="k" :class="{ tipd: x.tip }" :data-tip="x.tip || null">{{ x.label }}</span>
              <b class="v"><bdi dir="ltr">{{ x.amt }}</bdi></b>
              <template v-for="(s, j) in x.sub || []" :key="j">
                <!-- money in − money out: on a narrow tile it may break after the "−" -->
                <small v-if="s[0] == 'io'" class="s io"><span>{{ s[1].split(" − ")[0] }} −</span> <span>{{ s[1].split(" − ")[1] }}</span></small>
                <small v-else class="s">{{ s[1] }}</small>
              </template>
            </div>
          </li>
        </ol>
      </div>

      <h2>{{ t("forecast.drives") }}</h2>
      <div id="fcTab">
        <table class="rt">
          <colgroup><col class="cn"><col class="cb"><col class="cv"><col class="cv"><col class="cv"><col class="cd"></colgroup>
          <thead><tr><th>{{ t("forecast.rowHead") }}</th><th class="mog">{{ monthsHead }}</th><th class="vc" :data-tip="t('forecast.th.usually')"><b class="thl">{{ t("forecast.usually") }}</b><small class="ths">{{ t("forecast.usuallySub") }}</small></th><th class="vc" :data-tip="t('forecast.th.next')"><b class="thl">{{ t("forecast.nextMonth") }}</b><small class="ths">{{ t("forecast.nextMonthSub") }}</small></th><th class="vc" :data-tip="t('forecast.th.year')"><b class="thl">{{ t("forecast.nextYear") }}</b><small class="ths">{{ t("forecast.nextYearSub") }}</small></th><th class="dc" :data-tip="t('forecast.th.dir')" :aria-label="t('forecast.direction')"><span class="dhl">{{ t("forecast.direction") }}</span><span class="dhs" aria-hidden="true">▲▼</span></th></tr></thead>
          <tbody>
            <template v-for="e in body" :key="e.x.key">
              <tr :class="e.tr">
                <td :class="{ mer: !e.tr }"><span v-if="e.link" class="catl" @click="goCat(e.link)">{{ e.label }}</span><span v-else :class="{ tipd: e.tip }" :data-tip="e.tip || null">{{ e.label }}</span></td>
                <td class="mog fcbars"><button type="button" class="fcbw" :aria-expanded="open.has(e.x.key)" :aria-label="t('forecast.showMonths', { name: e.label })" @click="toggle(e.x.key)"><span class="fcb"><span v-for="(b, i) in e.x.bars" :key="i" class="fcbar" :class="{ now: i == e.x.bars.length - 1, neg: b.v < 0 }" :data-tip="barTip(e, i)" data-ti="1"><i class="ex" :style="{ insetBlockEnd: b.b + '%', blockSize: b.h + '%' }" /><i v-if="i == e.x.bars.length - 1 && b.v >= 0" class="so" :style="{ insetBlockEnd: b.b + '%', blockSize: b.s + '%' }" /></span></span><svg class="fccv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button></td>
                <td v-for="(v, i) in e.vals" :key="i" class="am" :class="e.signed ? (v < 0 ? 'neg' : 'pos') : ''">{{ amt(v) }}</td>
                <td class="dc"><span v-if="e.x.dr.none" class="fcnd" :aria-label="t('forecast.dir.none')">—</span><span v-else class="bd" :class="e.x.dr.cls" :aria-label="tk('forecast.dir.' + e.x.dr.word)"><span aria-hidden="true">{{ e.x.dr.sym.trim() }}</span><span class="dw" aria-hidden="true"> {{ tk("forecast.dir." + e.x.dr.word) }}</span></span></td>
              </tr>
              <!-- a row's months: one small cell each (month above amount), from the row's start; this month marked.
                   It opens and closes smoothly (the inner box grows from no height). -->
              <tr v-if="seen.has(e.x.key)" class="fcx"><td colspan="6"><div class="fcxw" :class="{ on: open.has(e.x.key) }" :inert="!open.has(e.x.key)"><div class="fcxi"><ul class="fcml"><li v-for="m in e.x.months" :key="m.j" :class="{ now: m.j == last, more: m.so != null || m.counted != null, neg: m.v < 0 }"><span>{{ m.label }}</span><b class="num">{{ m.so != null ? t("forecast.soFarAmt", { amt: amt(m.so) }) : amt(m.v) }}</b><small v-if="m.up != null">{{ upText(m.up) }}</small><small v-if="m.lk != null">{{ lkText(m.lk) }}</small><small v-if="m.so != null">{{ t("forecast.normallyAmt", { amt: amt(m.v) }) }}</small><small v-if="m.counted != null">{{ t("forecast.countedAt", { amt: amt(m.counted) }) }}</small></li></ul></div></div></td></tr>
            </template>
            <tr class="tot bal"><td><span class="tipd" :data-tip="t('forecast.endTip')">{{ t("forecast.endRow") }}</span></td><td class="mog" /><td /><td class="am">{{ sg(TT.end1) }}</td><td class="am">{{ sg(TT.endH) }}</td><td /></tr>
          </tbody>
        </table>
      </div>

      <h2>{{ t("forecast.jarTitle") }}</h2>
      <div id="fcJars">
        <div v-if="jarCards.length" class="jfg">
          <div v-for="c in jarCards" :key="c.j.id" class="card jf">
            <div class="jfh"><div style="min-width:0"><b>{{ tx(c.j.n) }}</b><div class="sm">{{ c.sub }}</div></div><span class="bd" :class="c.chip[0]"><span>{{ c.chip[1] }}</span></span></div>
            <div class="jfc">
              <svg :viewBox="`0 0 ${c.sp.W} ${c.sp.Ht}`" width="100%" :height="c.sp.Ht" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient :id="'jfg' + c.j.id" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.sp.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.sp.col" stop-opacity="0" /></linearGradient></defs>
                <line v-if="c.sp.goal != null" :x1="c.sp.P" :x2="c.sp.W - c.sp.P" :y1="c.sp.goal" :y2="c.sp.goal" :stroke="c.sp.col" stroke-opacity=".6" stroke-dasharray="4 4" />
                <polygon :fill="`url(#jfg${c.j.id})`" :points="c.sp.area" />
                <polyline fill="none" :stroke="c.sp.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" :points="c.sp.pts" />
                <circle v-for="(p, i) in c.sp.dots" :key="i" :cx="p.cx" :cy="p.cy" r="3.2" fill="var(--bg)" :stroke="c.sp.col" stroke-width="2" vector-effect="non-scaling-stroke" />
              </svg>
            </div>
            <div class="jfs"><div v-for="x in c.tiles" :key="x.label"><span>{{ x.label }}</span><b class="num">{{ x.v }}</b><i :class="{ pos: x.pos }">{{ x.g }}</i></div></div>
            <div v-if="c.warn" class="jfw"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="WARN" /><span>{{ c.warn }}</span></div>
          </div>
        </div>
        <div v-else class="card sm">{{ t("forecast.j.none") }}</div>
      </div>
    </template>
  </section>
</template>
