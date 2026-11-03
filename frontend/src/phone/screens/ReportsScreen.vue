<script setup>
// Reports (in More): the computer's Reports page for one column, block for block. The main chart (what it shows, the chart
// style, the months, Compare and Include pension, the amount with its change, the chart and its four tiles), this month
// against last month, income against expenses, top merchants, spending by category and by tag, and the category trend.
// The computer's hover texts open with a tap (a tap on a chart shows that month's numbers in the computer's tip, with a
// way into Activity). Every number comes from pagelogic/reports.js, as on the computer.
import { ref, computed, onMounted, h } from "vue";
import { data } from "../../stores/data.js";
import { useReports } from "../../pagelogic/reports.js";
import { openForm } from "../../core/forms.js";
import { explain } from "../../core/tooltip.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import Segmented from "../components/Segmented.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
import { pages } from "../../routes.js";
import "../../styles/pages/reports.css"; // the computer's Reports look (pills, tiles, toggles, legend), shared
defineProps({ id: { type: String, default: null } });

const {
  t, S, M, MK, MNAME, catName, cc, RNG, RN, CMP, TR, cmpOpts, monOpts, rangeOpts, cmpName, cal, calApply, nice, fmAx, useSize,
  optGroups, trM, hasPension, trm, goSpec, nwA, trDraw, trHov, trShow, tipEl, setPension, cmp, pmN, barsData, linesData, monLabels,
  catB, tagB, merch, merchCmp, catDonut, tagDonut, hoverCat, hoverTag, dlt, hideMerch, showMerch, totalOf, fm, f0, goActivity,
} = useReports();
onMounted(() => data.start());
const P = (k, o) => t("phone.reports." + k, o || {});
const nav = usePhoneNav();
const icon = pages.find((p) => p.name === "reports")?.icon || "";
const neg = (v) => (v < 0 ? "−" : "");
// the computer's change badge (.bd), with the phone's chevron turned up or down in place of the computer's filled arrow
const arrowOf = (s) => (s.startsWith("\u25B2") ? "u" : s.startsWith("\u25BC") ? "d" : "");
const Bd = (props) => { const a = arrowOf(props.d.text); return h("span", { class: ["bd", "ph-rep-bd", props.d.cls] }, [a ? h(PIcon, { name: "chevron", class: ["ph-rep-bdi", a] }) : null, a ? props.d.text.slice(1).trim() : props.d.text]); };
Bd.props = ["d"];

// ---- 1. the main chart ----
const whatName = computed(() => optGroups.value.flatMap((g) => g[1]).find((o) => o[0] === trM.value)?.[1] || "");
const whatOpen = ref(false);
const whatOpts = computed(() => optGroups.value.flatMap(([g, list]) => list.map(([value, label]) => ({ value, label, sub: g }))));
const pickWhat = (v) => { if (v) { TR.m = v; trHov.value = null; } };
const styleSeg = computed(() => [["area", t("rep.area")], ["line", t("rep.line")], ["bars", t("rep.bars")]].map(([value, label]) => ({ value, label })));
const rangeSeg = computed(() => [[3, t("rep.r3")], [6, t("rep.r6")], [12, t("rep.r12")], [36, t("rep.r36")], [0, t("rep.rAll")]].map(([value, label]) => ({ value, label })));
const setStyle = (v) => { TR.v = v; trHov.value = null; };
const setRange = (v) => { TR.r = v; trHov.value = null; };
const compareTip = computed(() => t("rep.compareTip") + (trm.value?.noCmp ? "\n" + t("rep.compareNone") : ""));
// the four tiles explain themselves on a tap (their name and the month it happened)
const statTip = (s) => s[1] + (s[3] ? " (" + s[3] + ")" : "") + ": " + neg(s[2]) + fm(Math.abs(s[2]));

// ---- 2. this month against last month ----
const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ---- 3. income against expenses: two bars a month; a tap shows the month in the computer's tip ----
const bSize = useSize(), bSel = ref(null), bTip = ref(null), bLx = ref(0);
const bD = computed(() => {
  const H0 = barsData.value; if (!H0) return null;
  const W = Math.max(260, bSize.w.value || 328), H = 210, Pl = 34, Pr = 4, Pt = 10, Pb = 24, n = H0.keys.length, band = (W - Pl - Pr) / n;
  const mx0 = Math.max(1, ...H0.inc, ...H0.exp), step = nice(mx0 / 3), mx = Math.ceil(mx0 / step) * step, Y = (v) => Pt + (1 - v / mx) * (H - Pt - Pb);
  const bw = Math.max(2, Math.min(14, band * 0.34)), labels = monLabels(H0), ls = Math.max(1, Math.ceil(n / Math.floor((W - Pl) / 42)));
  const grid = []; for (let v = 0; v <= mx; v += step) grid.push({ y: Y(v), label: fmAx(v) });
  return { W, H, Pl, Pt, Pb, band, n, grid, cols: H0.keys.map((mk, i) => { const cx = Pl + (i + 0.5) * band; return { mk, cx, l: (n - 1 - i) % ls == 0 ? labels[i] : "", i: { x: cx - bw - 1, y: Y(H0.inc[i]), h: Y(0) - Y(H0.inc[i]) }, e: { x: cx + 1, y: Y(H0.exp[i]), h: Y(0) - Y(H0.exp[i]) }, bw }; }) };
});
// the column under the finger (the chart is drawn left to right in both languages)
const colAt = (e, d) => { const r = e.currentTarget.getBoundingClientRect(), k = d.W / r.width; return Math.max(0, Math.min(d.n - 1, Math.floor(((e.clientX - r.left) * k - d.Pl) / d.band))); };
function bShow(e) {
  const d = bD.value; if (!d) return; bSel.value = colAt(e, d);
  requestAnimationFrame(() => { const w = bTip.value?.offsetWidth || 120, x = d.cols[bSel.value].cx; bLx.value = Math.max(0, Math.min(d.W - w, x - w / 2)); });
}
const bOpen = (ty) => { const mk = barsData.value.keys[bSel.value]; goActivity({ from: mk + "-01", to: mk + "-31", ty }); };
const monthsOf = (n) => monOpts.value.find((o) => o[0] == n)?.[1] || "";

// ---- 4. the time frame and what to compare with (top merchants, by category, by tag), and the months shown ----
const picker = ref(null); // { id, kind: "range" | "cmp" | "months" }
const pickOpts = computed(() => (!picker.value ? [] : (picker.value.kind == "range" ? rangeOpts(picker.value.id) : picker.value.kind == "cmp" ? cmpOpts.value : monOpts.value).map(([value, label]) => ({ value, label }))));
const pickVal = computed(() => { const p = picker.value; return !p ? null : p.kind == "range" ? RNG[p.id].p : p.kind == "cmp" ? CMP[p.id] : RN[p.id]; });
const pickTitle = computed(() => (!picker.value ? "" : picker.value.kind == "range" ? t("activity.timeFrame") : picker.value.kind == "cmp" ? t("rep.compareWith") : t("rep.monthsShown")));
const pickOpen = computed({ get: () => !!picker.value, set: (v) => { if (!v) picker.value = null; } });
function picked(v) {
  const p = picker.value; if (!p || v == null) return;
  if (p.kind == "cmp") CMP[p.id] = v;
  else if (p.kind == "months") { RN[p.id] = +v; if (p.id == "bars") bSel.value = null; else lSel.value = null; }
  else if (v === "custom") { picker.value = null; dates.value = { id: p.id, from: RNG[p.id].p == "custom" ? RNG[p.id].from : "", to: RNG[p.id].p == "custom" ? RNG[p.id].to : "" }; }
  else RNG[p.id] = { p: v, from: "", to: "" };
}
const rangeName = (id) => rangeOpts(id).find((o) => o[0] == RNG[id].p)?.[1] || "";
const cmpLabel = (id) => cmpOpts.value.find((o) => o[0] == CMP[id])?.[1] || "";
// "Custom range": two dates with the phone's own date pickers, saved the same way as the computer's calendar
const dates = ref(null);
function applyDates() {
  let { id, from, to } = dates.value; if (!from) return; to = to || from; if (to < from) [from, to] = [to, from];
  cal.value = { id }; calApply({ from, to }); dates.value = null;
}

// spending by category and by tag: the computer's ring (a tap picks a part and shows its tip in the middle; a second tap
// opens it in Activity), its legend and the comparison table
const blocks = computed(() => [
  { id: "cat", title: t("rep.spendCat"), col: t("rep.category"), B: catB.value, D: catDonut.value, hot: hoverCat, name: (k) => catName(k), go: (k) => goActivity({ cat: k }), none: t("rep.noSpendPeriod") },
  { id: "tag", title: t("rep.spendTag"), col: t("rep.tag"), B: tagB.value, D: tagDonut.value, hot: hoverTag, name: (k) => "#" + k, go: (k) => goActivity({ tag: k }), none: t("rep.noTagged") },
]);
const tapPart = (b, n) => { if (b.hot.value === n) b.go(n); else b.hot.value = n; };
const ringMid = (b) => { const p = b.D?.parts.find((x) => x.n == b.hot.value); return p ? { v: p.v, l: p.label, pc: Math.round((p.v / b.D.tot) * 100) } : null; };

// ---- 5. the category trend: one line a category, with its dots; a tap shows the month's top categories ----
const lSize = useSize(), lSel = ref(null), lTip = ref(null), lLx = ref(0), lineHot = ref(null);
const lD = computed(() => {
  const H0 = linesData.value; if (!H0) return null;
  const W = Math.max(260, lSize.w.value || 328), H = 220, Pl = 34, Pr = 10, Pt = 10, Pb = 24, n = H0.keys.length, all = Object.values(H0.cat).flat();
  const mx0 = Math.max(1, ...all), step = nice(mx0 / 3), mx = Math.ceil(mx0 / step) * step, X = (i) => Pl + 6 + (i * (W - Pl - Pr - 12)) / Math.max(1, n - 1), Y = (v) => Pt + (1 - v / mx) * (H - Pt - Pb);
  const labels = monLabels(H0), ls = Math.max(1, Math.ceil(n / Math.floor((W - Pl) / 42))), grid = []; for (let v = 0; v <= mx; v += step) grid.push({ y: Y(v), label: fmAx(v) });
  const lines = Object.entries(H0.cat).map(([k, a]) => ({ k, vals: a, total: a.reduce((s, v) => s + v, 0), pts: a.map((v, i) => X(i) + "," + Y(v)).join(" "), dots: n <= 24 ? a.map((v, i) => ({ x: X(i), y: Y(v), i })) : [] }));
  return { W, H, Pl, Pt, Pb, n, X, Y, grid, lines, xl: labels.map((l, i) => ((n - 1 - i) % ls == 0 ? { x: X(i), l } : null)).filter(Boolean), keys: H0.keys, labels };
});
function lShow(e) {
  const d = lD.value; if (!d) return; const r = e.currentTarget.getBoundingClientRect(), vx = (e.clientX - r.left) * (d.W / r.width);
  let i = 0, best = 1e9; for (let j = 0; j < d.n; j++) { const dd = Math.abs(d.X(j) - vx); if (dd < best) { best = dd; i = j; } }
  lSel.value = i;
  requestAnimationFrame(() => { const w = lTip.value?.offsetWidth || 140, x = d.X(i); lLx.value = Math.max(0, Math.min(d.W - w, x + w + 14 > d.W ? x - w - 12 : x + 12)); });
}
const lineNow = computed(() => (lD.value && lSel.value != null ? lD.value.lines.map((l) => [l.k, l.vals[lSel.value]]).sort((a, b) => b[1] - a[1]).slice(0, 7) : []));
const lOpen = (k) => { const mk = lD.value.keys[lSel.value]; goActivity({ from: mk + "-01", to: mk + "-31", cat: k, ty: RN.lt == "inc" ? "income" : "expense" }); };
const lineType = computed({ get: () => (RN.lt == "inc" ? "inc" : "exp"), set: (v) => { RN.lt = v; lSel.value = null; lineHot.value = null; } });
const typeOpts = computed(() => [{ value: "exp", label: t("rep.expenses") }, { value: "inc", label: t("rep.income") }]);
// a legend chip: the first tap brings its line forward (the computer's hover), the second opens it in Activity
const tapLeg = (k) => { if (lineHot.value === k) goActivity({ cat: k }); else lineHot.value = k; };
</script>

<template>
  <PhoneScreen class="ph-rep">
    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <template v-else-if="!M">
      <div class="ph-rep-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>
    <EmptyState v-else-if="!trm || !trDraw || !S.tx?.length" :icon="icon" :title="P('nothing')" :text="P('nothingText')" :action="S.tx?.length ? '' : t('home.connect')" @action="nav.push('settingsSection', 'conn')">
      <button v-if="!S.tx?.length" type="button" class="ph-btn tonal" @click="openForm('tx')">{{ t("home.addTx") }}</button>
    </EmptyState>

    <template v-else>
      <!-- the main chart -->
      <section class="ph-group ph-rep-in" :aria-label="whatName">
        <div class="ph-card ph-rep-nw">
          <button type="button" class="ph-rep-sel big" :aria-label="t('rep.whatToShow')" @click="whatOpen = true"><span>{{ whatName }}</span><PIcon name="chevron" class="ph-rep-down" /></button>
          <Segmented :model-value="TR.v" :options="styleSeg" :label="P('chartStyle')" @update:model-value="setStyle" />
          <Segmented :model-value="TR.r" :options="rangeSeg" :label="t('rep.monthsShown')" @update:model-value="setRange" />
          <div class="ph-rep-togs">
            <span class="ph-rep-tog"><label class="tg trtog" :class="{ off: trm.noCmp }"><input type="checkbox" :checked="TR.c && !trm.noCmp" :disabled="trm.noCmp" @change="TR.c = $event.target.checked"><span>{{ t("rep.compare") }}</span></label><button type="button" class="ph-rep-i" :aria-label="t('rep.compareTip')" @click="explain(compareTip)"><PIcon name="info" /></button></span>
            <label v-if="trm.isNW && hasPension" class="tg trtog"><input type="checkbox" :checked="trm.wp" @change="setPension"><span>{{ t("rep.withPension") }}</span></label>
          </div>
          <div class="trhead ph-rep-head">
            <div class="val ph-amt"><small>₪</small>{{ neg(trm.big) }}{{ f0(trm.big) }}</div>
            <div class="sm trdelta"><template v-if="trm.delta.pill"><Bd :d="trm.delta.pill" />{{ trm.delta.rest }}</template><template v-else>{{ trm.delta.text }}</template></div>
          </div>
          <div class="ph-rep-chart" dir="ltr" :ref="(e) => (nwA.el.value = e)">
            <div class="trw" :key="trM + TR.v + TR.r + TR.c">
              <svg class="trs ph-rep-draw" :class="trDraw.kind" :width="trDraw.W" :height="trDraw.H" :viewBox="`0 0 ${trDraw.W} ${trDraw.H}`" role="img" :aria-label="whatName" @pointerdown="trShow" @pointermove="trShow">
                <defs><linearGradient id="ph-tgm" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="trm.col" stop-opacity=".32" /><stop offset="1" :stop-color="trm.col" stop-opacity="0" /></linearGradient></defs>
                <template v-for="(g, i) in trDraw.grid" :key="'g' + i"><line class="gl" :x1="trDraw.Pl" :x2="trDraw.W - 8" :y1="g.y" :y2="g.y" :stroke-dasharray="g.zero ? undefined : '2 5'" /><text :x="trDraw.Pl - 7" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
                <text v-for="(l, i) in trDraw.xl" :key="'x' + i" :x="l.x" :y="trDraw.H - 8" text-anchor="middle">{{ l.l }}</text>
                <template v-if="trDraw.kind == 'bars'"><template v-for="(b, i) in trDraw.bars" :key="'b' + i"><rect class="ph-rep-col" :style="{ '--j': i }" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :rx="b.rx" :fill="b.neg ? 'var(--neg)' : trm.col" :fill-opacity="trHov && trHov.i == i ? 1 : b.op" /><line v-if="b.p" :x1="b.p.x1" :x2="b.p.x2" :y1="b.p.y" :y2="b.p.y" stroke="var(--tx)" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round" /></template></template>
                <template v-else>
                  <polyline v-if="trDraw.prevPts" fill="none" stroke="var(--tx)" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" :points="trDraw.prevPts" />
                  <polygon v-if="trDraw.kind == 'area'" class="ph-rep-area" fill="url(#ph-tgm)" :points="trDraw.area" />
                  <polyline class="ph-rep-line" pathLength="1" fill="none" :stroke="trm.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" :points="trDraw.pts" />
                  <circle v-for="(d, i) in trDraw.dots" :key="'d' + i" class="ph-rep-dotp" :cx="d.x" :cy="d.y" r="3" fill="var(--bg)" :stroke="trm.col" stroke-width="2" />
                  <g class="ph-rep-end"><circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="9" :fill="trm.col" fill-opacity=".18" /><circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="4.5" :fill="trm.col" /></g>
                </template>
                <line v-if="trHov" :x1="trHov.x" :x2="trHov.x" :y1="trDraw.Pt" :y2="trDraw.H - trDraw.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" />
                <circle v-if="trHov && trDraw.kind != 'bars'" r="5.5" :cx="trHov.x" :cy="trHov.y" :fill="trm.col" stroke="var(--bg)" stroke-width="2" />
              </svg>
              <div v-if="trHov" ref="tipEl" class="trtip ph-rep-tip" :style="{ insetInlineStart: trHov.lx + 'px', top: trHov.top + 'px' }"><b>{{ trm.fullL[trHov.i] }}</b><span>{{ fm(trm.vals[trHov.i]) }}</span><small v-if="trm.prev">{{ t("rep.prevLabel", { amt: fm(trm.prev[trHov.i]) }) }}</small><button type="button" class="ph-link" @click="goActivity(goSpec(trm.ms[trHov.i]))">{{ P("see") }}<PIcon name="chevron" dir /></button></div>
            </div>
          </div>
          <div class="trstats ph-rep-stats"><button v-for="s in trm.stats" :key="s[0]" type="button" @click="explain(statTip(s))"><span>{{ s[1] }}<template v-if="s[3]">{{ " " }}<small>(<bdi>{{ s[3] }}</bdi>)</small></template></span><b class="num ph-amt" :class="{ neg: s[0] == 'chg' && s[2] < 0 }">{{ neg(s[2]) }}{{ fm(Math.abs(s[2])) }}</b></button></div>
        </div>
      </section>

      <!-- this month against the same days of last month -->
      <ListGroup v-if="cmp" class="ph-rep-in" :title="t('rep.cmpTitle')" pad>
        <p class="sm cmpsub ph-rep-sub">{{ t("rep.cmpSub") }}</p>
        <div class="cmpb cur">
          <div class="lbl"><i class="cd" />{{ MNAME(MK) }}<span class="tpill" :class="!cmp.same ? '' : cmp.dir > 0 ? 'up' : cmp.dir < 0 ? 'dn' : 'eq'"><template v-if="cmp.same"><PIcon v-if="cmp.dir" name="chevron" class="ph-rep-bdi" :class="cmp.dir > 0 ? 'u' : 'd'" /><span v-else>=</span><span>{{ cmp.p }}%</span></template><span>{{ t("rep.soFar") }}</span></span></div>
          <div class="val ph-amt"><small>₪</small>{{ f0(cmp.thisTot) }}</div>
          <div class="sm cmpx"><template v-if="cmp.same">{{ cmp.p ? t(cmp.d > 0 ? "rep.moreThan" : "rep.lessThan", { p: cmp.p }) : t("rep.sameAs") }} {{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}</template><template v-else>{{ t("rep.nothingByDay", { month: pmN, day: cmp.DAYN }) }}</template></div>
        </div>
        <div class="cmpb prev">
          <div class="lbl"><i class="cd" />{{ pmN }}<span class="tpill">{{ t("rep.fullMonth") }}</span></div>
          <div class="val ph-amt"><small>₪</small>{{ f0(cmp.lastTot) }}</div>
          <div class="sm cmpx">{{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}<template v-if="cmp.lastTot">{{ " " }}{{ t("rep.shareOfMonth", { pc: pc(cmp.same, cmp.lastTot), tot: f0(cmp.lastTot), month: pmN }) }}</template></div>
        </div>
        <div class="ph-rep-cmpr">
          <div class="cmplg"><span class="tpill"><i class="cd" /><span>{{ t("rep.monthSoFar", { month: MNAME(MK) }) }}</span></span><span class="tpill g"><i class="cd" /><span>{{ t("rep.sameDays", { month: pmN }) }}</span></span></div>
          <button v-for="(r, i) in cmp.rows" :key="r.k" type="button" class="ph-rep-crow" :style="{ '--i': i }" @click="goActivity({ cat: r.k })">
            <span class="ph-rep-crow-h"><b class="catl">{{ catName(r.k) }}</b><span class="sm ph-amt">₪{{ f0(r.a) }} <span class="ph-rep-vs">{{ t("rep.vs") }} ₪{{ f0(r.b) }}</span></span></span>
            <span class="bar ph-rep-b1"><i :style="{ width: (r.a / cmp.mx) * 100 + '%' }" /></span><span class="bar ph-rep-b2"><i :style="{ width: (r.b / cmp.mx) * 100 + '%' }" /></span>
          </button>
        </div>
      </ListGroup>

      <!-- income against expenses -->
      <ListGroup v-if="bD" class="ph-rep-in" :title="t('rep.incVsExp')" pad>
        <template #head><button type="button" class="ph-rep-sel" :aria-label="t('rep.monthsShown')" @click="picker = { id: 'bars', kind: 'months' }"><span>{{ monthsOf(RN.bars) }}</span><PIcon name="chevron" class="ph-rep-down" /></button></template>
        <div class="ph-rep-chart" dir="ltr" :ref="(e) => (bSize.el.value = e)">
          <div class="trw tight" :key="RN.bars">
            <svg :viewBox="`0 0 ${bD.W} ${bD.H}`" :width="bD.W" :height="bD.H" class="ph-rep-draw" role="img" :aria-label="t('rep.incVsExp')" @pointerdown="bShow" @pointermove="bShow">
              <template v-for="(g, i) in bD.grid" :key="'g' + i"><line class="gl" :x1="bD.Pl" :x2="bD.W - 4" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="bD.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
              <rect v-if="bSel != null" class="ph-rep-band" :x="bD.Pl + bSel * bD.band" :y="bD.Pt - 6" :width="bD.band" :height="bD.H - bD.Pt - bD.Pb + 6" rx="6" />
              <template v-for="(c, i) in bD.cols" :key="c.mk">
                <rect class="ph-rep-col" :style="{ '--j': i }" :x="c.i.x" :y="c.i.y" :width="c.bw" :height="Math.max(0, c.i.h)" :rx="Math.min(5, c.bw / 2)" fill="var(--inc)" />
                <rect class="ph-rep-col" :style="{ '--j': i }" :x="c.e.x" :y="c.e.y" :width="c.bw" :height="Math.max(0, c.e.h)" :rx="Math.min(5, c.bw / 2)" fill="var(--exp)" />
                <text v-if="c.l" :x="c.cx" :y="bD.H - 6" text-anchor="middle">{{ c.l }}</text>
              </template>
            </svg>
            <div v-if="bSel != null" ref="bTip" class="trtip m ph-rep-tip" :style="{ insetInlineStart: bLx + 'px', top: '0px' }">
              <b>{{ MNAME(barsData.keys[bSel]) }} {{ barsData.keys[bSel].slice(0, 4) }}</b>
              <button type="button" class="ph-rep-tipr" @click="bOpen('income')"><i class="tdot" style="background: var(--inc)" />{{ t("rep.income") }} ₪{{ f0(barsData.inc[bSel]) }}<PIcon name="chevron" dir /></button>
              <button type="button" class="ph-rep-tipr" @click="bOpen('expense')"><i class="tdot" style="background: var(--exp)" />{{ t("rep.expenses") }} ₪{{ f0(barsData.exp[bSel]) }}<PIcon name="chevron" dir /></button>
            </div>
          </div>
        </div>
        <div class="flex sm ph-rep-key"><span><span class="dot" style="background: var(--inc)" /> {{ t("rep.income") }}</span><span><span class="dot" style="background: var(--exp)" /> {{ t("rep.expenses") }}</span></div>
      </ListGroup>

      <!-- top merchants -->
      <ListGroup v-if="merch" class="ph-rep-in" :title="t('rep.topMerch')" pad>
        <template #top>
          <div class="ph-rep-ctl">
            <button type="button" class="ph-rep-sel" :aria-label="t('activity.timeFrame')" @click="picker = { id: 'merch', kind: 'range' }"><span>{{ rangeName("merch") }}</span><PIcon name="chevron" class="ph-rep-down" /></button>
            <button type="button" class="ph-rep-sel" :aria-label="t('rep.compareWith')" @click="picker = { id: 'merch', kind: 'cmp' }"><span>{{ cmpLabel("merch") }}</span><PIcon name="chevron" class="ph-rep-down" /></button>
          </div>
        </template>
        <p v-if="!merch.rows.length" class="sm">{{ t("rep.noSpendPeriod") }}</p>
        <div v-for="(r, i) in merch.rows" :key="r.n" class="ph-rep-mrow" :style="{ '--i': i }">
          <button type="button" class="ph-rep-mmain" @click="goActivity({ q: r.n })">
            <span class="ph-rep-mtop"><span class="ph-rep-mname">{{ r.n }}</span><Bd v-if="merch.prev && dlt(r.v, r.before)" :d="dlt(r.v, r.before)" /><b class="ph-amt">₪{{ f0(r.v) }}</b></span>
            <span class="mpills ph-rep-mpills"><span v-if="r.cat" class="mpill"><i class="cd" :style="{ background: cc(r.cat) }" />{{ catName(r.cat) }}</span><span class="mpill">{{ r.count == 1 ? t("rep.payment1") : t("rep.paymentN", { n: r.count }) }}</span><span v-if="r.bill" class="mpill b">{{ r.bill == "irregular" ? t("rep.irregularBill") : t("rep.bill") }}</span></span>
            <span class="bar"><i :style="{ width: (r.v / merch.mx) * 100 + '%' }" /></span>
            <span v-if="merch.prev" class="sm ph-rep-before">{{ t("rep.beforeAmt", { amt: "₪" + f0(r.before) }) }}</span>
          </button>
          <button type="button" class="ph-rep-mh" :aria-label="t('rep.hideAria', { n: r.n })" @click="hideMerch(r.n)"><PIcon name="close" /></button>
        </div>
        <p v-if="merchCmp" class="sm ph-rep-note">{{ t("rep.comparedWith") }} {{ cmpName(merchCmp) }}</p>
        <div v-if="merch.hidden.length" class="sm ph-rep-hidden">{{ t("rep.hiddenFrom") }} <button v-for="n in merch.hidden" :key="n" type="button" class="chip dchip" :aria-label="t('rep.showAgain') + ': ' + n" @click="showMerch(n)">{{ n }} ↩</button></div>
      </ListGroup>

      <!-- spending by category, and by tag -->
      <ListGroup v-for="b in blocks" :key="b.id" class="ph-rep-in" :title="b.title" pad>
        <template #top>
          <div class="ph-rep-ctl">
            <button type="button" class="ph-rep-sel" :aria-label="t('activity.timeFrame')" @click="picker = { id: b.id, kind: 'range' }"><span>{{ rangeName(b.id) }}</span><PIcon name="chevron" class="ph-rep-down" /></button>
            <button type="button" class="ph-rep-sel" :aria-label="t('rep.compareWith')" @click="picker = { id: b.id, kind: 'cmp' }"><span>{{ cmpLabel(b.id) }}</span><PIcon name="chevron" class="ph-rep-down" /></button>
          </div>
        </template>
        <p v-if="!b.D || !b.B?.ents.length" class="sm">{{ b.none }}</p>
        <template v-else>
          <div class="dnt ph-rep-dnt" :class="{ hv: b.hot.value }">
            <div class="ph-rep-ring">
              <svg viewBox="0 0 200 200" class="dsvg" role="img" :aria-label="b.title">
                <path v-for="p in b.D.parts" :key="p.n" :d="p.d" :fill="p.color" :class="{ on: b.hot.value === p.n }" @click="tapPart(b, p.n)" />
              </svg>
              <div class="ph-rep-ring-c">
                <template v-if="ringMid(b)"><b class="ph-amt">₪{{ f0(ringMid(b).v) }}</b><span>{{ ringMid(b).l }}</span><small>{{ ringMid(b).pc }}%</small></template>
                <template v-else><b class="ph-amt">₪{{ f0(b.D.tot) }}</b><span>{{ t("rep.spentPeriod") }}</span></template>
              </div>
            </div>
            <div class="legend ph-rep-leg"><button v-for="p in b.D.parts" :key="p.n" type="button" :class="{ on: b.hot.value === p.n }" data-k="" @click="b.go(p.n)"><span class="dot" :style="{ background: p.color }" /><span class="catl">{{ p.label }}</span><b class="ph-amt">₪{{ f0(p.v) }}</b></button></div>
          </div>
          <div v-if="b.B.prev" class="ph-rep-cmp">
            <div class="sm ph-rep-cmpline">{{ t("rep.comparedWith") }} <b>{{ cmpName(b.B.B.cr) }}</b>{{ t("rep.totalVs", { a: fm(totalOf(b.B.cur)), b: fm(totalOf(b.B.prev)) }) }} <Bd v-if="dlt(totalOf(b.B.cur), totalOf(b.B.prev))" :d="dlt(totalOf(b.B.cur), totalOf(b.B.prev))" /></div>
            <div class="cmprow hd"><span>{{ b.col }}</span><span>{{ t("rep.thisPeriod") }}</span><span>{{ t("rep.before") }}</span><span /></div>
            <button v-for="k in b.B.keys.slice(0, 10)" :key="k" type="button" class="cmprow" @click="b.go(k)">
              <span class="ph-rep-cn"><span v-if="b.id == 'cat'" class="dot" :style="{ background: cc(k) }" /><bdi class="catl">{{ b.name(k) }}</bdi></span>
              <b class="num ph-amt">{{ fm(b.B.cur[k] || 0) }}</b><span class="sm num ph-amt">{{ fm(b.B.prev[k] || 0) }}</span>
              <Bd v-if="dlt(b.B.cur[k] || 0, b.B.prev[k] || 0)" :d="dlt(b.B.cur[k] || 0, b.B.prev[k] || 0)" /><span v-else />
            </button>
          </div>
        </template>
      </ListGroup>

      <!-- the category trend -->
      <ListGroup v-if="lD" class="ph-rep-in" :title="t('rep.catTrend')" pad>
        <template #head><button type="button" class="ph-rep-sel" :aria-label="t('rep.monthsShown')" @click="picker = { id: 'lines', kind: 'months' }"><span>{{ monthsOf(RN.lines) }}</span><PIcon name="chevron" class="ph-rep-down" /></button></template>
        <template #top><Segmented v-model="lineType" :options="typeOpts" :label="t('rep.type')" /></template>
        <p v-if="!lD.lines.length" class="sm">{{ RN.lt == "inc" ? t("rep.noIncomeMonths") : t("rep.noSpendMonths") }}</p>
        <div v-else id="ph-lines" :class="{ hv: lineHot }">
          <div class="ph-rep-chart" dir="ltr" :ref="(e) => (lSize.el.value = e)">
            <div class="trw tight" :key="RN.lt + RN.lines">
              <svg :viewBox="`0 0 ${lD.W} ${lD.H}`" :width="lD.W" :height="lD.H" class="ph-rep-draw" role="img" :aria-label="t('rep.catTrend')" @pointerdown="lShow" @pointermove="lShow">
                <template v-for="(g, i) in lD.grid" :key="'g' + i"><line class="gl" :x1="lD.Pl" :x2="lD.W - 4" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="lD.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
                <text v-for="(l, i) in lD.xl" :key="'x' + i" :x="l.x" :y="lD.H - 6" text-anchor="middle">{{ l.l }}</text>
                <g v-for="l in lD.lines" :key="l.k" class="ls" :class="{ on: lineHot === l.k }">
                  <polyline class="ph-rep-line" pathLength="1" fill="none" :stroke="cc(l.k)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" />
                  <circle v-for="d in l.dots" :key="d.i" class="ph-rep-dotp" :cx="d.x" :cy="d.y" r="3.5" fill="var(--bg)" :stroke="cc(l.k)" stroke-width="2.2" />
                </g>
                <line v-if="lSel != null" :x1="lD.X(lSel)" :x2="lD.X(lSel)" :y1="lD.Pt" :y2="lD.H - lD.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" />
              </svg>
              <div v-if="lSel != null" ref="lTip" class="trtip m ph-rep-tip" :style="{ insetInlineStart: lLx + 'px', top: '0px' }">
                <b>{{ lD.labels[lSel] }}</b>
                <button v-for="[k, v] in lineNow" :key="k" type="button" class="ph-rep-tipr" @click="lOpen(k)"><i class="tdot" :style="{ background: cc(k) }" />{{ catName(k) }} ₪{{ f0(v) }}</button>
              </div>
            </div>
          </div>
          <div class="trleg ph-rep-tleg"><button v-for="l in lD.lines" :key="l.k" type="button" class="lgi" :class="{ on: lineHot === l.k }" @click="tapLeg(l.k)"><span class="dot" :style="{ background: cc(l.k) }" /><span class="catl">{{ catName(l.k) }}</span><b class="num ph-amt">₪{{ f0(l.total) }}</b></button></div>
        </div>
      </ListGroup>
    </template>

    <!-- sheets -->
    <PickerSheet v-model:open="whatOpen" required :title="t('rep.whatToShow')" :options="whatOpts" :model-value="trM" @update:model-value="pickWhat" />
    <PickerSheet v-model:open="pickOpen" required :title="pickTitle" :options="pickOpts" :model-value="pickVal" @update:model-value="picked" />
    <PhoneSheet :open="!!dates" :title="t('phone.activity.custom')" @update:open="(v) => !v && (dates = null)">
      <div v-if="dates" class="ph-rep-dates">
        <label class="fld">{{ t("activity.cal.start") }}<input v-model="dates.from" type="date" /></label>
        <label class="fld">{{ t("activity.cal.end") }}<input v-model="dates.to" type="date" :min="dates.from || undefined" /></label>
      </div>
      <template #foot><button type="button" class="ph-btn" :disabled="!dates?.from" @click="applyDates">{{ t("activity.cal.apply") }}</button></template>
    </PhoneSheet>
  </PhoneScreen>
</template>
