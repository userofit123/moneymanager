<script setup>
// Reports: a copy of the current app's Reports page (web/js/06-trend-forecast-sync.js reps, renderNW, trDraw, lineChart, barChart and 03-bills-home.js renderCmp).
// The main chart, this month against last month, income against expenses, top merchants, spending by category and by tag, and the category trend.
// It reads the shared data store and GET /api/fx. The only things it saves are the choices the current app also keeps in this browser
// (moneyRanges, moneyTrend), "Include pension", and hiding or showing a merchant.
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { pages } from "../routes.js";
import { hrefOf, go } from "../router.js";
import { formatMoney } from "../format.js";
import PageHeader from "../components/PageHeader.vue";
import RangeCal from "./RangeCal.vue";
import { homeModel } from "./home.js";
import { periodRange, cmpEnd, block, merchants, sumBy, byAmount, totalOf, seriesN, trOptions, trSeries, nwSeries, monthCompare } from "./reports.js";
import { vTip } from "../tip.js";
import { dcell, titleCase } from "../dates.js";

// Card labels start every word with a capital in English, like titleCase in the old app.
const tc = (el) => { for (const e of el.querySelectorAll(".lbl")) { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode, r = titleCase(n.nodeValue); if (r !== n.nodeValue) n.nodeValue = r; } } };
const vTcase = { mounted: tc, updated: tc };
import { categoryName } from "../catnames.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const he = computed(() => locale.value === "he");
const fm = (v) => formatMoney(Math.round(v));
const f0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
const isMob = () => document.documentElement.classList.contains("mob");
const WS = (() => { try { return localStorage.getItem("moneyWs") === "mon" ? "mon" : "sun"; } catch { return "sun"; } })();
const DF = (() => { try { return localStorage.getItem("moneyDf") === "mdy" ? "mdy" : "dmy"; } catch { return "dmy"; } })();

// ---- data ----
const fx = ref({});
onMounted(async () => {
  data.start();
  try { const r = await fetch("/api/fx", { cache: "no-store" }); if (r.ok) fx.value = (await r.json()).fx || {}; } catch { /* no rates */ }
});
const S = computed(() => data.state.value);
const NOW = new Date(), MK = NOW.getFullYear() + "-" + String(NOW.getMonth() + 1).padStart(2, "0");
const M = computed(() => (S.value ? homeModel(S.value, NOW, fx.value) : null));
const loc = computed(() => (he.value ? "he-IL" : "en-GB"));
const MNAME = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const MSHORT = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short" });
const trFull = (m) => MNAME(m) + " " + m.slice(0, 4);
const trShort = (m, long) => MSHORT(m) + (long ? " " + m.slice(2, 4) : "");
const catName = (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : categoryName(c, locale.value));
const cc = (n) => (n == "Income" || S.value?.cats?.[n] === 99 ? "var(--pos)" : `var(--c${(S.value?.cats?.[n] == null ? 6 : S.value.cats[n]) % 7})`);
const addM = (m, k) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

// ---- the choices this page remembers (the same keys as the current app) ----
const RNG = reactive({ cat: { p: "month", from: "", to: "" }, merch: { p: "month", from: "", to: "" }, tag: { p: "month", from: "", to: "" } });
const RN = reactive({ bars: 12, lines: 12, lt: "exp" });
const CMP = reactive({ cat: "none", merch: "none", tag: "none" });
const TR = reactive({ m: "nw", r: 12, v: "area", c: false });
try { const j = JSON.parse(localStorage.getItem("moneyRanges") || "{}"); ["cat", "merch", "tag"].forEach((k) => { if (j[k]) RNG[k] = j[k]; }); if (j.RN) Object.assign(RN, j.RN); if (j.CMP) Object.assign(CMP, j.CMP); } catch { /* defaults */ }
try { Object.assign(TR, JSON.parse(localStorage.getItem("moneyTrend") || "{}")); } catch { /* defaults */ }
if (!["area", "line", "bars"].includes(TR.v)) TR.v = "area";
function saveRng() { try { const j = JSON.parse(localStorage.getItem("moneyRanges") || "{}"); localStorage.setItem("moneyRanges", JSON.stringify({ ...j, cat: RNG.cat, merch: RNG.merch, tag: RNG.tag, RN: { ...RN }, CMP: { ...CMP } })); } catch { /* not remembered */ } }
const saveTR = () => { try { localStorage.setItem("moneyTrend", JSON.stringify({ ...TR })); } catch { /* not remembered */ } };
watch(() => [RNG.cat, RNG.merch, RNG.tag, RN.bars, RN.lines, RN.lt, CMP.cat, CMP.merch, CMP.tag].map((x) => JSON.stringify(x)).join("|"), saveRng);
watch(() => JSON.stringify(TR), saveTR);

// ---- saving ----
async function save(edit, action, detail, undo) {
  const next = structuredClone(S.value); edit(next);
  if (action) next.audit = [{ t: new Date().toISOString(), who: "You", action, detail, undo: undo || null }, ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  try { await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }); } catch { /* reloaded below */ }
  await data.load();
}

// ---- opening Activity on a period, a category, a tag or a merchant ----
// Activity reads its time frame from moneyRanges.tx; the rest waits in sessionStorage ("mmGo") for it to pick up.
function goActivity(o = {}) {
  try {
    const j = JSON.parse(localStorage.getItem("moneyRanges") || "{}");
    j.tx = o.from || o.to ? { p: "custom", from: o.from || "", to: o.to || "" } : { p: "all", from: "", to: "" };
    localStorage.setItem("moneyRanges", JSON.stringify(j));
    sessionStorage.setItem("mmGo", JSON.stringify({ cat: o.cat || "", tag: o.tag || "", ty: o.ty || "", q: o.q || "" }));
  } catch { /* opens Activity without the filter */ }
  go(hrefOf(pages.find((p) => p.name === "activity")));
}

// ---- time frames ----
const rangeKeys = ["all", "today", "yesterday", "week", "lastweek", "month", "lastmonth", "30d", "90d", "year", "lastyear"];
const cmpOpts = computed(() => [["none", t("rep.cmpNone")], ["prev", t("rep.cmpPrev")], ["yoy", t("rep.cmpYoy")]]);
const monOpts = computed(() => [[3, t("rep.m3")], [6, t("rep.m6")], [12, t("rep.m12")], [24, t("rep.m24")], [0, t("rep.mAll")]]);
const dateShort = (d) => (DF === "mdy" ? d.slice(5, 7) + "/" + d.slice(8, 10) : d.slice(8, 10) + "/" + d.slice(5, 7));
const rangeLabel = (r) => (/^\d{4}-\d{2}-01$/.test(r.from) && r.to == r.from.slice(0, 7) + "-31" ? MNAME(r.from.slice(0, 7)) + " " + r.from.slice(0, 4)
  : (r.from && r.to && r.from.slice(0, 4) == r.to.slice(0, 4) ? dateShort(r.from) : r.from ? dcell(r.from) : "…") + " – " + (r.to ? dcell(r.to) : "…"));
const rangeOpts = (id) => [...rangeKeys.map((k) => [k, tk("activity.range." + k)]), ["custom", RNG[id].p == "custom" ? rangeLabel(RNG[id]) : t("activity.range.custom")]];
const cmpName = (c) => (c ? dcell(c.from) + " – " + dcell(cmpEnd(c)) : "");
const cal = ref(null);
function onRange(id, e) {
  const v = e.target.value;
  if (v === "custom") { cal.value = { id, anchor: e.target }; return; }
  RNG[id] = { p: v, from: "", to: "" };
}
const calApply = (r) => { RNG[cal.value.id] = { p: "custom", from: r.from, to: r.to }; cal.value = null; };
const calCancel = () => { const a = cal.value?.anchor, id = cal.value?.id; cal.value = null; if (a && id) a.value = RNG[id].p; };

// ---- charts' helpers ----
const nice = (v) => { v = Math.max(v, 1); const p = 10 ** Math.floor(Math.log10(v)), n = v / p, st = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return st * p; };
const scale = (v) => { const mx = Math.max(1, ...v), step = nice(mx / 3); return { mx: Math.ceil(mx / step) * step, step }; };
const axis = (W, H, P, mx, step, fmt) => { const o = []; for (let v = 0; v <= mx; v += step) o.push({ y: H - 24 - (v / mx) * (H - 40), x1: P, x2: W - 10, label: fmt(v) }); return o; };
const fmAx = (v) => { const a = Math.abs(v), x = a >= 1e6 ? +(a / 1e6).toFixed(1) + "M" : a >= 1000 ? +(a / 1000).toFixed(a % 1000 ? 1 : 0) + "k" : Math.round(a); return (v < 0 ? "−" : "") + x; };
// the size of an element, kept up to date (the charts are drawn at their real size)
function useSize() {
  const el = ref(null), w = ref(0), h = ref(0); let ro;
  onMounted(() => { ro = new ResizeObserver(() => { if (el.value) { w.value = Math.round(el.value.clientWidth); h.value = Math.round(el.value.clientHeight); } }); watch(el, (e, o) => { if (o) ro.unobserve(o); if (e) { ro.observe(e); w.value = Math.round(e.clientWidth); h.value = Math.round(e.clientHeight); } }, { immediate: true }); });
  onBeforeUnmount(() => ro?.disconnect());
  return { el, w, h };
}

// ---- 1. the main chart ----
const opts = computed(() => (M.value ? trOptions(M.value) : { cat: [], src: [], tag: [] }));
const optGroups = computed(() => [
  [t("rep.gOverview"), [["nw", t("rep.oNw")], ["inc", t("rep.income")], ["exp", t("rep.expenses")], ["net", t("rep.oNet")]]],
  [t("rep.gTypes"), [["bills", t("rep.oBills")]]],
  [t("rep.gSpendCat"), opts.value.cat.map((k) => ["cat:" + k, catName(k)])],
  [t("rep.gIncSrc"), opts.value.src.map((k) => ["src:" + k, k.length > 34 ? k.slice(0, 34) + "…" : k])],
  [t("rep.gSpendTag"), opts.value.tag.map((k) => ["tag:" + k, "#" + k])],
].filter((g) => g[1].length));
const flatOpts = computed(() => optGroups.value.flatMap((g) => g[1].map((x) => x[0])));
const trM = computed(() => (flatOpts.value.includes(TR.m) ? TR.m : "nw"));
const nw = computed(() => (M.value ? nwSeries(S.value, M.value, MK) : null));
const trName = (spec) => { const [k, ...r] = spec.split(":"), a = r.join(":"); return { nw: t("rep.oNw"), inc: t("rep.income"), exp: t("rep.expenses"), net: t("rep.nNet"), bills: t("rep.nBills"), cat: catName(a), src: t("rep.incomeFrom", { a }), tag: "#" + a }[k] || spec; };
const trColor = (spec) => { const k = spec.split(":")[0], a = spec.split(":").slice(1).join(":"); return k == "nw" ? "var(--acc)" : k == "inc" || k == "src" ? "var(--pos)" : k == "exp" ? "var(--c1)" : k == "net" ? "var(--acc)" : k == "bills" ? "var(--c3)" : k == "cat" ? cc(a) : "var(--c5)"; };
const hasPension = computed(() => (S.value?.accounts || []).some((a) => a.kind == "pension" && +a.v > 0));
const trm = computed(() => {
  if (!M.value || !nw.value) return null;
  const spec = trM.value, isNW = spec == "nw", NW = nw.value, NN = NW.keys.length, wp = !!S.value.nwPension; let n;
  if (TR.r) n = TR.r; else { const e = isNW ? NW.keys[NW.first] : M.value.rows.reduce((m, x) => (x.d < m ? x.d : m), MK + "-31").slice(0, 7); n = 1; while (n < 60 && addM(MK, -n) >= e) n++; n = Math.max(n, 36); }
  n = Math.min(n, isNW ? NN : 60);
  const ms = Array.from({ length: n }, (_, i) => addM(MK, -(n - 1 - i))), pms = ms.map((m) => addM(m, -n)), noCmp = isNW && NN < 2 * n;
  let vals, prev = null, signed = false;
  if (isNW) { const cash = NW.hap.map((v, i) => v + NW.wise[i] + (NW.oth[i] || 0)), tot = cash.map((v, i) => v + NW.pen[i]), main = wp ? tot : cash; vals = main.slice(-n); if (TR.c && NN >= 2 * n) prev = main.slice(NN - 2 * n, NN - n); }
  else { vals = trSeries(M.value, S.value, spec, ms); if (TR.c) prev = trSeries(M.value, S.value, spec, pms); signed = spec == "net"; }
  const sum = (a) => a.reduce((x, y) => x + y, 0), labels = ms.map((m) => trShort(m, n > 12)), fullL = ms.map(trFull);
  let big, delta;
  if (isNW) { big = vals[n - 1]; const ch = big - vals[0], pc = vals[0] ? (ch / Math.abs(vals[0])) * 100 : 0; delta = { pill: { cls: ch >= 0 ? "dn" : "up", text: (ch >= 0 ? "▲" : "▼") + " " + fm(Math.abs(ch)) + " (" + Math.abs(pc).toFixed(1) + "%)" }, rest: " " + t("rep.since", { m: fullL[0] }) }; }
  else { big = sum(vals); const pt = prev ? sum(prev) : null; delta = pt == null ? { text: t("rep.avgMonth", { amt: fm(sum(vals) / n) }) } : { pill: { cls: (big >= pt) == (spec == "inc" || spec == "net" || spec.startsWith("src:") ? true : false) ? "dn" : "up", text: (big >= pt ? "▲" : "▼") + " " + (pt ? Math.abs((big / pt - 1) * 100).toFixed(0) + "%" : t("rep.newPill")) }, rest: " " + t("rep.vsBefore", { amt: fm(pt) }) }; }
  const hi = Math.max(...vals), lo = Math.min(...vals), at = (v) => fullL[vals.indexOf(v)];
  const stats = isNW ? [["change", t("rep.now"), vals[n - 1]], ["chg", t("rep.change"), vals[n - 1] - vals[0]], ["hi", t("rep.highest"), hi, at(hi)], ["lo", t("rep.lowest"), lo, at(lo)]] : [["tot", t("rep.total"), sum(vals)], ["avg", t("rep.monthlyAvg"), sum(vals) / n], ["hi", t("rep.highest"), hi, at(hi)], ["lo", t("rep.lowest"), lo, at(lo)]];
  return { spec, isNW, n, ms, vals, prev, signed, labels, fullL, big, delta, stats, noCmp, wp, col: trColor(spec), zero: isNW && Math.min(...vals) < 0 };
});
const goSpec = (m) => { const [k, ...r] = trM.value.split(":"), arg = r.join(":"), o = { from: m + "-01", to: m + "-31" }; if (k == "cat") o.cat = arg; else if (k == "tag") o.tag = arg; else if (k == "inc" || k == "src") o.ty = "income"; else if (k == "exp") o.ty = "expense"; else if (k == "bills") o.ty = "bill"; return o; };
const nwA = useSize();
const trDraw = computed(() => {
  const m = trm.value; if (!m) return null;
  const W = Math.max(260, Math.floor(nwA.w.value || 320)), narrow = W < 520, H = narrow ? 210 : 250, Pl = narrow ? 36 : 44, Pr = 8, Pt = 14, Pb = 26, vals = m.vals, prev = m.prev, n = vals.length, band = (W - Pl - Pr) / n, kind = TR.v;
  const all = vals.concat(prev || []); let lo = Math.min(...all), hi = Math.max(...all);
  if (kind == "bars") { lo = Math.min(0, lo); hi = Math.max(0, hi); } else { const pad = (hi - lo) * 0.18 || Math.abs(hi) * 0.06 || 1; lo -= pad; hi += pad; if (m.zero) lo = Math.min(0, lo); if (Math.min(...all) >= 0) lo = Math.max(0, lo); }
  if (hi <= lo) hi = lo + 1; const step = nice((hi - lo) / 4); lo = Math.floor(lo / step + 1e-9) * step; hi = Math.ceil(hi / step - 1e-9) * step;
  const X = (i) => Pl + (i + 0.5) * band, Y = (v) => Pt + ((hi - v) / (hi - lo)) * (H - Pt - Pb), grid = [];
  for (let v = lo; v <= hi + step / 2; v += step) grid.push({ y: Y(v), zero: Math.abs(v) < 1e-9, label: fmAx(v) });
  const ls = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - Pl - Pr) / (narrow ? 44 : 54))))), xl = m.labels.map((l, i) => ((n - 1 - i) % ls == 0 ? { x: X(i), l } : null)).filter(Boolean), out = { W, H, Pl, Pt, Pb, band, kind, grid, xl, X, Y };
  if (kind == "bars") { const bw = Math.max(3, Math.min(34, band * 0.58)), z = Y(0); out.bars = vals.map((v, i) => { const y = Y(v), h = Math.max(1.5, Math.abs(y - z)); return { x: X(i) - bw / 2, y: v >= 0 ? y : z, w: bw, h, rx: Math.min(5, bw / 2), neg: m.signed && v < 0, op: i == n - 1 ? 1 : 0.82, p: prev ? { x1: X(i) - bw / 2 - 2, x2: X(i) + bw / 2 + 2, y: Y(prev[i]) } : null }; }); }
  else { const pts = vals.map((v, i) => X(i) + "," + Y(v)).join(" "), zb = Y(Math.max(lo, Math.min(0, hi))); out.pts = pts; out.prevPts = prev ? prev.map((v, i) => X(i) + "," + Y(v)).join(" ") : ""; out.area = `${X(0)},${zb} ${pts} ${X(n - 1)},${zb}`; out.dots = n <= 24 ? vals.map((v, i) => (i == n - 1 ? null : { x: X(i), y: Y(v) })).filter(Boolean) : []; out.end = { x: X(n - 1), y: Y(vals[n - 1]) }; }
  return out;
});
const trHov = ref(null);
function trShow(e) {
  const d = trDraw.value, m = trm.value; if (!d) return; const r = e.currentTarget.getBoundingClientRect();
  if (e.clientX - r.left < d.Pl - 6) return;
  const i = Math.max(0, Math.min(m.vals.length - 1, Math.floor((e.clientX - r.left - d.Pl) / d.band))), x = d.X(i), y = d.Y(m.vals[i]);
  trHov.value = { i, x, y, lx: 0, top: Math.max(0, y - (m.prev ? 78 : 62) - 14) };
  nextTick(() => { const tp = tipEl.value; if (tp && trHov.value) trHov.value = { ...trHov.value, lx: Math.max(0, Math.min(d.W - tp.offsetWidth, x - tp.offsetWidth / 2)) }; });
}
const tipEl = ref(null);
function trClick(e) {
  if (isMob()) return; const d = trDraw.value, m = trm.value, r = e.currentTarget.getBoundingClientRect(); if (e.clientX - r.left < d.Pl - 6) return;
  goActivity(goSpec(m.ms[Math.max(0, Math.min(m.vals.length - 1, Math.floor((e.clientX - r.left - d.Pl) / d.band)))]));
}
const setPension = (e) => save((n) => { n.nwPension = e.target.checked; });

// ---- 2. this month vs last month ----
const cmp = computed(() => (M.value ? monthCompare(M.value, MK) : null));
const pmN = computed(() => (cmp.value ? MNAME(cmp.value.pm) : ""));

// ---- 3. income vs expenses (bars) and the category trend (lines) ----
const barsData = computed(() => (M.value ? seriesN(M.value, RN.bars, "exp", MK) : null));
const linesData = computed(() => (M.value ? seriesN(M.value, RN.lines, RN.lt, MK) : null));
const monLabels = (H0) => H0.keys.map((m) => (H0.keys.length > 12 ? MSHORT(m) + " " + m.slice(2, 4) : MSHORT(m)));
const bcw = useSize();
const barChart = computed(() => {
  const H0 = barsData.value; if (!H0) return null;
  const W = Math.max(320, bcw.w.value || 480), H = Math.max(210, bcw.h.value || 210), n = H0.keys.length, sc = scale(H0.inc.concat(H0.exp)), P = 38, mx = sc.mx, bw = Math.max(2, Math.min(W > 700 ? 30 : 17, Math.floor((W - P - 34) / n / 2.5))), fs = W > 700 ? 12 : n > 8 ? 9 : 11, y = (v) => H - 24 - (v / mx) * (H - 40), labels = monLabels(H0);
  return { W, H, fs, grid: axis(W, H, P, mx, sc.step, (v) => v / 1000 + "k"), cols: labels.map((m, i) => { const cx = P + 24 + (i * (W - P - 34)) / n; return { m, cx, mk: H0.keys[i], bw, rx: bw > 9 ? 5 : 2, ix: cx - bw - 1, iy: y(H0.inc[i]), ih: H - 24 - y(H0.inc[i]), ex: cx + 1, ey: y(H0.exp[i]), eh: H - 24 - y(H0.exp[i]), iv: H0.inc[i], ev: H0.exp[i] }; }) };
});
const lw = useSize();
const lineChart = computed(() => {
  const H0 = linesData.value; if (!H0) return null;
  const cw = Math.round(lw.w.value || 0), W = cw > 480 ? cw : 480, H = W > 480 ? Math.round(Math.min(330, Math.max(210, W * 0.26))) : 210, sc = scale(Object.values(H0.cat).flat()), n = H0.keys.length, P = 38, mx = sc.mx, fs = W > 700 ? 12 : n > 8 ? 9 : 11;
  const x = (i) => P + (i * (W - P - 14)) / Math.max(1, n - 1), y = (v) => H - 24 - (v / mx) * (H - 40), labels = monLabels(H0);
  return { W, H, fs, P, labels, x, y, xs: labels.map((_, i) => x(i)), grid: axis(W, H, P, mx, sc.step, (v) => v / 1000 + "k"), lines: Object.entries(H0.cat).map(([k, a]) => ({ k, total: a.reduce((s, v) => s + v, 0), pts: a.map((v, i) => x(i) + "," + y(v)).join(" "), dots: a.map((v, i) => ({ x: x(i), y: y(v), mk: H0.keys[i] })), vals: a })) };
});
const lineHot = ref(null), lhov = ref(null);
function lineShow(e) {
  const C = lineChart.value, svg = e.currentTarget, r = svg.getBoundingClientRect(); if (!r.width) return;
  const k = C.W / r.width, vx = (e.clientX - r.left) * k; let i = 0, best = 1e9; C.xs.forEach((x, j) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = j; } });
  lhov.value = { i, x: C.xs[i], px: C.xs[i] / k, w: r.width, lx: 0 };
  nextTick(() => { const tp = lineTip.value; if (tp && lhov.value) { const w = tp.offsetWidth, px = lhov.value.px; lhov.value = { ...lhov.value, lx: Math.max(0, Math.min(r.width - w, px + w + 16 > r.width ? px - w - 14 : px + 14)) }; } });
}
const lineTip = ref(null);

// ---- 4. spending by category, merchants and tags ----
const blk = (id) => (M.value ? block(M.value, RNG[id], CMP[id], NOW, WS) : null);
const catB = computed(() => { const B = blk("cat"); if (!B) return null; const cur = sumBy(B.cur, (x) => [x.c || "Uncategorized"]), prev = B.prev ? sumBy(B.prev, (x) => [x.c || "Uncategorized"]) : null; return { B, cur, prev, ents: byAmount(cur), keys: [...new Set([...Object.keys(cur), ...Object.keys(prev || {})])].sort((a, b) => (cur[b] || 0) - (cur[a] || 0)) }; });
const tagB = computed(() => { const B = blk("tag"); if (!B) return null; const cur = sumBy(B.cur, (x) => x.tags || []), prev = B.prev ? sumBy(B.prev, (x) => x.tags || []) : null; return { B, cur, prev, ents: byAmount(cur), keys: [...new Set([...Object.keys(cur), ...Object.keys(prev || {})])].sort((a, b) => (cur[b] || 0) - (cur[a] || 0)) }; });
const merch = computed(() => (M.value ? merchants(M.value, blk("merch"), S.value) : null));
const merchCmp = computed(() => blk("merch")?.cr || null);
const tcol = (n, i) => `var(--c${i % 7})`;
function donutOf(ents, colFn, nameFn, tagMode) {
  const tot = ents.reduce((s, x) => s + x[1], 0) || 1, R = 84, r = 58, gap = 0.03; let a = -Math.PI / 2; const p = (x, y) => [100 + x * Math.cos(y), 100 + x * Math.sin(y)];
  return { tot, parts: ents.map(([n, v], i) => { const b = a + (v / tot) * 2 * Math.PI, l = b - a - gap > Math.PI ? 1 : 0, a2 = a + gap / 2, b2 = b - gap / 2; const [x1, y1] = p(R, a2), [x2, y2] = p(R, b2), [x3, y3] = p(r, b2), [x4, y4] = p(r, a2); a = b;
    return { n, v, label: (tagMode ? "#" : "") + nameFn(n), color: colFn(n, i), tip: `${(tagMode ? "#" : "") + nameFn(n)}: ₪${f0(v)} (${Math.round((v / tot) * 100)}%)`, d: `M${x1} ${y1}A${R} ${R} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${l} 0 ${x4} ${y4}Z` }; }) };
}
const catDonut = computed(() => (catB.value ? donutOf(catB.value.ents, (n) => cc(n), catName, false) : null));
const tagDonut = computed(() => (tagB.value && tagB.value.ents.length ? donutOf(tagB.value.ents, tcol, (n) => n, true) : null));
const hoverCat = ref(null), hoverTag = ref(null);
const dlt = (now, then) => { if (then == null) return null; if (!then) return now ? { cls: "am2", text: t("rep.newPill") } : null; const p = (now / then - 1) * 100; if (Math.abs(p) < 1) return { cls: "fl", text: t("rep.same") }; return { cls: p > 0 ? "up" : "dn", text: (p > 0 ? "▲" : "▼") + " " + Math.abs(p).toFixed(0) + "%" }; };
const hideMerch = (n) => { const l = String(n).toLowerCase(); if ((S.value.hiddenMerchants || []).includes(l)) return; save((s) => { s.hiddenMerchants = [...(s.hiddenMerchants || []), l]; }, "Hid a merchant", n + " is no longer shown as a merchant", { type: "merchant", name: l }); };
const showMerch = (n) => save((s) => { s.hiddenMerchants = (s.hiddenMerchants || []).filter((x) => x != String(n).toLowerCase()); }, "Showed a merchant again", n);
const monthDay = computed(() => (cmp.value ? { month: pmN.value, day: cmp.value.DAYN } : {}));
</script>

<template>
  <div>
    <PageHeader :title="t('nav.reports')" />
    <div class="view on" id="rep" v-tcase>
    <p v-if="data.error.value && !S" class="muted">{{ t("home.loadError") }}</p>
    <p v-else-if="!M" class="muted">{{ t("home.loading") }}</p>

    <template v-else>
      <!-- the main chart -->
      <div class="card" id="nwc" v-if="trm && trDraw">
        <div class="trtop"><div class="trpick"><select :value="trM" :aria-label="t('rep.whatToShow')" @change="TR.m = $event.target.value"><optgroup v-for="g in optGroups" :key="g[0]" :label="g[0]"><option v-for="[v, l] in g[1]" :key="v" :value="v" :selected="trM == v">{{ l }}</option></optgroup></select></div>
          <div class="trrt"><label class="tg trtog" :class="{ off: trm.noCmp }" v-tip="t('rep.compareTip') + (trm.noCmp ? '\n' + t('rep.compareNone') : '')"><input type="checkbox" :checked="TR.c && !trm.noCmp" :disabled="trm.noCmp" @change="TR.c = $event.target.checked"><span>{{ t("rep.compare") }}</span></label><label v-if="trm.isNW && hasPension" class="tg trtog"><input type="checkbox" :checked="trm.wp" @change="setPension"><span>{{ t("rep.withPension") }}</span></label>
            <div class="seg trseg"><button v-for="[v, l] in [['area', t('rep.area')], ['line', t('rep.line')], ['bars', t('rep.bars')]]" :key="v" type="button" :class="{ on: TR.v == v }" @click="TR.v = v">{{ l }}</button></div>
            <div class="seg trseg"><button v-for="[v, l] in [[3, t('rep.r3')], [6, t('rep.r6')], [12, t('rep.r12')], [36, t('rep.r36')], [0, t('rep.rAll')]]" :key="v" type="button" :class="{ on: TR.r == v }" @click="TR.r = v">{{ l }}</button></div></div></div>
        <div class="trhead"><div class="val"><small>₪</small>{{ trm.big < 0 ? "−" : "" }}{{ f0(trm.big) }}</div><div class="sm trdelta"><template v-if="trm.delta.pill"><span class="bd" :class="trm.delta.pill.cls">{{ trm.delta.pill.text }}</span>{{ trm.delta.rest }}</template><template v-else>{{ trm.delta.text }}</template></div></div>
        <div id="nwA" :ref="(e) => (nwA.el.value = e)">
          <div class="trw">
            <svg class="trs" :width="trDraw.W" :height="trDraw.H" :viewBox="`0 0 ${trDraw.W} ${trDraw.H}`" @pointermove="trShow" @pointerdown="trShow" @pointerleave="trHov = null" @click="trClick">
              <defs><linearGradient id="tgm" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="trm.col" stop-opacity=".32" /><stop offset="1" :stop-color="trm.col" stop-opacity="0" /></linearGradient></defs>
              <template v-for="(g, i) in trDraw.grid" :key="'g' + i"><line class="gl" :x1="trDraw.Pl" :x2="trDraw.W - 8" :y1="g.y" :y2="g.y" :stroke-dasharray="g.zero ? undefined : '2 5'" /><text :x="trDraw.Pl - 7" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
              <text v-for="(l, i) in trDraw.xl" :key="'x' + i" :x="l.x" :y="trDraw.H - 8" text-anchor="middle">{{ l.l }}</text>
              <template v-if="trDraw.kind == 'bars'"><template v-for="(b, i) in trDraw.bars" :key="'b' + i"><rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :rx="b.rx" :fill="b.neg ? 'var(--neg)' : trm.col" :fill-opacity="b.op" /><line v-if="b.p" :x1="b.p.x1" :x2="b.p.x2" :y1="b.p.y" :y2="b.p.y" stroke="var(--tx)" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round" /></template></template>
              <template v-else>
                <polyline v-if="trDraw.prevPts" fill="none" stroke="var(--tx)" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" :points="trDraw.prevPts" />
                <polygon v-if="trDraw.kind == 'area'" fill="url(#tgm)" :points="trDraw.area" />
                <polyline fill="none" :stroke="trm.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" :points="trDraw.pts" />
                <circle v-for="(d, i) in trDraw.dots" :key="'d' + i" :cx="d.x" :cy="d.y" r="3" fill="var(--bg)" :stroke="trm.col" stroke-width="2" />
                <circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="9" :fill="trm.col" fill-opacity=".18" /><circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="4.5" :fill="trm.col" />
              </template>
              <line class="trx" :x1="trHov ? trHov.x : 0" :x2="trHov ? trHov.x : 0" :y1="trDraw.Pt" :y2="trDraw.H - trDraw.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" :style="{ display: trHov ? '' : 'none' }" />
              <circle class="trd" r="5.5" :cx="trHov ? trHov.x : 0" :cy="trHov ? trHov.y : 0" :fill="trm.col" stroke="var(--bg)" stroke-width="2" :style="{ display: trHov && trDraw.kind != 'bars' ? '' : 'none' }" />
            </svg>
            <div v-if="trHov" ref="tipEl" class="trtip" :style="{ display: 'flex', insetInlineStart: trHov.lx + 'px', top: trHov.top + 'px', direction: 'ltr' }"><b>{{ trm.fullL[trHov.i] }}</b><span>{{ fm(trm.vals[trHov.i]) }}</span><small v-if="trm.prev">{{ t("rep.prevLabel", { amt: fm(trm.prev[trHov.i]) }) }}</small><small v-if="!isMob()">{{ t("rep.clickOpen") }}</small></div>
          </div>
        </div>
        <div class="trstats"><div v-for="s in trm.stats" :key="s[0]"><span>{{ s[1] }}<template v-if="s[3]">{{ " " }}<small>(<bdi>{{ s[3] }}</bdi>)</small></template></span><b class="num" :class="{ neg: s[0] == 'chg' && s[2] < 0 }">{{ s[2] < 0 ? "−" : "" }}{{ fm(Math.abs(s[2])) }}</b></div></div>
      </div>

      <!-- this month vs last month -->
      <div class="card" id="cmpCard" v-if="cmp">
        <div class="bh"><div><div class="lbl">{{ t("rep.cmpTitle") }}</div><div class="sm cmpsub">{{ t("rep.cmpSub") }}</div></div></div>
        <div id="cmp" style="margin-top:12px">
          <div class="flex" style="align-items:stretch;gap:28px;flex-wrap:wrap"><div class="cmpcol"><div class="cmpb cur"><div class="lbl"><i class="cd"></i>{{ MNAME(MK) }}<span class="tpill" :class="!cmp.same ? '' : cmp.dir > 0 ? 'up' : cmp.dir < 0 ? 'dn' : 'eq'"><template v-if="cmp.same"><span>{{ cmp.dir > 0 ? "▲" : cmp.dir < 0 ? "▼" : "=" }}</span><span>{{ cmp.p }}%</span></template><span>{{ t("rep.soFar") }}</span></span></div><div class="val"><small>₪</small>{{ f0(cmp.thisTot) }}</div>
            <div class="sm cmpx"><template v-if="cmp.same">{{ cmp.p ? t(cmp.d > 0 ? "rep.moreThan" : "rep.lessThan", { p: cmp.p }) : t("rep.sameAs") }} {{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}</template><template v-else>{{ t("rep.nothingByDay", { month: pmN, day: cmp.DAYN }) }}</template></div></div>
            <div class="cmpb prev"><div class="lbl"><i class="cd"></i>{{ pmN }}<span class="tpill">{{ t("rep.fullMonth") }}</span></div><div class="val"><small>₪</small>{{ f0(cmp.lastTot) }}</div>
              <div class="sm cmpx">{{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}<template v-if="cmp.lastTot">{{ " " }}{{ t("rep.shareOfMonth", { pc: Math.round((cmp.same / cmp.lastTot) * 100), tot: f0(cmp.lastTot), month: pmN }) }}</template></div></div></div>
            <div style="flex:1;min-width:min(260px,100%)"><div class="cmplg"><span class="tpill"><i class="cd"></i><span>{{ t("rep.monthSoFar", { month: MNAME(MK) }) }}</span></span><span class="tpill g"><i class="cd"></i><span>{{ t("rep.sameDays", { month: pmN }) }}</span></span></div>
              <div v-for="r in cmp.rows" :key="r.k" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px"><b><span class="catl" @click="goActivity({ cat: r.k })">{{ catName(r.k) }}</span></b><span class="sm num">₪{{ f0(r.a) }} <span style="opacity:.6">{{ t("rep.vs") }} ₪{{ f0(r.b) }}</span></span></div>
                <div class="bar" style="margin:6px 0 3px;height:7px"><i :style="{ width: (r.a / cmp.mx) * 100 + '%' }" /></div><div class="bar" style="margin:0;height:7px"><i :style="{ width: (r.b / cmp.mx) * 100 + '%', background: 'color-mix(in srgb,var(--tx) 30%,transparent)' }" /></div></div></div></div>
        </div>
      </div>

      <div class="grid g2">
        <!-- income vs expenses -->
        <div class="card cfill"><div class="bh"><div class="lbl">{{ t("rep.incVsExp") }}</div><div class="rctl rng" id="ctl-bars"><select :value="RN.bars" :aria-label="t('rep.monthsShown')" @change="RN.bars = +$event.target.value"><option v-for="[n, l] in monOpts" :key="n" :value="n" :selected="RN.bars == n">{{ l }}</option></select></div></div>
          <div id="bars"><div class="bcw" :ref="(e) => (bcw.el.value = e)"><svg v-if="barChart" :width="barChart.W" :height="barChart.H" :viewBox="`0 0 ${barChart.W} ${barChart.H}`">
            <template v-for="(g, i) in barChart.grid" :key="'g' + i"><line class="gl" :x1="g.x1" :x2="g.x2" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="g.x1 - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
            <template v-for="c in barChart.cols" :key="c.mk"><rect class="gob" v-tip="t('rep.incomeTip', { m: c.m, v: f0(c.iv) })" :x="c.ix" :y="c.iy" :width="c.bw" :height="c.ih" :rx="c.rx" fill="var(--inc)" @click="!isMob() && goActivity({ from: c.mk + '-01', to: c.mk + '-31', ty: 'income' })" /><rect class="gob" v-tip="t('rep.expensesTip', { m: c.m, v: f0(c.ev) })" :x="c.ex" :y="c.ey" :width="c.bw" :height="c.eh" :rx="c.rx" fill="var(--exp)" @click="!isMob() && goActivity({ from: c.mk + '-01', to: c.mk + '-31', ty: 'expense' })" /><text :x="c.cx" :y="barChart.H - 6" text-anchor="middle" :style="{ fontSize: barChart.fs + 'px' }">{{ c.m }}</text></template>
          </svg></div><div class="flex sm" style="gap:16px"><span><span class="dot" style="background:var(--inc)"></span> {{ t("rep.income") }}</span><span><span class="dot" style="background:var(--exp)"></span> {{ t("rep.expenses") }}</span></div></div></div>

        <!-- top merchants -->
        <div class="card"><div class="bh"><div class="lbl">{{ t("rep.topMerch") }}</div><div class="rctl rng" id="ctl-merch"><select :value="RNG.merch.p" :aria-label="t('activity.timeFrame')" @change="onRange('merch', $event)"><option v-for="[v, l] in rangeOpts('merch')" :key="v" :value="v" :selected="RNG.merch.p == v">{{ l }}</option></select><select :value="CMP.merch" :aria-label="t('rep.compareWith')" @change="CMP.merch = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.merch == v">{{ l }}</option></select></div></div>
          <div id="merch" style="margin-top:14px" v-if="merch">
            <template v-if="merch.rows.length"><div v-for="r in merch.rows" :key="r.n" class="mrow" style="margin-bottom:12px" @click="goActivity({ q: r.n })"><div class="sm mmain" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="mname">{{ r.n }}</span>
              <span class="mpills"><span v-if="r.cat" class="mpill"><i class="cd" :style="{ background: cc(r.cat) }"></i>{{ catName(r.cat) }}</span><span class="mpill">{{ r.count == 1 ? t("rep.payment1") : t("rep.paymentN", { n: r.count }) }}</span><span v-if="r.bill" class="mpill b">{{ r.bill == "irregular" ? t("rep.irregularBill") : t("rep.bill") }}</span></span>
              <span class="flex" style="gap:8px;flex:none"><template v-if="merch.prev"><span v-if="dlt(r.v, r.before)" class="bd" :class="dlt(r.v, r.before).cls">{{ dlt(r.v, r.before).text }}</span></template><b class="num" style="color:var(--tx)">₪{{ f0(r.v) }}</b><button type="button" class="mh" v-tip="t('rep.hideTip')" :aria-label="t('rep.hideAria', { n: r.n })" @click.stop="hideMerch(r.n)">✕</button></span></div>
              <div class="bar" style="margin:6px 0"><i :style="{ width: (r.v / merch.mx) * 100 + '%' }" /></div><div v-if="merch.prev" class="sm" style="opacity:.75">{{ t("rep.beforeAmt", { amt: "₪" + f0(r.before) }) }}</div></div></template>
            <div v-else class="sm">{{ t("rep.noSpendPeriod") }}</div>
            <div v-if="merchCmp" class="sm" style="margin-top:4px">{{ t("rep.comparedWith") }} {{ cmpName(merchCmp) }}</div>
            <div v-if="merch.hidden.length" class="sm" style="margin-top:12px">{{ t("rep.hiddenFrom") }} <button v-for="n in merch.hidden" :key="n" type="button" class="chip dchip" v-tip="t('rep.showAgain')" @click="showMerch(n)">{{ n }} ↩</button></div>
          </div></div>

        <!-- spending by category -->
        <div class="card"><div class="bh"><div class="lbl" id="repCatLbl">{{ t("rep.spendCat") }}</div><div class="rctl rng" id="ctl-cat"><select :value="RNG.cat.p" :aria-label="t('activity.timeFrame')" @change="onRange('cat', $event)"><option v-for="[v, l] in rangeOpts('cat')" :key="v" :value="v" :selected="RNG.cat.p == v">{{ l }}</option></select><select :value="CMP.cat" :aria-label="t('rep.compareWith')" @change="CMP.cat = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.cat == v">{{ l }}</option></select></div></div>
          <div class="flex dnt" :class="{ hv: hoverCat }" id="donutRep" style="margin-top:12px;justify-content:center" v-if="catDonut">
            <svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%"><path v-for="p in catDonut.parts" :key="p.n" v-tip="p.tip" :d="p.d" :fill="p.color" :class="{ on: hoverCat === p.n }" style="cursor:pointer" @mouseenter="hoverCat = p.n" @mouseleave="hoverCat = null" @click="goActivity({ cat: p.n })" /><text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ f0(catDonut.tot) }}</text><text x="100" y="117" text-anchor="middle">{{ t("rep.spentPeriod") }}</text></svg>
            <div class="legend"><div v-for="p in catDonut.parts" :key="p.n" :class="{ on: hoverCat === p.n }" data-k="" @mouseenter="hoverCat = p.n" @mouseleave="hoverCat = null"><span class="dot" :style="{ background: p.color }"></span><span class="catl" @click="goActivity({ cat: p.n })">{{ p.label }}</span><b>₪{{ f0(p.v) }}</b></div></div></div>
          <div id="catCmp" style="margin-top:12px"><template v-if="catB && catB.prev"><div class="sm" style="margin-bottom:6px">{{ t("rep.comparedWith") }} <b>{{ cmpName(catB.B.cr) }}</b>{{ t("rep.totalVs", { a: fm(totalOf(catB.cur)), b: fm(totalOf(catB.prev)) }) }} <span v-if="dlt(totalOf(catB.cur), totalOf(catB.prev))" class="bd" :class="dlt(totalOf(catB.cur), totalOf(catB.prev)).cls">{{ dlt(totalOf(catB.cur), totalOf(catB.prev)).text }}</span></div>
            <div class="cmprow hd"><span>{{ t("rep.category") }}</span><span>{{ t("rep.thisPeriod") }}</span><span>{{ t("rep.before") }}</span><span></span></div>
            <div v-for="k in catB.keys.slice(0, 10)" :key="k" class="cmprow"><span><span class="dot" :style="{ background: cc(k) }"></span> <span class="catl" @click="goActivity({ cat: k })">{{ catName(k) }}</span></span><b class="num">{{ fm(catB.cur[k] || 0) }}</b><span class="sm num">{{ fm(catB.prev[k] || 0) }}</span><span v-if="dlt(catB.cur[k] || 0, catB.prev[k] || 0)" class="bd" :class="dlt(catB.cur[k] || 0, catB.prev[k] || 0).cls">{{ dlt(catB.cur[k] || 0, catB.prev[k] || 0).text }}</span><span v-else></span></div></template></div></div>

        <!-- spending by tag -->
        <div class="card"><div class="bh"><div class="lbl">{{ t("rep.spendTag") }}</div><div class="rctl rng" id="ctl-tag"><select :value="RNG.tag.p" :aria-label="t('activity.timeFrame')" @change="onRange('tag', $event)"><option v-for="[v, l] in rangeOpts('tag')" :key="v" :value="v" :selected="RNG.tag.p == v">{{ l }}</option></select><select :value="CMP.tag" :aria-label="t('rep.compareWith')" @change="CMP.tag = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.tag == v">{{ l }}</option></select></div></div>
          <div class="flex" :class="{ dnt: tagDonut, hv: tagDonut && hoverTag }" id="donutTag" style="margin-top:12px;justify-content:center">
            <template v-if="tagDonut"><svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%"><path v-for="p in tagDonut.parts" :key="p.n" v-tip="p.tip" :d="p.d" :fill="p.color" :class="{ on: hoverTag === p.n }" style="cursor:pointer" @mouseenter="hoverTag = p.n" @mouseleave="hoverTag = null" @click="goActivity({ tag: p.n })" /><text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ f0(tagDonut.tot) }}</text><text x="100" y="117" text-anchor="middle">{{ t("rep.spentPeriod") }}</text></svg>
              <div class="legend"><div v-for="p in tagDonut.parts" :key="p.n" :class="{ on: hoverTag === p.n }" data-k="" @mouseenter="hoverTag = p.n" @mouseleave="hoverTag = null"><span class="dot" :style="{ background: p.color }"></span><span class="catl" @click="goActivity({ tag: p.n })">{{ p.label }}</span><b>₪{{ f0(p.v) }}</b></div></div></template>
            <span v-else class="sm">{{ t("rep.noTagged") }}</span></div>
          <div id="tagCmp" style="margin-top:12px"><template v-if="tagB && tagB.ents.length && tagB.prev"><div class="sm" style="margin-bottom:6px">{{ t("rep.comparedWith") }} <b>{{ cmpName(tagB.B.cr) }}</b>{{ t("rep.totalVs", { a: fm(totalOf(tagB.cur)), b: fm(totalOf(tagB.prev)) }) }} <span v-if="dlt(totalOf(tagB.cur), totalOf(tagB.prev))" class="bd" :class="dlt(totalOf(tagB.cur), totalOf(tagB.prev)).cls">{{ dlt(totalOf(tagB.cur), totalOf(tagB.prev)).text }}</span></div>
            <div class="cmprow hd"><span>{{ t("rep.tag") }}</span><span>{{ t("rep.thisPeriod") }}</span><span>{{ t("rep.before") }}</span><span></span></div>
            <div v-for="k in tagB.keys.slice(0, 10)" :key="k" class="cmprow"><span><span class="catl" @click="goActivity({ tag: k })">#{{ k }}</span></span><b class="num">{{ fm(tagB.cur[k] || 0) }}</b><span class="sm num">{{ fm(tagB.prev[k] || 0) }}</span><span v-if="dlt(tagB.cur[k] || 0, tagB.prev[k] || 0)" class="bd" :class="dlt(tagB.cur[k] || 0, tagB.prev[k] || 0).cls">{{ dlt(tagB.cur[k] || 0, tagB.prev[k] || 0).text }}</span><span v-else></span></div></template></div></div>
      </div>

      <!-- category trend -->
      <div class="card"><div class="bh"><div class="lbl" id="lineTitle">{{ t("rep.catTrend") }}</div><div class="rctl rng" id="ctl-lines"><select :value="RN.lt" :aria-label="t('rep.type')" @change="RN.lt = $event.target.value"><option value="exp" :selected="RN.lt != 'inc'">{{ t("rep.expenses") }}</option><option value="inc" :selected="RN.lt == 'inc'">{{ t("rep.income") }}</option></select><select :value="RN.lines" :aria-label="t('rep.monthsShown')" @change="RN.lines = +$event.target.value"><option v-for="[n, l] in monOpts" :key="n" :value="n" :selected="RN.lines == n">{{ l }}</option></select></div></div>
        <div id="lines" :class="{ hv: lineHot }" :ref="(e) => (lw.el.value = e)">
          <template v-if="lineChart && lineChart.lines.length"><div class="trw tight"><svg width="100%" :viewBox="`0 0 ${lineChart.W} ${lineChart.H}`" @pointermove="lineShow" @pointerdown="lineShow" @pointerleave="lhov = null">
            <template v-for="(g, i) in lineChart.grid" :key="'g' + i"><line class="gl" :x1="g.x1" :x2="g.x2" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="g.x1 - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
            <text v-for="(m, i) in lineChart.labels" :key="'m' + i" :x="lineChart.x(i)" :y="lineChart.H - 6" text-anchor="middle" :style="{ fontSize: lineChart.fs + 'px' }">{{ m }}</text>
            <g v-for="l in lineChart.lines" :key="l.k" class="ls" :class="{ on: lineHot === l.k }" @mouseenter="lineHot = l.k" @mouseleave="lineHot = null"><polyline fill="none" :stroke="cc(l.k)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" /><polyline fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" />
              <circle v-for="d in l.dots" :key="d.mk" class="gob" :cx="d.x" :cy="d.y" r="4.5" fill="var(--bg)" :stroke="cc(l.k)" stroke-width="2.5" @click="!isMob() && goActivity({ from: d.mk + '-01', to: d.mk + '-31', cat: l.k, ty: RN.lt == 'inc' ? 'income' : 'expense' })" /></g>
            <line v-if="lhov" :x1="lhov.x" :x2="lhov.x" y1="14" :y2="lineChart.H - 24" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" style="pointer-events:none" />
          </svg>
          <div v-if="lhov" ref="lineTip" class="trtip m" :style="{ display: 'flex', insetInlineStart: lhov.lx + 'px', top: '4px', direction: 'ltr' }"><b>{{ lineChart.labels[lhov.i] }}</b><span v-for="r in lineChart.lines.map((l) => [l.k, l.vals[lhov.i]]).sort((p, q) => q[1] - p[1]).slice(0, 7)" :key="r[0]"><i class="tdot" :style="{ background: cc(r[0]) }"></i>{{ catName(r[0]) }} ₪{{ f0(r[1]) }}</span></div></div>
          <div class="trleg"><div v-for="l in lineChart.lines" :key="l.k" class="lgi" :class="{ on: lineHot === l.k }" @mouseenter="lineHot = l.k" @mouseleave="lineHot = null"><span class="dot" :style="{ background: cc(l.k) }"></span><span class="catl" @click="goActivity({ cat: l.k })">{{ catName(l.k) }}</span><b class="num">₪{{ f0(l.total) }}</b></div></div></template>
          <div v-else class="sm" style="padding:20px 0">{{ RN.lt == "inc" ? t("rep.noIncomeMonths") : t("rep.noSpendMonths") }}</div></div></div>
    </template>
    </div>
    <RangeCal v-if="cal" :from="RNG[cal.id].p === 'custom' ? RNG[cal.id].from : ''" :to="RNG[cal.id].p === 'custom' ? RNG[cal.id].to : ''" :anchor="cal.anchor" :df="DF" :ws="WS" @apply="calApply" @cancel="calCancel" />
  </div>
</template>
