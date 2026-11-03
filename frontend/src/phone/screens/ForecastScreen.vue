<script setup>
// Forecast (in More): the computer's Forecast page for a phone, block by block in the same order: the months it learns from,
// the four balance cards, the chart, how next month is worked out, what drives the forecast (each line opens its months,
// as on the computer), what each jar will hold and the years ahead. Every number comes from pagelogic/forecast.js, the
// same as the computer. What the computer shows on hover opens on a tap. The chart is the computer's, at the phone's width:
// touching it (or sliding along it) shows that month above it.
import { ref, computed } from "vue";
import { data } from "../../stores/data.js";
import { pages } from "../../routes.js";
import { useForecast } from "../../pagelogic/forecast.js";
import { openForm } from "../../core/forms.js";
import { explain } from "../../core/tooltip.js";
import { titleCase } from "../../dates.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import AmountCard from "../components/AmountCard.vue";
import SwipeCards from "../components/SwipeCards.vue";
import Segmented from "../components/Segmented.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
import ForecastYears from "../components/ForecastYears.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, tk, sg, n0, fm, tx, S, fc, pick, M, d, H, goCat, zeroMonths, monthsHead, CARDS, gap, C, realPt, svgEl, ptName, ptDay, ptLabel, big,
  horizonLabel, last, amt, upText, lkText, keep, open, seen, toggle, body, TT, thisMon, endLab, eomTip, steps, SUMI, WARN, jarCards,
} = useForecast();
const P = (k, o) => t("phone.forecast." + k, o || {});
const nav = usePhoneNav();
const icon = pages.find((p) => p.name === "forecast")?.icon || "";
const months = computed(() => [3, 6, 12].map((v) => ({ value: v, label: tk("forecast.mo" + v) })));

// the four balance cards: the end of this month across the top, then 3 and 6 months side by side, then a year across
const kpis = computed(() => CARDS.map(([k, l]) => ({ k, label: k ? titleCase(tk("forecast." + l)) + " · " + endLab(k) : titleCase(t("num.endMonthS", { month: thisMon.value })), v: k ? d.value.bal[k] : d.value.really })));
const val = (v) => (v < 0 ? "−" : "") + n0(v);

// The chart: the computer's own drawing (it measures its width through svgEl). A touch, or a drag along it, picks the
// month read out above it; the arrow keys move it too.
const sel = ref(1);
const selI = computed(() => Math.max(0, C.value.pts.findIndex((p) => p.k === sel.value)));
const selP = computed(() => C.value.pts[selI.value]);
const scrub = (e) => {
  const r = e.currentTarget.getBoundingClientRect(), c = C.value, vx = ((e.clientX - r.left) / r.width) * c.W;
  sel.value = c.pts.reduce((b, p) => (Math.abs(p.x - vx) < Math.abs(b.x - vx) ? p : b), c.pts[0]).k;
};
const onDown = (e) => { scrub(e); if (e.pointerType !== "touch") e.currentTarget.setPointerCapture?.(e.pointerId); };
const onMove = (e) => { if (e.buttons || e.pointerType === "touch") scrub(e); };
const onKey = (e) => {
  const n = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[e.key]; if (!n) return;
  e.preventDefault(); const pts = C.value.pts; sel.value = pts[Math.max(0, Math.min(pts.length - 1, selI.value + n))].k;
};

// What drives the forecast: the computer's table as one card of lines. The column picked shows on every line;
// a line opens (as on the computer) its three amounts and each month.
const col = ref(1);
const COLS = [["usually", "usuallySub", "forecast.th.usually"], ["nextMonth", "nextMonthSub", "forecast.th.next"], ["nextYear", "nextYearSub", "forecast.th.year"]];
const cols = computed(() => [{ value: 0, label: P("colAvg") }, { value: 1, label: P("colNext") }, { value: 2, label: P("colYear") }]);
const colHead = (i) => t("forecast." + COLS[i][0]) + " " + t("forecast." + COLS[i][1]);
const endV = computed(() => (col.value == 1 ? TT.value.end1 : col.value == 2 ? TT.value.endH : null));
const valCls = (e, v) => (e.signed ? (v < 0 ? "neg" : "pos") : e.tr.startsWith("grp in") ? "pos" : e.tr.startsWith("grp out") ? "neg" : "");
const lineCls = (e) => (e.tr ? e.tr.split(" ").map((c) => "r-" + c) : []);
const seeIn = (k) => goCat(k);

// a jar's card opens the jar
const openJar = (id) => nav.push("jar", String(id));
</script>

<template>
  <PhoneScreen class="ph-fc">
    <LoadError v-if="data.error.value && !S" :text="t('forecast.loadError')" />
    <template v-else-if="!S">
      <div class="ph-fc-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>
    <EmptyState v-else-if="!S.tx?.length" :icon="icon" :title="P('nothing')" :text="P('nothingText')" :action="t('home.connect')" @action="nav.push('settingsSection', 'conn')">
      <button type="button" class="ph-btn tonal" @click="openForm('tx')">{{ t("home.addTx") }}</button>
    </EmptyState>

    <template v-else>
      <!-- the months the forecast learns from -->
      <div class="ph-fc-ctl ph-fc-in" style="--d:0">
        <p class="ph-fc-ctl-l"><span :data-tip="t('fc.x.ctlTip')">{{ t("forecast.based") }}</span></p>
        <Segmented :model-value="fc.n" :options="months" :label="t('forecast.based')" @update:model-value="pick('n', $event)" />
      </div>

      <!-- the four balance cards -->
      <div class="ph-fc-kpis ph-fc-in" style="--d:1">
        <AmountCard v-for="c in kpis" :key="c.k" :class="'k-' + c.k" :hero="c.k == H" :value="val(c.v)">
          <template #label><span :data-tip="c.k ? null : eomTip">{{ c.label }}</span></template>
          <template #sub>
            <template v-if="c.k">
              <span class="ph-fc-vs"><span class="bd ph-fc-bd" dir="ltr" :class="gap(c.k) >= 0 ? 'dn' : 'up'"><PIcon name="chevron" class="ph-fc-bdi" :class="gap(c.k) >= 0 ? 'u' : 'd'" />₪{{ n0(gap(c.k)) }}</span> {{ t("forecast.vsEnd", { month: thisMon }) }}</span>
              <span class="ph-fc-rng">{{ t("forecast.range", { lo: sg(d.lo[c.k]), hi: sg(d.hi[c.k]) }) }}</span>
            </template>
            <template v-else>{{ t("fc.x.bankToday", { amt: fm(d.eom.bank) }) }}</template>
          </template>
        </AmountCard>
      </div>

      <p v-if="zeroMonths.length" class="ph-fc-warn ph-fc-in" style="--d:2"><PIcon :svg="WARN" />{{ t("forecast.diag.zero", { months: zeroMonths.join(", ") }) }}</p>

      <!-- the chart: the computer's, touch or drag to read each month -->
      <ListGroup class="ph-fc-in" style="--d:2" :title="M.wallet ? t('fc.x.chartTitle') : t('fc.x.chartTitleBank')" pad>
        <div class="ph-fc-leg">
          <span><span class="dot" style="background:var(--acc)" />{{ t("forecast.legBal") }}</span>
          <span :data-tip="t('forecast.legRangeTip')"><span class="dot" style="background:color-mix(in srgb,var(--acc) 25%,transparent)" />{{ t("forecast.legRange") }}</span>
        </div>
        <span v-if="C.fn != null" class="bd up ph-fc-st">{{ t("forecast.warnNeg", { when: ptName(C.fn) }) }}</span>
        <span v-else-if="C.fl != null" class="bd fl ph-fc-st">{{ t("forecast.warnLow", { when: ptName(C.fl) }) }}</span>
        <span v-else class="bd dn ph-fc-st">{{ t("forecast.warnOk") }}</span>
        <div class="ph-fc-read" aria-live="polite">
          <span>{{ ptDay(sel) }}</span>
          <b class="ph-amt" :class="{ neg: realPt(sel).v < 0 }">{{ sg(realPt(sel).v) }}</b>
          <small>{{ t("forecast.tipRange", { lo: sg(realPt(sel).lo), hi: sg(realPt(sel).hi) }) }}</small>
        </div>
        <svg ref="svgEl" class="ph-fc-svg" width="100%" :viewBox="`0 0 ${C.W} ${C.Ht}`" role="slider" tabindex="0" :aria-label="P('chartLabel')" :aria-valuetext="ptDay(sel) + ': ' + sg(realPt(sel).v)"
          @pointerdown="onDown" @pointermove="onMove" @keydown="onKey">
          <template v-for="(g, i) in C.ticks" :key="i"><line class="gl" :x1="0" :x2="C.W" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="2" :y="g.y - 5" text-anchor="start">{{ g.label }}</text></template>
          <template v-if="C.zeroY != null"><line :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.zeroY" :y2="C.zeroY" stroke="var(--neg)" stroke-width="1.5" stroke-dasharray="6 4" /><text :x="C.W - C.Pr" :y="C.zeroY - 5" text-anchor="end" style="fill:var(--neg)">{{ t("forecast.zero") }}</text></template>
          <defs><linearGradient id="phfcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".06" /></linearGradient></defs>
          <template v-for="k in [3, 6, 12].filter((x) => x <= H)" :key="'m' + k"><line :x1="C.X(k)" :x2="C.X(k)" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx2)" stroke-opacity=".35" stroke-dasharray="2 5" /><text :x="k == H ? C.W : C.X(k)" :y="C.Pt - 7" :text-anchor="k == H ? 'end' : 'middle'" style="font-weight:600;fill:var(--tx)">{{ horizonLabel(k) }}</text></template>
          <line :x1="selP.x" :x2="selP.x" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" />
          <g class="ph-fc-wipe">
            <polygon fill="url(#phfcg)" :points="C.band" />
            <polyline fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" :points="C.line" />
          </g>
          <template v-for="(p, i) in C.pts" :key="'p' + p.k">
            <circle class="ph-fc-pt" :style="{ '--i': i }" :cx="p.x" :cy="p.y" :r="big(p.k) ? 5.5 : 4" :fill="big(p.k) ? 'var(--acc)' : 'var(--bg)'" stroke="var(--acc)" stroke-width="2.5" />
            <text v-if="ptLabel(p)" :x="p.k === 'e' ? 0 : p.k === H ? C.W : p.x" :y="C.Ht - 9" :text-anchor="p.k === 'e' ? 'start' : p.k === H ? 'end' : 'middle'">{{ ptLabel(p) }}</text>
          </template>
          <circle class="ph-fc-sel" :cx="selP.x" :cy="selP.y" r="7" fill="var(--acc)" stroke="var(--bg)" stroke-width="2.5" />
        </svg>
      </ListGroup>

      <!-- how next month is worked out: today, then the end of this month, + next month, = where you land -->
      <ListGroup class="ph-fc-in" style="--d:3" :title="t('forecast.how.title')" pad>
        <ol class="ph-fc-sum">
          <li v-for="(x, i) in steps" :key="i" :class="'s-' + x.k" :style="{ '--i': i }" :role="x.tip ? 'button' : null" :tabindex="x.tip ? 0 : null" @click="explain(x.tip)" @keydown.enter="explain(x.tip)">
            <span v-if="x.op" class="op" aria-hidden="true"><PIcon v-if="x.op == 'go'" name="chevron" class="go" /><template v-else>{{ x.op }}</template></span>
            <span class="qb" aria-hidden="true"><PIcon :svg="SUMI[x.k]" /></span>
            <span class="d">
              <span class="k">{{ x.label }}</span>
              <b class="v ph-amt"><bdi dir="ltr">{{ x.amt }}</bdi></b>
              <small v-for="(s, j) in x.sub || []" :key="j" class="s">{{ keep(s[1]) }}</small>
            </span>
          </li>
        </ol>
      </ListGroup>

      <!-- what drives the forecast: the computer's table as lines; the column picked shows on every line -->
      <ListGroup class="ph-fc-in" style="--d:4" :title="t('forecast.drives')">
        <template #top><Segmented v-model="col" :options="cols" :label="t('forecast.drives')" /></template>
        <div class="ph-fc-th">
          <span>{{ t("forecast.rowHead") }}</span>
          <span class="ph-fc-th-e" :data-tip="t(COLS[col][2])">{{ colHead(col) }}</span>
          <span class="ph-fc-th-m">{{ monthsHead }}</span>
          <span class="ph-fc-th-e" :data-tip="t('forecast.th.dir')">{{ t("forecast.direction") }}</span>
        </div>
        <template v-for="e in body" :key="e.x.key">
          <button type="button" class="ph-fc-r" :class="lineCls(e)" :aria-expanded="open.has(e.x.key)" :aria-label="t('forecast.showMonths', { name: e.label })" @click="toggle(e.x.key)">
            <span class="ph-fc-r-n"><span :data-tip="e.tip || null">{{ e.label }}</span></span>
            <b class="ph-amt ph-fc-r-v" :class="valCls(e, e.vals[col])">{{ amt(e.vals[col]) }}</b>
            <span class="ph-fc-r-b">
              <span class="fcb"><span v-for="(b, i) in e.x.bars" :key="i" class="fcbar" :class="{ now: i == e.x.bars.length - 1, neg: b.v < 0 }"><i class="ex" :style="{ insetBlockEnd: b.b + '%', blockSize: b.h + '%' }" /><i v-if="i == e.x.bars.length - 1 && b.v >= 0" class="so" :style="{ insetBlockEnd: b.b + '%', blockSize: b.s + '%' }" /></span></span>
              <PIcon name="chevron" class="fccv" />
            </span>
            <span class="ph-fc-r-d"><span v-if="e.x.dr.none" class="fcnd">{{ t("forecast.dir.none") }}</span><span v-else class="bd ph-fc-bd" :class="e.x.dr.cls"><PIcon v-if="e.x.dr.word != 'steady'" name="chevron" class="ph-fc-bdi" :class="e.x.dr.word == 'up' ? 'u' : 'd'" /><i v-else class="ph-fc-bdo" />{{ tk("forecast.dir." + e.x.dr.word) }}</span></span>
          </button>
          <!-- a line's months, opened under it: its three amounts, then one small cell per month (this month marked) -->
          <div v-if="seen.has(e.x.key)" class="ph-fc-x" :class="{ on: open.has(e.x.key) }" :inert="!open.has(e.x.key)">
            <div class="ph-fc-xi">
              <div class="ph-fc-three">
                <span v-for="(c, i) in COLS" :key="i" :class="{ on: i == col }"><small>{{ colHead(i) }}</small><b class="ph-amt" :class="valCls(e, e.vals[i])">{{ amt(e.vals[i]) }}</b></span>
              </div>
              <ul class="fcml">
                <li v-for="m in e.x.months" :key="m.j" :class="{ now: m.j == last, more: m.so != null || m.counted != null, neg: m.v < 0 }"><span>{{ m.label }}</span><b class="num">{{ m.so != null ? t("forecast.soFarAmt", { amt: amt(m.so) }) : amt(m.v) }}</b><small v-if="m.up != null">{{ upText(m.up) }}</small><small v-if="m.lk != null">{{ lkText(m.lk) }}</small><small v-if="m.so != null">{{ t("forecast.normallyAmt", { amt: amt(m.v) }) }}</small><small v-if="m.counted != null">{{ t("forecast.countedAt", { amt: amt(m.counted) }) }}</small></li>
              </ul>
              <button v-if="e.link" type="button" class="ph-link ph-fc-see" @click="seeIn(e.link)">{{ P("seeActivity") }}<PIcon name="chevron" dir /></button>
            </div>
          </div>
        </template>
        <div class="ph-fc-r r-end">
          <span class="ph-fc-r-n"><span :data-tip="t('forecast.endTip')">{{ t("forecast.endRow") }}</span></span>
          <b v-if="endV != null" class="ph-amt ph-fc-r-v" :class="{ neg: endV < -0.5 }">{{ sg(endV) }}</b>
        </div>
      </ListGroup>

      <!-- what each jar will hold in the coming year -->
      <ListGroup class="ph-fc-in" style="--d:5" :title="t('forecast.jarTitle')" bare>
        <div v-if="!jarCards.length" class="ph-card ph-fc-nojar">{{ t("forecast.j.none") }}</div>
        <SwipeCards v-else :count="jarCards.length">
          <button v-for="c in jarCards" :key="c.j.id" type="button" class="ph-card ph-fc-jar" @click="openJar(c.j.id)">
            <span class="ph-fc-jar-h"><span class="ph-fc-jar-t"><b>{{ tx(c.j.n) }}</b><small>{{ c.sub }}</small></span><span class="bd" :class="c.chip[0]">{{ c.chip[1] }}</span></span>
            <svg class="ph-fc-spark" :viewBox="`0 0 ${c.sp.W} ${c.sp.Ht}`" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient :id="'phjfg' + c.j.id" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.sp.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.sp.col" stop-opacity="0" /></linearGradient></defs>
              <line v-if="c.sp.goal != null" :x1="c.sp.P" :x2="c.sp.W - c.sp.P" :y1="c.sp.goal" :y2="c.sp.goal" :stroke="c.sp.col" stroke-opacity=".6" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
              <g class="ph-fc-wipe">
                <polygon :fill="`url(#phjfg${c.j.id})`" :points="c.sp.area" />
                <polyline fill="none" :stroke="c.sp.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" :points="c.sp.pts" />
              </g>
            </svg>
            <span class="ph-fc-jfs"><span v-for="x in c.tiles" :key="x.label"><small>{{ x.label }}</small><b class="ph-amt">{{ x.v }}</b><i :class="{ pos: x.pos }">{{ x.g }}</i></span></span>
            <span v-if="c.warn" class="ph-fc-jfw"><PIcon :svg="WARN" /><span>{{ c.warn }}</span></span>
          </button>
        </SwipeCards>
      </ListGroup>

      <!-- the years ahead -->
      <ForecastYears class="ph-fc-in" style="--d:6" :model="M" />
    </template>
  </PhoneScreen>
</template>
