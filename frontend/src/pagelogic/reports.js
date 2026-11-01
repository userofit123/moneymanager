// What Reports knows and does, without the screen: the main chart (what it shows, its months, its numbers and its drawing),
// this month against last, income against expenses, top merchants, spending by category and by tag, and the category trend,
// with the choices kept in this browser and hiding or showing a merchant. Used by the computer page (views/Reports.vue) and the
// phone Reports screen (phone/screens/ReportsScreen.vue), so both show the same numbers.
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { home } from "../core/derived.js";
import { dshort } from "../dates.js";
import { dateFormat, readJson, weekStart, writeJson } from "../core/prefs.js";
import { fm, f0 } from "../format.js";
import { goActivity } from "../core/shell.js";
import { catColor, catLabel } from "../core/cats.js";
import { addM } from "../lib/home.js";
import { cmpEnd, block, merchants, sumBy, byAmount, totalOf, seriesN, trOptions, trSeries, nwSeries, monthCompare } from "../lib/reports.js";
import { dcell } from "../dates.js";

export function useReports() {
  const { t, locale } = useI18n();
  const tk = (key, ...a) => t(key, ...a);
  const he = computed(() => locale.value === "he");

  // ---- data ----
  onMounted(async () => {
    data.start();
  });
  const S = computed(() => data.state.value);
  const MK = computed(() => now.value.getFullYear() + "-" + String(now.value.getMonth() + 1).padStart(2, "0"));
  const M = home; // worked out once for the whole app (core/derived.js)
  const loc = computed(() => (he.value ? "he-IL" : "en-GB"));
  const MNAME = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
  const MSHORT = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short" });
  const trFull = (m) => MNAME(m) + " " + m.slice(0, 4);
  const trShort = (m, long) => MSHORT(m) + (long ? " " + m.slice(2, 4) : "");
  const catName = catLabel;
  const cc = (n) => catColor(S.value, n);

  // ---- the choices this page remembers in this browser ----
  const RNG = reactive({ cat: { p: "month", from: "", to: "" }, merch: { p: "month", from: "", to: "" }, tag: { p: "month", from: "", to: "" } });
  const RN = reactive({ bars: 12, lines: 12, lt: "exp" });
  const CMP = reactive({ cat: "none", merch: "none", tag: "none" });
  const TR = reactive({ m: "nw", r: 12, v: "area", c: false });
  try { const j = readJson("moneyRanges", {}); ["cat", "merch", "tag"].forEach((k) => { if (j[k]) RNG[k] = j[k]; }); if (j.RN) Object.assign(RN, j.RN); if (j.CMP) Object.assign(CMP, j.CMP); } catch { /* defaults */ }
  try { Object.assign(TR, readJson("moneyTrend", {})); } catch { /* defaults */ }
  if (!["area", "line", "bars"].includes(TR.v)) TR.v = "area";
  function saveRng() { try { const j = readJson("moneyRanges", {}); writeJson("moneyRanges", ({ ...j, cat: RNG.cat, merch: RNG.merch, tag: RNG.tag, RN: { ...RN }, CMP: { ...CMP } })); } catch { /* not remembered */ } }
  const saveTR = () => { try { writeJson("moneyTrend", ({ ...TR })); } catch { /* not remembered */ } };
  watch(() => [RNG.cat, RNG.merch, RNG.tag, RN.bars, RN.lines, RN.lt, CMP.cat, CMP.merch, CMP.tag].map((x) => JSON.stringify(x)).join("|"), saveRng);
  watch(() => JSON.stringify(TR), saveTR);

  // ---- saving ----
  // Saving goes through the data store (stores/data.js).
  function save(edit, action, detail, undo) {
    data.change((next) => { edit(next); return action ? [[action, detail, undo]] : []; });
  }

  // Every link to Activity (a category, a tag, a merchant, a month of a chart) opens it with only that filter: goActivity in core/shell.js.

  // ---- time frames ----
  const rangeKeys = ["all", "today", "yesterday", "week", "lastweek", "month", "lastmonth", "30d", "90d", "year", "lastyear"];
  const cmpOpts = computed(() => [["none", t("rep.cmpNone")], ["prev", t("rep.cmpPrev")], ["yoy", t("rep.cmpYoy")]]);
  const monOpts = computed(() => [[3, t("rep.m3")], [6, t("rep.m6")], [12, t("rep.m12")], [24, t("rep.m24")], [0, t("rep.mAll")]]);
  const dateShort = dshort;
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
  const nw = computed(() => (M.value ? nwSeries(S.value, M.value, MK.value) : null));
  const trColor = (spec) => { const k = spec.split(":")[0], a = spec.split(":").slice(1).join(":"); return k == "nw" ? "var(--acc)" : k == "inc" || k == "src" ? "var(--pos)" : k == "exp" ? "var(--c1)" : k == "net" ? "var(--acc)" : k == "bills" ? "var(--c3)" : k == "cat" ? cc(a) : "var(--c5)"; };
  const hasPension = computed(() => (S.value?.accounts || []).some((a) => a.kind == "pension" && +a.v > 0));
  const trm = computed(() => {
    if (!M.value || !nw.value) return null;
    const spec = trM.value, isNW = spec == "nw", NW = nw.value, NN = NW.keys.length, wp = !!S.value.nwPension; let n;
    if (TR.r) n = TR.r; else { const e = isNW ? NW.keys[NW.first] : M.value.rows.reduce((m, x) => (x.d < m ? x.d : m), MK.value + "-31").slice(0, 7); n = 1; while (n < 60 && addM(MK.value, -n) >= e) n++; n = Math.max(n, 36); }
    n = Math.min(n, isNW ? NN : 60);
    const ms = Array.from({ length: n }, (_, i) => addM(MK.value, -(n - 1 - i))), pms = ms.map((m) => addM(m, -n)), noCmp = isNW && NN < 2 * n;
    let vals, prev = null, signed = false;
    if (isNW) { const cash = NW.hap.map((v, i) => v + NW.wise[i] + (NW.oth[i] || 0)), tot = cash.map((v, i) => v + NW.pen[i]), main = wp ? tot : cash; vals = main.slice(-n); if (TR.c && NN >= 2 * n) prev = main.slice(NN - 2 * n, NN - n); }
    else { vals = trSeries(M.value, S.value, spec, ms); if (TR.c) prev = trSeries(M.value, S.value, spec, pms); signed = spec == "net"; }
    const sum = (a) => a.reduce((x, y) => x + y, 0), labels = ms.map((m) => trShort(m, n > 12)), fullL = ms.map(trFull);
    let big, delta;
    if (isNW) { big = vals[n - 1]; const ch = big - vals[0], pc = vals[0] ? (ch / Math.abs(vals[0])) * 100 : 0; delta = { pill: { cls: ch >= 0 ? "dn" : "up", text: (ch >= 0 ? "▲" : "▼") + " " + fm(Math.abs(ch)) + " (" + Math.abs(pc).toFixed(1) + "%)" }, rest: " " + t("rep.since", { m: fullL[0] }) }; }
    else { big = sum(vals); const pt = prev ? sum(prev) : null; delta = pt == null ? { text: t("rep.avgMonth", { amt: fm(sum(vals) / n) }) } : { pill: { cls: (big >= pt) == (spec == "inc" || spec == "net" || spec.startsWith("src:")) ? "dn" : "up", text: (big >= pt ? "▲" : "▼") + " " + (pt ? Math.abs((big / pt - 1) * 100).toFixed(0) + "%" : t("rep.newPill")) }, rest: " " + t("rep.vsBefore", { amt: fm(pt) }) }; }
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
    trHov.value = { i, x, y, lx: 0, top: Math.max(0, y - (m.prev ? 78 : 62) - 14) }; // placed by its left edge, in both languages
    nextTick(() => { const tp = tipEl.value; if (tp && trHov.value) trHov.value = { ...trHov.value, lx: Math.max(0, Math.min(d.W - tp.offsetWidth, x - tp.offsetWidth / 2)) }; });
  }
  const tipEl = ref(null);
  function trClick(e) {
    const d = trDraw.value, m = trm.value, r = e.currentTarget.getBoundingClientRect(); if (e.clientX - r.left < d.Pl - 6) return;
    goActivity(goSpec(m.ms[Math.max(0, Math.min(m.vals.length - 1, Math.floor((e.clientX - r.left - d.Pl) / d.band)))]));
  }
  const setPension = (e) => save((n) => { n.nwPension = e.target.checked; });

  // ---- 2. this month vs last month ----
  const cmp = computed(() => (M.value ? monthCompare(M.value, MK.value) : null));
  const pmN = computed(() => (cmp.value ? MNAME(cmp.value.pm) : ""));

  // ---- 3. income vs expenses (bars) and the category trend (lines) ----
  const barsData = computed(() => (M.value ? seriesN(M.value, RN.bars, "exp", MK.value) : null));
  const linesData = computed(() => (M.value ? seriesN(M.value, RN.lines, RN.lt, MK.value) : null));
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
  const blk = (id) => (M.value ? block(M.value, RNG[id], CMP[id], now.value, weekStart.value) : null);
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

  return {
    t,
    locale,
    tk,
    he,
    S,
    MK,
    M,
    loc,
    MNAME,
    MSHORT,
    trFull,
    trShort,
    catName,
    cc,
    RNG,
    RN,
    CMP,
    TR,
    saveRng,
    saveTR,
    save,
    rangeKeys,
    cmpOpts,
    monOpts,
    dateShort,
    rangeLabel,
    rangeOpts,
    cmpName,
    cal,
    onRange,
    calApply,
    calCancel,
    nice,
    scale,
    axis,
    fmAx,
    useSize,
    opts,
    optGroups,
    flatOpts,
    trM,
    nw,
    trColor,
    hasPension,
    trm,
    goSpec,
    nwA,
    trDraw,
    trHov,
    trShow,
    tipEl,
    trClick,
    setPension,
    cmp,
    pmN,
    barsData,
    linesData,
    monLabels,
    bcw,
    barChart,
    lw,
    lineChart,
    lineHot,
    lineShow,
    lineTip,
    blk,
    catB,
    tagB,
    merch,
    merchCmp,
    tcol,
    donutOf,
    catDonut,
    tagDonut,
    hoverCat,
    dlt,
    hideMerch,
    showMerch,
    lhov,
    hoverTag,
    data,
    now,
    fm,
    f0,
    goActivity,
    catLabel,
    totalOf,
    dateFormat,
    weekStart,
  };
}
