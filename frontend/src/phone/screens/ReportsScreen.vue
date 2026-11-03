<script setup>
// Reports (in More): the months behind, in charts. It opens with the main chart's answer in one sentence (how much money
// there is now, or what a kind of spending or income came to), then the main chart, this month against last, income against
// expenses, top merchants, spending by category and by tag, and the category trend. Every chart answers a tap or a slide
// along it with the month's numbers above it (no hover). Every number comes from pagelogic/reports.js, as on the computer.
import { ref, computed, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { useReports } from "../../pagelogic/reports.js";
import { openForm } from "../../core/forms.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import StatTile from "../components/StatTile.vue";
import Segmented from "../components/Segmented.vue";
import SwipeRow from "../components/SwipeRow.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
import { pages } from "../../routes.js";
defineProps({ id: { type: String, default: null } });

const {
  t, S, M, MK, MNAME, MSHORT, catName, cc, RNG, RN, CMP, TR, cmpOpts, monOpts, rangeOpts, cmpName, cal, calApply, nice, fmAx, useSize,
  optGroups, trM, hasPension, trm, goSpec, nwA, trDraw, setPension, cmp, pmN, barsData, linesData, monLabels,
  catB, tagB, merch, merchCmp, catDonut, tagDonut, dlt, hideMerch, showMerch, totalOf, fm, f0, goActivity,
} = useReports();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.reports." + k, o || {}, n);
const nav = usePhoneNav();
const icon = pages.find((p) => p.name === "reports")?.icon || "";
const money = (v) => (v < 0 ? "−" : "") + fm(Math.abs(v));
// a month as "Oct 2026"
const monthYear = (m) => MSHORT(m) + " " + m.slice(0, 4);

// ---- the opening sentence: the main chart's answer ----
const whatName = computed(() => optGroups.value.flatMap((g) => g[1]).find((o) => o[0] === trM.value)?.[1] || "");
const hero = computed(() => {
  const m = trm.value; if (!m) return [];
  // a word joiner keeps a full stop or comma on the same line as the large amount before it
  const split = (text) => text.split("\u0000").map((x, i) => (i && /^[.,]/.test(x) ? "\u2060" + x : x));
  if (m.isNW) {
    const ch = m.vals[m.n - 1] - m.vals[0], [a, b] = split(P(ch >= 0 ? "nwUp" : "nwDown", { amount: "\u0000", change: fm(Math.abs(ch)), month: monthYear(m.ms[0]) }));
    return [{ text: a }, { amount: money(m.big) }, { text: b }];
  }
  const [a, b] = split(P("sum", { what: whatName.value, amount: "\u0000", n: m.n, avg: money(m.big / m.n) }));
  return [{ text: a }, { amount: money(m.big) }, { text: b }];
});

// ---- tap or slide along a chart: the month under the finger (the chart is drawn left to right in both languages) ----
// pick(e, draw): the index under the finger for a chart with { Pl, band, n }
const pickAt = (e, d) => { const r = e.currentTarget.getBoundingClientRect(), k = d.W / r.width; return Math.max(0, Math.min(d.n - 1, Math.floor(((e.clientX - r.left) * k - d.Pl) / d.band))); };
const scrub = (sel, d) => (e) => { if (d.value) sel.value = pickAt(e, d.value); };

// ---- 1. the main chart ----
const trSel = ref(null);
const trD = computed(() => (trDraw.value ? { ...trDraw.value, n: trm.value.vals.length } : null));
const trI = computed(() => { const n = trm.value?.vals.length || 0; return trSel.value != null && trSel.value < n ? trSel.value : n - 1; });
const trScrub = scrub(trSel, trD);
const rangeSeg = computed(() => [[3, t("rep.r3")], [6, t("rep.r6")], [12, t("rep.r12")], [36, t("rep.r36")], [0, t("rep.rAll")]].map(([value, label]) => ({ value, label })));
const setRange = (v) => { TR.r = v; trSel.value = null; };
const styles = computed(() => [["area", t("rep.area")], ["line", t("rep.line")], ["bars", t("rep.bars")]]);
const tileVal = (s) => money(s[2]);
// what the chart shows: one list with each group's name under the choice
const whatOpen = ref(false);
const whatOpts = computed(() => optGroups.value.flatMap(([g, list]) => list.map(([value, label]) => ({ value, label, sub: g }))));
const pickWhat = (v) => { if (v) { TR.m = v; trSel.value = null; } };
// ⋯: chart style, compare with the months before, include pension
const more = ref(false), styleOpen = ref(false);
const moreActs = computed(() => {
  const m = trm.value; if (!m) return [];
  const a = [{ label: P("style", { style: styles.value.find((s) => s[0] === TR.v)[1] }), run: () => (styleOpen.value = true) }];
  if (!m.noCmp) a.push({ label: TR.c ? P("compareOff") : P("compareOn"), run: () => (TR.c = !TR.c) });
  if (m.isNW && hasPension.value) a.push({ label: m.wp ? P("pensionOff") : P("pensionOn"), run: () => setPension({ target: { checked: !m.wp } }) });
  return a;
});

// ---- 2. this month against last month ----
const cmpLine = computed(() => {
  const c = cmp.value; if (!c) return "";
  return c.same ? (c.p ? t(c.d > 0 ? "rep.moreThan" : "rep.lessThan", { p: c.p }) : t("rep.sameAs")) + " " + t("rep.byDay", { month: pmN.value, day: c.DAYN, amt: f0(c.same) }) : t("rep.nothingByDay", { month: pmN.value, day: c.DAYN });
});

// ---- 3. income against expenses: two bars a month ----
const bSize = useSize(), bSel = ref(null);
const bD = computed(() => {
  const H0 = barsData.value; if (!H0) return null;
  const W = Math.max(260, bSize.w.value || 328), H = 190, Pl = 34, Pr = 4, Pt = 10, Pb = 24, n = H0.keys.length, band = (W - Pl - Pr) / n;
  const mx0 = Math.max(1, ...H0.inc, ...H0.exp), step = nice(mx0 / 3), mx = Math.ceil(mx0 / step) * step, Y = (v) => Pt + (1 - v / mx) * (H - Pt - Pb);
  const bw = Math.max(2, Math.min(14, band * 0.34)), labels = monLabels(H0), ls = Math.max(1, Math.ceil(n / Math.floor((W - Pl) / 42)));
  const grid = []; for (let v = 0; v <= mx; v += step) grid.push({ y: Y(v), label: fmAx(v) });
  return { W, H, Pl, Pt, Pb, band, n, grid, cols: H0.keys.map((mk, i) => { const cx = Pl + (i + 0.5) * band; return { mk, cx, l: (n - 1 - i) % ls == 0 ? labels[i] : "", i: { x: cx - bw - 1, y: Y(H0.inc[i]), h: Y(0) - Y(H0.inc[i]) }, e: { x: cx + 1, y: Y(H0.exp[i]), h: Y(0) - Y(H0.exp[i]) }, bw }; }) };
});
// with nothing picked: the latest month that has something in it (early in a month, the month before)
const lastWith = (n, has) => { for (let i = n - 1; i >= 0; i--) if (has(i)) return i; return n - 1; };
const bI = computed(() => { const H0 = barsData.value, n = H0?.keys.length || 0; return bSel.value != null && bSel.value < n ? bSel.value : lastWith(n, (i) => H0.inc[i] || H0.exp[i]); });
const bScrub = scrub(bSel, bD);
const monthsOf = (n) => monOpts.value.find((o) => o[0] == n)?.[1] || "";

// ---- 4. top merchants, spending by category and by tag: a time frame and what to compare with, each ----
const picker = ref(null); // { id, kind: "range" | "cmp" }
const pickOpts = computed(() => (!picker.value ? [] : picker.value.kind == "range" ? rangeOpts(picker.value.id).map(([value, label]) => ({ value, label })) : picker.value.kind == "cmp" ? cmpOpts.value.map(([value, label]) => ({ value, label })) : monOpts.value.map(([value, label]) => ({ value, label }))));
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

// a merchant: tap to see its payments; slide or hold it to hide it (it is not a shop: a card company, a landlord, a person)
const held = ref(null);
const heldActs = computed(() => (held.value ? [{ label: P("seePayments"), run: () => goActivity({ q: held.value }) }, { label: P("hide"), danger: true, run: () => hideMerch(held.value) }] : []));
const heldOpen = computed({ get: () => !!held.value, set: (v) => { if (!v) held.value = null; } });
const tapMerch = (n) => goActivity({ q: n });
const hiddenOpen = ref(false);
const hiddenActs = computed(() => (merch.value?.hidden || []).map((n) => ({ label: P("showName", { name: n }), run: () => showMerch(n) })));

// spending by category and by tag: the ring (tap a part to see it in the middle) and every row, long lists folded
const blocks = computed(() => [
  { id: "cat", title: t("rep.spendCat"), B: catB.value, D: catDonut.value, name: (k) => catName(k), color: (k) => cc(k), go: (k) => goActivity({ cat: k }), none: t("rep.noSpendPeriod") },
  { id: "tag", title: t("rep.spendTag"), B: tagB.value, D: tagDonut.value, name: (k) => "#" + k, color: (k, i) => tagDonut.value?.parts.find((p) => p.n == k)?.color || `var(--c${i % 7})`, go: (k) => goActivity({ tag: k }), none: t("rep.noTagged") },
]);
const ringSel = ref({ cat: null, tag: null }), allRows = ref({ cat: false, tag: false });
const rowsOf = (b) => (b.B ? (b.B.prev ? b.B.keys : b.B.ents.map((e) => e[0])) : []);
const ringMid = (b) => { const p = b.D?.parts.find((x) => x.n == ringSel.value[b.id]); return p ? { v: p.v, l: p.label, pc: Math.round((p.v / b.D.tot) * 100) } : null; };

// ---- 5. the category trend: one line a category ----
const lSize = useSize(), lSel = ref(null);
const lD = computed(() => {
  const H0 = linesData.value; if (!H0) return null;
  const W = Math.max(260, lSize.w.value || 328), H = 200, Pl = 34, Pr = 4, Pt = 10, Pb = 24, n = H0.keys.length, band = (W - Pl - Pr) / n, all = Object.values(H0.cat).flat();
  const mx0 = Math.max(1, ...all), step = nice(mx0 / 3), mx = Math.ceil(mx0 / step) * step, X = (i) => Pl + (i + 0.5) * band, Y = (v) => Pt + (1 - v / mx) * (H - Pt - Pb);
  const labels = monLabels(H0), ls = Math.max(1, Math.ceil(n / Math.floor((W - Pl) / 42))), grid = []; for (let v = 0; v <= mx; v += step) grid.push({ y: Y(v), label: fmAx(v) });
  const lines = Object.entries(H0.cat).map(([k, a]) => ({ k, vals: a, total: a.reduce((s, v) => s + v, 0), pts: a.map((v, i) => X(i) + "," + Y(v)).join(" ") }));
  return { W, H, Pl, Pt, Pb, band, n, X, Y, grid, lines, xl: labels.map((l, i) => ((n - 1 - i) % ls == 0 ? { x: X(i), l } : null)).filter(Boolean), keys: H0.keys };
});
const lI = computed(() => { const H0 = linesData.value, n = H0?.keys.length || 0; return lSel.value != null && lSel.value < n ? lSel.value : lastWith(n, (i) => Object.values(H0.cat).some((a) => a[i])); });
const lScrub = scrub(lSel, lD);
const lineType = computed({ get: () => (RN.lt == "inc" ? "inc" : "exp"), set: (v) => { RN.lt = v; lSel.value = null; } });
const typeOpts = computed(() => [{ value: "exp", label: t("rep.expenses") }, { value: "inc", label: t("rep.income") }]);
const lineNow = computed(() => (lD.value ? lD.value.lines.map((l) => [l.k, l.vals[lI.value]]).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1]) : []));
const lineTotals = computed(() => (lD.value ? [...lD.value.lines].sort((a, b) => b.total - a.total) : []));
</script>

<template>
  <PhoneScreen class="ph-rep">
    <template v-if="trm" #actions>
      <IconButton :label="P('options')" icon-name="more" @tap="more = true" />
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <template v-else-if="!M">
      <div class="ph-rep-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>
    <EmptyState v-else-if="!trm || !trD || !S.tx?.length" :icon="icon" :title="P('nothing')" :text="P('nothingText')" :action="S.tx?.length ? '' : t('home.connect')" @action="nav.push('settingsSection', 'conn')">
      <button v-if="!S.tx?.length" type="button" class="ph-btn tonal" @click="openForm('tx')">{{ t("home.addTx") }}</button>
    </EmptyState>

    <template v-else>
      <!-- the main chart's answer in one sentence -->
      <HeroSentence :class="{ neg: trm.big < 0 }" :parts="hero" />

      <!-- the main chart: what it shows as its heading (touch to change it), the months to show, then the chart with the month
           under the finger above it -->
      <section class="ph-group ph-rep-main" :aria-label="whatName">
        <div class="ph-group-h"><button type="button" class="ph-rep-what" :aria-label="t('rep.whatToShow')" @click="whatOpen = true"><h3>{{ whatName }}</h3><PIcon name="chevron" class="ph-rep-down" /></button></div>
        <Segmented :model-value="TR.r" :options="rangeSeg" :label="t('rep.monthsShown')" @update:model-value="setRange" />
        <div class="ph-group-b ph-rep-card">
          <div class="ph-rep-read">
            <span class="ph-rep-read-m"><b>{{ trm.fullL[trI] }}</b><small v-if="trm.prev">{{ P("before", { amount: money(trm.prev[trI]) }) }}</small></span>
            <b class="ph-amt" :class="{ neg: trm.vals[trI] < 0 }">{{ money(trm.vals[trI]) }}</b>
          </div>
          <div class="ph-rep-chart" dir="ltr" :ref="(e) => (nwA.el.value = e)">
            <svg :viewBox="`0 0 ${trD.W} ${trD.H}`" :width="trD.W" :height="trD.H" role="img" :aria-label="whatName" @pointerdown="trScrub" @pointermove="trScrub">
              <defs><linearGradient id="ph-rep-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="trm.col" stop-opacity=".28" /><stop offset="1" :stop-color="trm.col" stop-opacity="0" /></linearGradient></defs>
              <template v-for="(g, i) in trD.grid" :key="'g' + i"><line class="gl" :class="{ z: g.zero }" :x1="trD.Pl" :x2="trD.W - 4" :y1="g.y" :y2="g.y" /><text class="ax" :x="trD.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
              <text v-for="(l, i) in trD.xl" :key="'x' + i" class="ax" :x="l.x" :y="trD.H - 7" text-anchor="middle">{{ l.l }}</text>
              <line class="sel" :x1="trD.X(trI)" :x2="trD.X(trI)" :y1="trD.Pt" :y2="trD.H - trD.Pb" />
              <template v-if="trD.kind == 'bars'">
                <template v-for="(b, i) in trD.bars" :key="'b' + i">
                  <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :rx="b.rx" :fill="b.neg ? 'var(--neg)' : trm.col" :fill-opacity="i == trI ? 1 : 0.55" />
                  <line v-if="b.p" class="prev" :x1="b.p.x1" :x2="b.p.x2" :y1="b.p.y" :y2="b.p.y" />
                </template>
              </template>
              <template v-else>
                <polyline v-if="trD.prevPts" class="prev" fill="none" :points="trD.prevPts" />
                <polygon v-if="trD.kind == 'area'" fill="url(#ph-rep-g)" :points="trD.area" />
                <polyline fill="none" :stroke="trm.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" :points="trD.pts" />
                <circle :cx="trD.X(trI)" :cy="trD.Y(trm.vals[trI])" r="10" :fill="trm.col" fill-opacity=".18" /><circle :cx="trD.X(trI)" :cy="trD.Y(trm.vals[trI])" r="5" :fill="trm.col" stroke="var(--p-surf)" stroke-width="2" />
              </template>
            </svg>
          </div>
          <button type="button" class="ph-link ph-rep-see" @click="goActivity(goSpec(trm.ms[trI]))">{{ P("see") }}<PIcon name="chevron" dir /></button>
        </div>
        <p class="ph-group-n">{{ P("slide") }}</p>
        <div class="ph-stats ph-rep-tiles">
          <StatTile v-for="s in trm.stats" :key="s[0]" :label="s[1]" :value="tileVal(s)" :note="s[3] || ''" :tone="s[0] == 'chg' && s[2] < 0 ? 'neg' : ''" />
        </div>
      </section>

      <!-- this month against the same days of last month -->
      <section v-if="cmp" class="ph-group">
        <div class="ph-group-h"><h3>{{ t("rep.cmpTitle") }}</h3></div>
        <div class="ph-stats ph-rep-tiles">
          <StatTile :label="P('thisMonth', { month: MNAME(MK) })" :value="fm(cmp.thisTot)" :note="P('byDay', { month: pmN }) + ': ' + fm(cmp.same)" />
          <StatTile :label="P('lastMonth', { month: pmN })" :value="fm(cmp.lastTot)" :note="cmp.lastTot ? t('rep.shareOfMonth', { pc: Math.round((cmp.same / cmp.lastTot) * 100), tot: f0(cmp.lastTot), month: pmN }) : ''" />
        </div>
        <p class="ph-rep-line">{{ cmpLine }}</p>
        <div v-if="cmp.rows.length" class="ph-group-b">
          <button v-for="r in cmp.rows" :key="r.k" type="button" class="ph-row ph-rep-cmp" @click="goActivity({ cat: r.k })">
            <span class="ph-rep-cmp-h"><span class="ph-row-t">{{ catName(r.k) }}</span><span class="ph-amt">{{ fm(r.a) }}</span><span class="ph-rep-vs">{{ t("rep.vs") }} {{ fm(r.b) }}</span></span>
            <span class="ph-rep-two"><i :style="{ inlineSize: (r.a / cmp.mx) * 100 + '%' }" /><i class="b" :style="{ inlineSize: (r.b / cmp.mx) * 100 + '%' }" /></span>
          </button>
        </div>
        <p class="ph-group-n ph-rep-key"><span><i class="a" />{{ t("rep.monthSoFar", { month: MNAME(MK) }) }}</span><span><i />{{ t("rep.sameDays", { month: pmN }) }}</span></p>
      </section>

      <!-- income against expenses -->
      <section v-if="bD" class="ph-group">
        <div class="ph-group-h"><h3>{{ t("rep.incVsExp") }}</h3><button type="button" class="ph-link ph-rep-pick" @click="picker = { id: 'bars', kind: 'months' }">{{ monthsOf(RN.bars) }}<PIcon name="chevron" class="ph-rep-down" /></button></div>
        <div class="ph-group-b ph-rep-card">
          <div class="ph-rep-read"><b class="ph-rep-read-m">{{ MNAME(barsData.keys[bI]) }} {{ barsData.keys[bI].slice(0, 4) }}</b></div>
          <div class="ph-rep-chart" dir="ltr" :ref="(e) => (bSize.el.value = e)">
            <svg :viewBox="`0 0 ${bD.W} ${bD.H}`" :width="bD.W" :height="bD.H" role="img" :aria-label="t('rep.incVsExp')" @pointerdown="bScrub" @pointermove="bScrub">
              <template v-for="(g, i) in bD.grid" :key="'g' + i"><line class="gl" :class="{ z: i == 0 }" :x1="bD.Pl" :x2="bD.W - 4" :y1="g.y" :y2="g.y" /><text class="ax" :x="bD.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
              <rect class="band" :x="bD.Pl + bI * bD.band" :y="bD.Pt - 6" :width="bD.band" :height="bD.H - bD.Pt - bD.Pb + 6" rx="6" />
              <template v-for="(c, i) in bD.cols" :key="c.mk">
                <rect :x="c.i.x" :y="c.i.y" :width="c.bw" :height="Math.max(0, c.i.h)" :rx="Math.min(4, c.bw / 2)" fill="var(--inc)" :fill-opacity="i == bI ? 1 : 0.7" />
                <rect :x="c.e.x" :y="c.e.y" :width="c.bw" :height="Math.max(0, c.e.h)" :rx="Math.min(4, c.bw / 2)" fill="var(--exp)" :fill-opacity="i == bI ? 1 : 0.7" />
                <text v-if="c.l" class="ax" :x="c.cx" :y="bD.H - 7" text-anchor="middle">{{ c.l }}</text>
              </template>
            </svg>
          </div>
          <ListRow :title="t('rep.income')" link @tap="goActivity({ from: barsData.keys[bI] + '-01', to: barsData.keys[bI] + '-31', ty: 'income' })">
            <template #lead><span class="ph-rep-dot" :style="{ '--d': 'var(--inc)' }" /></template>
            <template #end><span class="ph-amt">{{ fm(barsData.inc[bI]) }}</span></template>
          </ListRow>
          <ListRow :title="t('rep.expenses')" link @tap="goActivity({ from: barsData.keys[bI] + '-01', to: barsData.keys[bI] + '-31', ty: 'expense' })">
            <template #lead><span class="ph-rep-dot" :style="{ '--d': 'var(--exp)' }" /></template>
            <template #end><span class="ph-amt">{{ fm(barsData.exp[bI]) }}</span></template>
          </ListRow>
        </div>
      </section>

      <!-- top merchants -->
      <section v-if="merch" class="ph-group">
        <div class="ph-group-h"><h3>{{ t("rep.topMerch") }}</h3></div>
        <div class="ph-chips ph-rep-ctl">
          <span class="ph-chip"><button type="button" class="ph-chip-b" :aria-label="t('activity.timeFrame')" @click="picker = { id: 'merch', kind: 'range' }">{{ rangeName("merch") }}<PIcon name="chevron" class="ph-rep-down" /></button></span>
          <span class="ph-chip" :class="{ on: CMP.merch != 'none' }"><button type="button" class="ph-chip-b" :aria-label="t('rep.compareWith')" @click="picker = { id: 'merch', kind: 'cmp' }">{{ cmpLabel("merch") }}<PIcon name="chevron" class="ph-rep-down" /></button></span>
        </div>
        <div class="ph-group-b">
          <p v-if="!merch.rows.length" class="ph-rep-none">{{ t("rep.noSpendPeriod") }}</p>
          <SwipeRow v-for="r in merch.rows" :key="r.n" :end="[{ label: P('hide'), tone: 'neg', run: () => hideMerch(r.n) }]" @hold="held = r.n">
            <button type="button" class="ph-row ph-rep-m" @click="tapMerch(r.n)">
              <span class="ph-rep-m-h"><span class="ph-row-t">{{ r.n }}</span><span v-if="merch.prev && dlt(r.v, r.before)" class="ph-rep-pill" :class="dlt(r.v, r.before).cls">{{ dlt(r.v, r.before).text }}</span><span class="ph-amt">{{ fm(r.v) }}</span></span>
              <span class="ph-rep-bar"><i :style="{ inlineSize: (r.v / merch.mx) * 100 + '%' }" /></span>
              <span class="ph-row-s ph-rep-m-s">
                <span v-if="r.cat"><i class="ph-rep-cd" :style="{ background: cc(r.cat) }" />{{ catName(r.cat) }}</span>
                <span>{{ r.count == 1 ? t("rep.payment1") : t("rep.paymentN", { n: r.count }) }}</span>
                <span v-if="r.bill">{{ r.bill == "irregular" ? t("rep.irregularBill") : t("rep.bill") }}</span>
                <span v-if="merch.prev">{{ t("rep.beforeAmt", { amt: fm(r.before) }) }}</span>
              </span>
            </button>
          </SwipeRow>
          <ListRow v-if="merch.hidden.length" :title="P('hidden', { n: merch.hidden.length })" link @tap="hiddenOpen = true" />
        </div>
        <p v-if="merchCmp" class="ph-group-n">{{ t("rep.comparedWith") }} {{ cmpName(merchCmp) }}</p>
      </section>

      <!-- spending by category, and by tag -->
      <section v-for="b in blocks" :key="b.id" class="ph-group">
        <div class="ph-group-h"><h3>{{ b.title }}</h3></div>
        <div class="ph-chips ph-rep-ctl">
          <span class="ph-chip"><button type="button" class="ph-chip-b" :aria-label="t('activity.timeFrame')" @click="picker = { id: b.id, kind: 'range' }">{{ rangeName(b.id) }}<PIcon name="chevron" class="ph-rep-down" /></button></span>
          <span class="ph-chip" :class="{ on: CMP[b.id] != 'none' }"><button type="button" class="ph-chip-b" :aria-label="t('rep.compareWith')" @click="picker = { id: b.id, kind: 'cmp' }">{{ cmpLabel(b.id) }}<PIcon name="chevron" class="ph-rep-down" /></button></span>
        </div>
        <div class="ph-group-b">
          <p v-if="!b.D || !b.B?.ents.length" class="ph-rep-none">{{ b.none }}</p>
          <template v-else>
            <div class="ph-rep-ring">
              <svg viewBox="0 0 200 200" width="184" height="184" role="img" :aria-label="b.title">
                <path v-for="p in b.D.parts" :key="p.n" :d="p.d" :fill="p.color" :class="{ dim: ringSel[b.id] && ringSel[b.id] !== p.n }" @click="ringSel[b.id] = ringSel[b.id] === p.n ? null : p.n" />
              </svg>
              <div class="ph-rep-ring-c">
                <template v-if="ringMid(b)"><b class="ph-amt">{{ fm(ringMid(b).v) }}</b><span>{{ ringMid(b).l }}</span><small>{{ P("share", { pc: ringMid(b).pc }) }}</small></template>
                <template v-else><b class="ph-amt">{{ fm(b.D.tot) }}</b><span>{{ t("rep.spentPeriod") }}</span></template>
              </div>
            </div>
            <ListRow v-for="(k, i) in rowsOf(b).slice(0, allRows[b.id] ? 999 : 6)" :key="k" :class="{ on: ringSel[b.id] === k }" link @tap="b.go(k)">
              <template #title><bdi>{{ b.name(k) }}</bdi></template>
              <template #lead><span class="ph-rep-dot" :style="{ '--d': b.color(k, i) }" /></template>
              <template v-if="b.B.prev" #sub><span>{{ t("rep.beforeAmt", { amt: fm(b.B.prev[k] || 0) }) }}</span></template>
              <template #end>
                <span class="ph-rep-end"><span class="ph-amt">{{ fm(b.B.cur[k] || 0) }}</span><span v-if="b.B.prev && dlt(b.B.cur[k] || 0, b.B.prev[k] || 0)" class="ph-rep-pill" :class="dlt(b.B.cur[k] || 0, b.B.prev[k] || 0).cls">{{ dlt(b.B.cur[k] || 0, b.B.prev[k] || 0).text }}</span></span>
              </template>
            </ListRow>
            <button v-if="rowsOf(b).length > 6" type="button" class="ph-row ph-rep-fold" @click="allRows[b.id] = !allRows[b.id]">
              {{ allRows[b.id] ? P("showFewer") : P("showAll", { n: rowsOf(b).length }) }}<PIcon name="chevron" class="ph-rep-down" :class="{ up: allRows[b.id] }" />
            </button>
          </template>
        </div>
        <p v-if="b.B && b.B.prev && b.B.ents.length" class="ph-group-n">
          {{ t("rep.comparedWith") }} {{ cmpName(b.B.B.cr) }}{{ t("rep.totalVs", { a: fm(totalOf(b.B.cur)), b: fm(totalOf(b.B.prev)) }) }}
          <span v-if="dlt(totalOf(b.B.cur), totalOf(b.B.prev))" class="ph-rep-pill" :class="dlt(totalOf(b.B.cur), totalOf(b.B.prev)).cls">{{ dlt(totalOf(b.B.cur), totalOf(b.B.prev)).text }}</span>
        </p>
      </section>

      <!-- the category trend -->
      <section v-if="lD" class="ph-group">
        <div class="ph-group-h"><h3>{{ t("rep.catTrend") }}</h3><button type="button" class="ph-link ph-rep-pick" @click="picker = { id: 'lines', kind: 'months' }">{{ monthsOf(RN.lines) }}<PIcon name="chevron" class="ph-rep-down" /></button></div>
        <Segmented v-model="lineType" :options="typeOpts" :label="t('rep.type')" />
        <div class="ph-group-b ph-rep-card">
          <p v-if="!lD.lines.length" class="ph-rep-none">{{ RN.lt == "inc" ? t("rep.noIncomeMonths") : t("rep.noSpendMonths") }}</p>
          <template v-else>
            <div class="ph-rep-read"><b class="ph-rep-read-m">{{ MNAME(lD.keys[lI]) }} {{ lD.keys[lI].slice(0, 4) }}</b></div>
            <div class="ph-rep-chart" dir="ltr" :ref="(e) => (lSize.el.value = e)">
              <svg :viewBox="`0 0 ${lD.W} ${lD.H}`" :width="lD.W" :height="lD.H" role="img" :aria-label="t('rep.catTrend')" @pointerdown="lScrub" @pointermove="lScrub">
                <template v-for="(g, i) in lD.grid" :key="'g' + i"><line class="gl" :class="{ z: i == 0 }" :x1="lD.Pl" :x2="lD.W - 4" :y1="g.y" :y2="g.y" /><text class="ax" :x="lD.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
                <text v-for="(l, i) in lD.xl" :key="'x' + i" class="ax" :x="l.x" :y="lD.H - 7" text-anchor="middle">{{ l.l }}</text>
                <line class="sel" :x1="lD.X(lI)" :x2="lD.X(lI)" :y1="lD.Pt" :y2="lD.H - lD.Pb" />
                <polyline v-for="l in lD.lines" :key="l.k" fill="none" :stroke="cc(l.k)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" />
                <circle v-for="l in lD.lines" :key="'d' + l.k" :cx="lD.X(lI)" :cy="lD.Y(l.vals[lI])" r="3.5" fill="var(--p-surf)" :stroke="cc(l.k)" stroke-width="2" />
              </svg>
            </div>
            <ListRow v-for="[k, v] in lineNow.slice(0, 7)" :key="k" :title="catName(k)" link @tap="goActivity({ from: lD.keys[lI] + '-01', to: lD.keys[lI] + '-31', cat: k, ty: RN.lt == 'inc' ? 'income' : 'expense' })">
              <template #lead><span class="ph-rep-dot" :style="{ '--d': cc(k) }" /></template>
              <template #end><span class="ph-amt">{{ fm(v) }}</span></template>
            </ListRow>
          </template>
        </div>
      </section>
      <ListGroup v-if="lD && lD.lines.length" :title="monthsOf(RN.lines)">
        <ListRow v-for="l in lineTotals" :key="l.k" :title="catName(l.k)" link @tap="goActivity({ cat: l.k })">
          <template #lead><span class="ph-rep-dot" :style="{ '--d': cc(l.k) }" /></template>
          <template #end><span class="ph-amt">{{ fm(l.total) }}</span></template>
        </ListRow>
      </ListGroup>
    </template>

    <!-- sheets -->
    <PickerSheet v-model:open="whatOpen" required :title="t('rep.whatToShow')" :options="whatOpts" :model-value="trM" @update:model-value="pickWhat" />
    <PickerSheet v-model:open="styleOpen" required :title="P('options')" :options="styles.map(([value, label]) => ({ value, label }))" :model-value="TR.v" @update:model-value="(v) => v && (TR.v = v)" />
    <PickerSheet v-model:open="pickOpen" required :title="pickTitle" :options="pickOpts" :model-value="pickVal" @update:model-value="picked" />
    <ActionSheet v-model:open="more" :title="P('options')" :actions="moreActs" />
    <ActionSheet v-model:open="heldOpen" :title="held || ''" :actions="heldActs" />
    <ActionSheet v-model:open="hiddenOpen" :title="t('rep.hiddenFrom')" :actions="hiddenActs" />
    <PhoneSheet :open="!!dates" :title="t('phone.activity.custom')" @update:open="(v) => !v && (dates = null)">
      <div v-if="dates" class="ph-rep-dates">
        <label class="fld">{{ t("activity.cal.start") }}<input v-model="dates.from" type="date" /></label>
        <label class="fld">{{ t("activity.cal.end") }}<input v-model="dates.to" type="date" :min="dates.from || undefined" /></label>
      </div>
      <template #foot><button type="button" class="ph-btn" :disabled="!dates?.from" @click="applyDates">{{ t("activity.cal.apply") }}</button></template>
    </PhoneSheet>
  </PhoneScreen>
</template>
