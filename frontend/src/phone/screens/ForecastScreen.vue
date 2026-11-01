<script setup>
// Forecast (in More): where the money is heading. It opens with one sentence (what is likely yours at the end of next
// month), the months it learns from, the chart (touch it to read each month), the months ahead, how next month is worked
// out, what drives it (money in and out, each line opens its months) and what each jar will hold.
// Every number comes from pagelogic/forecast.js, the same as the computer page.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { data } from "../../stores/data.js";
import { pages } from "../../routes.js";
import { chartOf } from "../../lib/forecast.js";
import { useForecast } from "../../pagelogic/forecast.js";
import { openForm } from "../../core/forms.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import HeroSentence from "../components/HeroSentence.vue";
import Segmented from "../components/Segmented.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, tk, sg, fm, tx, S, fc, pick, M, d, H, goCat, zeroMonths, monthsHead, CARDS, gap, shown, realPt, ptName, ptDay, horizonLabel, lastDay, last, amt, upText, lkText, keep,
  body, TT, thisMon, endLab, eomTip, steps, SUMI, WARN, jarCards,
} = useForecast();
const P = (k, o) => t("phone.forecast." + k, o || {});
const nav = usePhoneNav();
const icon = pages.find((p) => p.name === "forecast")?.icon || "";

// the sentence at the top: what is really yours on the last day of next month (the "=" step and Recap's look ahead)
const hero = computed(() => {
  const v = Math.round(d.value.shown.next.end), text = P(v < 0 ? "heroShort" : "hero", { date: lastDay(1), amount: "\u0000" }), [a, b = ""] = text.split("\u0000");
  return [{ text: a }, { amount: fm(Math.abs(v)) }, { text: b }];
});
const howEl = ref(null);
const toHow = () => howEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
const months = computed(() => [3, 6, 12].map((v) => ({ value: v, label: tk("forecast.mo" + v) })));

// The chart, drawn at the phone's own width; a touch (or a drag along it) picks the month shown above it.
const wrap = ref(null), cw = ref(328);
let ro = null;
onMounted(() => { if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => { const w = Math.round(wrap.value?.getBoundingClientRect().width || 0); if (w > 120) cw.value = w; }); if (wrap.value) ro.observe(wrap.value); } });
onBeforeUnmount(() => ro?.disconnect());
const C = computed(() => chartOf(shown.value, H.value, cw.value, 210));
const sel = ref(1); // the point read out: "e" (the end of this month) or 1..12
const selI = computed(() => Math.max(0, C.value.pts.findIndex((p) => p.k === sel.value)));
const selP = computed(() => C.value.pts[selI.value]);
const step = computed(() => Math.max(1, Math.ceil(54 / Math.max(1, C.value.u))));
const ptLabel = (p) => (p.k === "e" || p.k % step.value == 0 ? lastDay(p.k === "e" ? 0 : p.k) : "");
const big = (k) => k === "e" || [3, 6, 12].includes(k);
const scrub = (e) => {
  const svg = e.currentTarget, r = svg.getBoundingClientRect(), c = C.value, vx = ((e.clientX - r.left) / r.width) * c.W;
  sel.value = c.pts.reduce((b, p) => (Math.abs(p.x - vx) < Math.abs(b.x - vx) ? p : b), c.pts[0]).k;
};
const onDown = (e) => { scrub(e); if (e.pointerType !== "touch") e.currentTarget.setPointerCapture?.(e.pointerId); };
const onMove = (e) => { if (e.buttons || e.pointerType === "touch") scrub(e); };
const onKey = (e) => {
  const n = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 }[e.key]; if (!n) return;
  e.preventDefault(); const pts = C.value.pts; sel.value = pts[Math.max(0, Math.min(pts.length - 1, selI.value + n))].k;
};
const status = computed(() => (C.value.fn != null ? ["bad", t("forecast.warnNeg", { when: ptName(C.value.fn) }).replace(/^⚠\s*/, "")] : C.value.fl != null ? ["low", t("forecast.warnLow", { when: ptName(C.value.fl) })] : ["ok", t("forecast.warnOk")]));

// The months ahead: the end of this month, then in 3 months, 6 months and a year.
const ahead = computed(() => CARDS.map(([k, l]) => {
  const v = k ? d.value.bal[k] : d.value.really;
  return k
    ? { k, title: tk("forecast." + l), when: endLab(k), v, change: gap(k), range: t("forecast.range", { lo: sg(d.value.lo[k]), hi: sg(d.value.hi[k]) }) }
    : { k, title: t("num.endMonthS", { month: thisMon.value }), tip: eomTip.value, v, range: t("fc.x.bankToday", { amt: fm(d.value.eom.bank) }) };
}));
const signed = (v) => (v < 0 ? "−" : "") + fm(Math.abs(v));

// What drives it: the table's rows by group; the column picked shows on every row, and a row opens all of it.
const col = ref(1);
const cols = computed(() => [{ value: 0, label: P("colAvg") }, { value: 1, label: P("colNext") }, { value: 2, label: P("colYear") }]);
const COLTIP = ["forecast.th.usually", "forecast.th.next", "forecast.th.year"];
const outAt = computed(() => body.value.findIndex((e) => e.tr.startsWith("grp out")));
const groups = computed(() => [body.value.slice(0, outAt.value), body.value.slice(outAt.value, -1)]);
const saved = computed(() => body.value[body.value.length - 1]);
const endV = computed(() => (col.value == 1 ? TT.value.end1 : col.value == 2 ? TT.value.endH : null));
const DOWN = '<path d="M6 9l6 6 6-6"/>'; // "then": the next step, under it
const DIR = { dn: "pos", up: "neg", fl: "" };
const ARROW = { up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', steady: '<path d="M5 12h14"/>' };

const rowKey = ref(""), rowOpen = ref(false);
const row = computed(() => body.value.find((e) => e.x.key === rowKey.value) || null);
const showRow = (e) => { rowKey.value = e.x.key; rowOpen.value = true; };
const mx = computed(() => Math.max(1e-9, ...(row.value ? row.value.x.months.map((m) => Math.abs(m.v)) : [1])));
const seeIn = (k) => { rowOpen.value = false; goCat(k); };
const rowVal = (e, v) => (e.signed ? (v < 0 ? "neg" : "pos") : "");

// What each jar will hold: a jar's card opens the jar.
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
      <HeroSentence :class="{ short: d.shown.next.end < -0.5 }" :parts="hero" :link="P('how')" @link="toHow" />

      <section class="ph-group ph-fc-ctl">
        <div class="ph-group-h"><h3 :data-tip="t('fc.x.ctlTip')">{{ t("forecast.based") }}</h3></div>
        <Segmented :model-value="fc.n" :options="months" :label="t('forecast.based')" @update:model-value="pick('n', $event)" />
        <p class="ph-group-n">{{ monthsHead }}</p>
      </section>

      <p v-if="zeroMonths.length" class="ph-fc-warn"><PIcon :svg="WARN" />{{ t("forecast.diag.zero", { months: zeroMonths.join(", ") }) }}</p>

      <!-- the chart: touch or drag to read each month -->
      <section class="ph-group">
        <div class="ph-group-h"><h3>{{ M.wallet ? t("fc.x.chartTitle") : t("fc.x.chartTitleBank") }}</h3></div>
        <div class="ph-group-b ph-fc-chart">
          <div class="ph-fc-read" aria-live="polite">
            <span class="ph-fc-read-d">{{ ptDay(sel) }}</span>
            <b class="ph-amt" :class="{ neg: realPt(sel).v < 0 }">{{ sg(realPt(sel).v) }}</b>
            <span class="ph-fc-read-r">{{ t("forecast.tipRange", { lo: sg(realPt(sel).lo), hi: sg(realPt(sel).hi) }) }}</span>
          </div>
          <div ref="wrap" class="ph-fc-plot">
            <svg class="ph-fc-svg" :viewBox="`0 0 ${C.W} ${C.Ht}`" :width="C.W" :height="C.Ht" role="slider" tabindex="0" :aria-label="P('chartLabel')" :aria-valuetext="ptDay(sel) + ': ' + sg(realPt(sel).v)"
              @pointerdown="onDown" @pointermove="onMove" @keydown="onKey">
              <template v-for="(g, i) in C.ticks" :key="i"><line class="gl" x1="0" :x2="C.W" :y1="g.y" :y2="g.y" /><text class="tk" x="2" :y="g.y - 5">{{ g.label }}</text></template>
              <template v-if="C.zeroY != null"><line class="zero" :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.zeroY" :y2="C.zeroY" /><text class="zero" :x="C.W - C.Pr" :y="C.zeroY - 5" text-anchor="end">{{ t("forecast.zero") }}</text></template>
              <defs><linearGradient id="phfcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".26" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".05" /></linearGradient></defs>
              <polygon fill="url(#phfcg)" :points="C.band" />
              <template v-for="k in [3, 6, 12].filter((x) => x <= H)" :key="'m' + k"><line class="hz" :x1="C.X(k)" :x2="C.X(k)" :y1="C.Pt" :y2="C.Ht - C.Pb" /><text class="hzt" :x="k == H ? C.W : C.X(k)" :y="C.Pt - 8" :text-anchor="k == H ? 'end' : 'middle'">{{ horizonLabel(k) }}</text></template>
              <line class="cur" :x1="selP.x" :x2="selP.x" :y1="C.Pt" :y2="C.Ht - C.Pb" />
              <polyline class="ln" :points="C.line" />
              <template v-for="p in C.pts" :key="'p' + p.k">
                <circle :cx="p.x" :cy="p.y" :r="big(p.k) ? 4.5 : 3" :class="big(p.k) ? 'pt big' : 'pt'" />
                <text v-if="ptLabel(p)" class="ml" :x="p.k === 'e' ? 0 : p.k === H ? C.W : p.x" :y="C.Ht - 9" :text-anchor="p.k === 'e' ? 'start' : p.k === H ? 'end' : 'middle'">{{ ptLabel(p) }}</text>
              </template>
              <circle class="sel" :cx="selP.x" :cy="selP.y" r="7" />
            </svg>
          </div>
          <div class="ph-fc-leg">
            <span><i class="ln" />{{ t("forecast.legBal") }}</span>
            <span :data-tip="t('forecast.legRangeTip')"><i class="band" />{{ t("forecast.legRange").split(":")[0] }}</span>
          </div>
          <p class="ph-fc-status" :class="status[0]"><PIcon v-if="status[0] == 'ok'" name="check" /><PIcon v-else :svg="WARN" />{{ status[1] }}</p>
        </div>
        <p class="ph-group-n">{{ P("chartNote") }}</p>
      </section>

      <!-- the months ahead: the end of this month, then 3 months, 6 months and a year -->
      <section class="ph-group">
        <div class="ph-group-h"><h3>{{ P("ahead") }}</h3></div>
        <div class="ph-group-b">
          <div v-for="a in ahead" :key="a.k" class="ph-row ph-two ph-fc-ah" :class="{ hero: a.k == H }">
            <span class="ph-row-main">
              <span class="ph-row-t"><span :data-tip="a.tip || null">{{ a.title }}</span></span>
              <span v-if="a.when" class="ph-row-s">{{ a.when }}</span>
              <span class="ph-row-s ph-fc-wrap">{{ a.range }}</span>
            </span>
            <span class="ph-fc-ah-e">
              <b class="ph-amt" :class="{ neg: a.v < -0.5 }">{{ signed(a.v) }}</b>
              <small v-if="a.change != null" :class="a.change >= 0 ? 'pos' : 'neg'"><PIcon :svg="a.change >= 0 ? ARROW.up : ARROW.down" />{{ fm(Math.abs(a.change)) }}</small>
            </span>
          </div>
        </div>
        <p class="ph-group-n">{{ P("aheadNote", { month: thisMon }) }}</p>
      </section>

      <!-- how next month is worked out: today, the end of this month, + next month, = where you land -->
      <section ref="howEl" class="ph-group ph-fc-how">
        <div class="ph-group-h"><h3>{{ t("forecast.how.title") }}</h3></div>
        <div class="ph-group-b">
          <div v-for="(x, i) in steps" :key="i" class="ph-row ph-two ph-fc-step" :class="'s-' + x.k">
            <span class="ph-fc-op" aria-hidden="true"><PIcon v-if="x.op == 'go'" :svg="DOWN" /><template v-else>{{ x.op }}</template></span>
            <span class="ph-tile"><PIcon :svg="SUMI[x.k]" /></span>
            <span class="ph-row-main">
              <span class="ph-row-t"><span :data-tip="x.tip || null">{{ x.label }}</span></span>
              <span v-for="(s, j) in x.sub || []" :key="j" class="ph-row-s ph-fc-wrap">{{ keep(s[1]) }}</span>
            </span>
            <b class="ph-amt" dir="ltr">{{ x.amt }}</b>
          </div>
        </div>
      </section>

      <!-- what drives it: money in, money out and what is saved, in the column picked -->
      <section class="ph-group ph-fc-drv">
        <div class="ph-group-h"><h3>{{ t("forecast.drives") }}</h3></div>
        <Segmented v-model="col" :options="cols" :label="t('forecast.drives')" />
        <p class="ph-fc-colnote"><span :data-tip="t(COLTIP[col])">{{ P("colNote" + col) }}</span></p>
      </section>
      <section v-for="(g, gi) in groups" :key="gi" class="ph-group">
        <div class="ph-group-h"><h3>{{ g[0].label }}</h3></div>
        <div class="ph-group-b">
          <button v-for="e in g" :key="e.x.key" type="button" class="ph-row ph-two ph-fc-line" :class="{ tot: !!e.tr }" @click="showRow(e)">
            <span class="ph-row-main">
              <span class="ph-row-t">{{ e.tr ? t(gi ? "forecast.totalOut" : "forecast.totalIn") : e.label }}</span>
              <span class="ph-row-s ph-fc-dir" :class="e.x.dr.none ? '' : DIR[e.x.dr.cls]"><template v-if="e.x.dr.none">{{ t("forecast.dir.none") }}</template><template v-else><PIcon :svg="ARROW[e.x.dr.word]" />{{ tk("forecast.dir." + e.x.dr.word) }}</template></span>
            </span>
            <span class="ph-amt">{{ amt(e.vals[col]) }}</span>
            <PIcon name="chevron" dir class="ph-chev" />
          </button>
        </div>
      </section>
      <section class="ph-group">
        <div class="ph-group-b">
          <button type="button" class="ph-row ph-two ph-fc-line tot" @click="showRow(saved)">
            <span class="ph-row-main">
              <span class="ph-row-t"><span :data-tip="saved.tip">{{ P("saved") }}</span></span>
              <span class="ph-row-s">{{ P("savedSub") }}</span>
            </span>
            <span class="ph-amt" :class="rowVal(saved, saved.vals[col])">{{ amt(saved.vals[col]) }}</span>
            <PIcon name="chevron" dir class="ph-chev" />
          </button>
          <div v-if="endV != null" class="ph-row ph-two ph-fc-line tot">
            <span class="ph-row-main"><span class="ph-row-t ph-fc-wrap"><span :data-tip="t('forecast.endTip')">{{ t("forecast.endRow") }}</span></span></span>
            <span class="ph-amt" :class="{ neg: endV < -0.5 }">{{ sg(endV) }}</span>
          </div>
        </div>
      </section>

      <!-- what each jar will hold in the coming year -->
      <section class="ph-group ph-fc-jars">
        <div class="ph-group-h"><h3>{{ t("forecast.jarTitle") }}</h3></div>
        <EmptyState v-if="!jarCards.length" class="ph-fc-nojar" :icon="pages.find((p) => p.name === 'jars')?.icon || icon" :text="t('forecast.j.none')" />
        <button v-for="c in jarCards" :key="c.j.id" type="button" class="ph-fc-jar" @click="openJar(c.j.id)">
          <span class="ph-fc-jar-h">
            <span class="ph-row-main">
              <span class="ph-row-t">{{ tx(c.j.n) }}</span>
              <span class="ph-fc-jar-sub"><span v-for="(s, i) in c.sub.split(' · ')" :key="i">{{ s }}</span></span>
            </span>
            <PIcon name="chevron" dir class="ph-chev" />
          </span>
          <span class="ph-fc-chip" :class="DIR[c.chip[0]]">{{ c.chip[1] }}</span>
          <svg class="ph-fc-spark" :viewBox="`0 0 ${c.sp.W} ${c.sp.Ht}`" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient :id="'phjfg' + c.j.id" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.sp.col" stop-opacity=".32" /><stop offset="1" :stop-color="c.sp.col" stop-opacity="0" /></linearGradient></defs>
            <line v-if="c.sp.goal != null" :x1="c.sp.P" :x2="c.sp.W - c.sp.P" :y1="c.sp.goal" :y2="c.sp.goal" :stroke="c.sp.col" stroke-opacity=".6" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
            <polygon :fill="`url(#phjfg${c.j.id})`" :points="c.sp.area" />
            <polyline fill="none" :stroke="c.sp.col" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" :points="c.sp.pts" />
          </svg>
          <span class="ph-fc-jar-t"><span v-for="x in c.tiles" :key="x.label"><small>{{ x.label }}</small><b class="ph-amt">{{ x.v }}</b><i :class="{ pos: x.pos }">{{ x.g }}</i></span></span>
          <span v-if="c.warn" class="ph-fc-jar-w"><PIcon :svg="WARN" />{{ c.warn }}</span>
        </button>
      </section>
    </template>

    <!-- one line of what drives it: its three amounts, its trend and each month -->
    <PhoneSheet v-model:open="rowOpen" :title="row ? (row.tr.startsWith('tot') ? P('saved') : row.tr ? t(row.tr.includes('out') ? 'forecast.totalOut' : 'forecast.totalIn') : row.label) : ''" cls="ph-fc-sheet">
      <template v-if="row">
        <div class="ph-fc-three">
          <span v-for="(c, i) in cols" :key="c.value" :class="{ on: i == col }"><small :data-tip="t(COLTIP[i])">{{ c.label }}</small><b class="ph-amt" :class="rowVal(row, row.vals[i])">{{ amt(row.vals[i]) }}</b></span>
        </div>
        <p v-if="row.x.dr.none" class="ph-fc-trend">{{ t("forecast.dir.none") }}</p>
        <p v-else class="ph-fc-trend ph-fc-dir" :class="DIR[row.x.dr.cls]"><PIcon :svg="ARROW[row.x.dr.word]" /><span :data-tip="t('forecast.th.dir')">{{ tk("forecast.dir." + row.x.dr.word) }}</span></p>
        <section class="ph-group">
          <div class="ph-group-h"><h3>{{ P("eachMonth") }}</h3></div>
          <div class="ph-group-b">
            <div v-for="m in row.x.months" :key="m.j" class="ph-fc-mo" :class="{ now: m.j == last }">
              <span class="ph-fc-mo-h"><span>{{ m.label }}</span><b class="ph-amt" :class="{ neg: m.v < -0.5 && row.signed }">{{ m.so != null ? t("forecast.soFarAmt", { amt: amt(m.so) }) : amt(m.v) }}</b></span>
              <span class="ph-fc-mo-bar" :class="{ neg: m.v < 0 }"><i :style="{ inlineSize: (Math.abs(m.v) / mx) * 100 + '%' }" /><u v-if="m.so != null && m.v >= 0" :style="{ inlineSize: (Math.max(0, Math.min(Math.abs(m.so), Math.abs(m.v))) / mx) * 100 + '%' }" /></span>
              <small v-if="m.up != null">{{ upText(m.up) }}</small>
              <small v-if="m.lk != null">{{ lkText(m.lk) }}</small>
              <small v-if="m.so != null">{{ t("forecast.normallyAmt", { amt: amt(m.v) }) }}</small>
              <small v-if="m.counted != null">{{ t("forecast.countedAt", { amt: amt(m.counted) }) }}</small>
            </div>
          </div>
        </section>
      </template>
      <template v-if="row && row.link" #foot>
        <button type="button" class="ph-btn tonal" @click="seeIn(row.link)">{{ P("seeActivity") }}</button>
      </template>
    </PhoneSheet>
  </PhoneScreen>
</template>
