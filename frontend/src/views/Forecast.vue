<script setup>
// Forecast: where the money is heading. A copy of the current app's Forecast page (web/js/06-trend-forecast-sync.js, renderFc):
// the choices at the top, the balance now and ahead, what it is based on, the chart, what drives it and what each jar will hold.
// The numbers come from forecast.js. The choices are saved in this browser under the same name as in the current app ("moneyFc").
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { home } from "../core/derived.js";
import { goActivity } from "../core/shell.js";
import { fm, f0 as n0 } from "../format.js";
import { readJson, writeJson } from "../core/prefs.js";
import { isolateNumbers } from "../core/polish.js";
import { tx } from "../core/heText.js";
import PageHeader from "../components/PageHeader.vue";
import BaseCard from "../components/BaseCard.vue";
import { vRich } from "../lib/richtip.js";
import { categoryName } from "../catnames.js";
import { forecastModel, periodTotal, direction, chartOf } from "../lib/forecast.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const sg = fm;
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));

const fx = computed(() => data.fx.value.fx); // exchange rates, loaded with the data
onMounted(async () => {
  data.start();
});
const S = computed(() => data.state.value);

// The page's choices, saved like the current app does.
const fc = ref((() => { let z = null; try { z = readJson("moneyFc", null); } catch { /* none saved */ } const o = { h: 12, n: 6, m: "smart", ...(z || {}) }; if (![3, 6, 12].includes(o.n)) o.n = 6; return o; })());
const pick = (k, v) => { fc.value = { ...fc.value, [k]: isNaN(+v) ? v : +v }; try { writeJson("moneyFc", (fc.value)); } catch { /* not saved */ } };
const M = computed(() => forecastModel(S.value, now.value, fx.value, fc.value, home.value));

const monthOf = (key, opt) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, opt);
const mshort = (key) => monthOf(key, { month: "short" });
// "Oct 27"; in Hebrew the year keeps its place in the chart like the current app (it isolates numbers in translated text)
const mlab = (k) => { const s = new Date(now.value.getFullYear(), now.value.getMonth() + k, 1).toLocaleDateString(loc.value, { month: "short", year: "2-digit" }); return locale.value === "he" ? isolateNumbers(s) : s; };
const jarWhen = (k) => (k ? new Date(+M.value.FH.keys[12].slice(0, 4), +M.value.FH.keys[12].slice(5, 7) - 1 + k, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" }) : "");
const catName = (c) => (c === "Other / uncategorized" ? t("forecast.otherCat") : categoryName(c, locale.value));
const srcName = (k) => (k === "Other income" ? t("forecast.otherInc") : tx(categoryName(k, locale.value))); // names from the data go through the old Hebrew dictionary, like the current app
// A line's name opens Activity with only that category, like the current app (goCat; an income line passes its source's name the same way).
const goCat = (cat) => goActivity({ cat });

const d = computed(() => M.value.d);
const H = computed(() => fc.value.h);
const nEff = computed(() => d.value.nEff);

// What it is based on.
const used = computed(() => { const FH = M.value.FH, o = []; for (let i = FH.last - nEff.value; i < FH.last; i++) o.push(i); return o; });
const usedMonths = computed(() => used.value.map((i) => mshort(M.value.FH.keys[i])).join(", "));
const zeroMonths = computed(() => used.value.filter((i) => !M.value.FH.inc[i]).map((i) => mshort(M.value.FH.keys[i])));
const incM = computed(() => d.value.inc.reduce((s, r) => s + r.mean, 0));
const exM = computed(() => d.value.ex.reduce((s, r) => s + r.mean, 0));

// The four balance cards.
const CARDS = [[0, "now"], [3, "in3"], [6, "in6"], [12, "in12"]];

// The chart.
const C = computed(() => chartOf(d.value, H.value));
const hover = ref(null); // { k, left, top }
const svgEl = ref(null), tipEl = ref(null);
function onMove(e) {
  const c = C.value, svg = svgEl.value; if (!svg) return;
  const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * c.W;
  if (vx < c.Pl - 14 || vx > c.W - c.Pr + 14) { hover.value = null; return; }
  const k = Math.max(0, Math.min(H.value, Math.round((vx - c.Pl) / ((c.W - c.Pl - c.Pr) / H.value)))), sx = r.width / c.W;
  hover.value = { k, px: 0, py: Math.max(0, c.Y(d.value.bal[k]) * sx - 76) };
  nextTick(() => { const w = tipEl.value ? tipEl.value.offsetWidth : 0; if (hover.value && hover.value.k === k) hover.value = { ...hover.value, px: Math.max(0, Math.min(r.width - w, c.X(k) * sx - w / 2)) }; });
}
const onLeave = () => { hover.value = null; };
const horizonLabel = (k) => (k == 12 ? t("forecast.y1") : t("forecast.moN", { n: k }));

// The table.
const rowOf = (r, ty) => {
  const dr = direction(r, ty), list = r.v.map((x) => "₪" + n0(x)).join(" · ");
  return { r, ...dr, tot: periodTotal(r, H.value), tip: t("forecast.tipLast", { list, n: r.v.length }, r.v.length) + " " + (dr.flat ? t("forecast.tipFlat") : t("forecast.tipMove", { pc: Math.abs(dr.pc).toFixed(0) })) };
};
const incRows = computed(() => d.value.inc.map((r) => rowOf(r, "in")));
const exRows = computed(() => d.value.ex.map((r) => rowOf(r, "out")));
const T2 = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0);
const i1 = computed(() => T2(d.value.inc, (r) => r.at(1))), e1 = computed(() => T2(d.value.ex, (r) => r.at(1)));
const i12 = computed(() => T2(d.value.inc, (r) => periodTotal(r, H.value))), e12 = computed(() => T2(d.value.ex, (r) => periodTotal(r, H.value)));
const leftOver = computed(() => [incM.value - exM.value, i1.value - e1.value, i12.value - e12.value]);

// What each jar will hold.
const spark = (j) => {
  const W = 300, Ht = 74, P = 4, n = 24, vals = j.series.slice(0, n + 1), goal = j.need > 0 && j.need <= Math.max(...vals) * 1.5 ? j.need : null, mx = Math.max(1, ...vals, goal || 0);
  const x = (i) => P + (i * (W - 2 * P)) / n, y = (v) => Ht - 8 - (v / mx) * (Ht - 18), pts = vals.map((v, i) => x(i) + "," + y(v)).join(" ");
  return { W, Ht, P, goal: goal != null ? y(goal) : null, area: `${x(0)},${Ht - 8} ${pts} ${x(n)},${Ht - 8}`, pts, dots: [3, 6, 12].map((k) => ({ cx: x(k), cy: y(vals[k]) })), col: `var(--c${(j.p - 1) % 7})` };
};
const jarCards = computed(() => M.value.jars.J.map((j) => {
  const open = !(j.need > 0), bill = j.cap == null && !open && !!j.bill, cp = M.value.capOf(j, j.got) || 0, at = (k) => j.series[Math.min(k, j.series.length - 1)], gain = (k) => at(k) - at(0);
  const dl = j.due ? M.value.monthsTo(j.due) : null, short = !bill && at(12) < j.planned[12] - 1 && (j.planned[12] - at(12)) / Math.max(1, j.planned[12] - at(0)) > 0.1;
  let chip;
  if (bill) chip = ["dn", t("forecast.j.funded")];
  else if (!open && j.bal >= j.need) chip = ["dn", t("forecast.j.reached")];
  else if (j.eta) chip = dl != null && j.eta > dl ? ["up", t("fc.j.fullLate", { when: jarWhen(j.eta) })] : ["dn", t("fc.j.full", { when: jarWhen(j.eta) })];
  else chip = open ? ["fl", t("forecast.j.noGoal")] : ["fl", t("forecast.j.notIn5")];
  const sub = bill ? t("forecast.j.refilled", { amount: fm(j.need) }) : [cp ? t("forecast.j.perMonth", { amount: fm(cp) }) : t("fc.j.noMonthly"), open ? t("forecast.j.noGoalLow") : t("forecast.j.goal", { amount: fm(j.need) }), ...(j.due ? [t("forecast.j.by", { when: new Date(j.due).toLocaleDateString(loc.value, { month: "short", year: "numeric" }) })] : [])].join(" · ");
  const tile = (label, k) => ({ label, v: fm(at(k)), g: k ? (gain(k) > 0 ? "+" : "") + fm(gain(k)) : t("forecast.j.today"), pos: k && gain(k) > 0 });
  return { j, chip, sub, sp: spark(j), tiles: [tile(t("forecast.now"), 0), tile(t("forecast.j.mo3"), 3), tile(t("forecast.j.mo6"), 6), tile(t("forecast.y1"), 12)], warn: short ? t("forecast.j.short", { planned: fm(cp), avg: fm(Math.max(0, gain(12) / 12)) }) : "" };
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
        <div><div class="pl">{{ t("forecast.horizon") }}</div><div class="seg"><button v-for="[v, l] in [[3, 'mo3'], [6, 'mo6'], [12, 'y1']]" :key="v" :class="{ on: fc.h == v }" data-a="fc" @click="pick('h', v)">{{ tk("forecast." + l) }}</button></div></div>
        <div><div class="pl">{{ t("forecast.based") }}</div><div class="seg"><button v-for="[v, l] in [[3, 'mo3'], [6, 'mo6'], [12, 'mo12']]" :key="v" :class="{ on: fc.n == v }" data-a="fc" @click="pick('n', v)">{{ tk("forecast." + l) }}</button></div></div>
        <div><div class="pl">{{ t("forecast.method") }}</div><div class="seg"><button v-for="v in ['smart', 'avg', 'trend']" :key="v" :class="{ on: fc.m == v }" data-a="fc" @click="pick('m', v)">{{ tk("forecast." + v) }}</button></div></div>
        <div class="sm" style="flex-basis:100%;margin-top:-6px">{{ tk("fc.x.ctl" + fc.n) }}</div>
      </div>

      <div class="grid g4" id="fcK">
        <BaseCard v-for="[k, l] in CARDS" :key="k" :hero="k == H">
          <div class="lbl"><span>{{ tk("forecast." + l) }}{{ k ? " · " + mlab(k) : "" }}</span></div>
          <div class="val"><small>₪</small>{{ d.bal[k] < 0 ? "−" : "" }}{{ n0(d.bal[k]) }}</div>
          <template v-if="k">
            <div class="sm"><span class="bd" :class="d.bal[k] - d.start >= 0 ? 'dn' : 'up'">{{ d.bal[k] - d.start >= 0 ? "▲" : "▼" }} ₪{{ n0(d.bal[k] - d.start) }}</span> {{ t("forecast.vsNow") }}</div>
            <div class="sm" style="margin-top:6px">{{ t("forecast.range", { lo: sg(d.lo[k]), hi: sg(d.hi[k]) }) }}</div>
          </template>
          <template v-else>
            <div class="sm">{{ t("forecast.today") }}</div>
            <div class="sm" style="margin-top:6px">{{ t("forecast.nextNet", { v: (d.bal[1] - d.start >= 0 ? "+" : "−") + "₪" + n0(d.bal[1] - d.start) }) }}</div>
          </template>
        </BaseCard>
      </div>

      <div class="sm" id="fcDiag" style="line-height:1.55"><b style="color:var(--tx)">{{ t("forecast.diag.title") }}</b> {{ t("forecast.diag.main", { inc: fm(incM), exp: fm(exM), span: t("forecast.diag.span", { n: nEff }, nEff), months: usedMonths, cur: mshort(M.FH.keys[M.FH.last]) }) }}<template v-if="M.cardPays"> {{ t("forecast.diag.cards", { n: M.cardPays }, M.cardPays) }}</template><template v-if="fc.n > nEff"> {{ t("forecast.diag.only", { n: nEff }, nEff) }}</template><template v-if="zeroMonths.length"> <span class="neg">{{ t("forecast.diag.zero", { months: zeroMonths.join(", ") }) }}</span></template></div>

      <!-- the inner span keeps the parts around the dot together, like the current app's wrapper (polish.js puts the dot inside it) -->
      <h2><span>{{ t("fc.x.chartTitle") }}</span></h2>
      <div class="card" id="fcChart">
        <div class="flex" style="justify-content:space-between;margin-bottom:6px">
          <div class="sm">{{ t("forecast.methodLine", { how: tk("forecast.how." + fc.m), span: t("forecast.lastSpan", { n: nEff }, nEff) }) }}</div>
          <span v-if="C.fn > 0" class="bd up">{{ t("forecast.warnNeg", { when: mlab(C.fn) }) }}</span>
          <span v-else-if="C.fl > 0" class="bd fl">{{ t("forecast.warnLow", { when: mlab(C.fl) }) }}</span>
          <span v-else class="bd dn">{{ t("forecast.warnOk") }}</span>
        </div>
        <div class="trw fcw">
          <svg ref="svgEl" class="fcs" width="100%" :viewBox="`0 0 ${C.W} ${C.Ht}`" @pointermove="onMove" @pointerdown="onMove" @pointerleave="onLeave">
            <template v-for="(tk2, i) in C.ticks" :key="i"><line class="gl" :x1="C.Pl" :x2="C.W - C.Pr" :y1="tk2.y" :y2="tk2.y" stroke-dasharray="3 5" /><text :x="C.Pl - 8" :y="tk2.y + 4" text-anchor="end">{{ tk2.label }}</text></template>
            <template v-if="C.zeroY != null"><line :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.zeroY" :y2="C.zeroY" stroke="var(--neg)" stroke-width="1.5" stroke-dasharray="6 4" /><text :x="C.W - C.Pr" :y="C.zeroY - 5" text-anchor="end" style="fill:var(--neg)">{{ t("forecast.zero") }}</text></template>
            <defs><linearGradient id="fcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".06" /></linearGradient></defs>
            <polygon fill="url(#fcg)" :points="C.band" />
            <template v-for="k in [3, 6, 12].filter((x) => x <= H)" :key="'m' + k"><line :x1="C.X(k)" :x2="C.X(k)" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx2)" stroke-opacity=".35" stroke-dasharray="2 5" /><text :x="C.X(k)" :y="C.Pt - 7" text-anchor="middle" style="font-weight:600;fill:var(--tx)">{{ horizonLabel(k) }}</text></template>
            <polyline fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" :points="C.line" />
            <template v-for="k in H + 1" :key="'p' + k"><circle :cx="C.X(k - 1)" :cy="C.Y(d.bal[k - 1])" :r="[3, 6, 12].includes(k - 1) || k - 1 == 0 ? 5.5 : 4" :fill="[3, 6, 12].includes(k - 1) || k - 1 == 0 ? 'var(--acc)' : 'var(--bg)'" stroke="var(--acc)" stroke-width="2.5" /><text v-if="H <= 6 || (k - 1) % 2 == 0 || k - 1 == H" :x="C.X(k - 1)" :y="C.Ht - 9" text-anchor="middle">{{ k - 1 ? mlab(k - 1) : t("forecast.now") }}</text></template>
            <line class="trx" :x1="hover ? C.X(hover.k) : 0" :x2="hover ? C.X(hover.k) : 0" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" :style="{ display: hover ? '' : 'none' }" />
            <circle class="trd" :cx="hover ? C.X(hover.k) : 0" :cy="hover ? C.Y(d.bal[hover.k]) : 0" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="2.5" :style="{ display: hover ? '' : 'none' }" />
          </svg>
          <div ref="tipEl" class="trtip" :style="hover ? { display: 'flex', inset: hover.py + 'px auto auto ' + hover.px + 'px' } : { display: 'none' }"><template v-if="hover"><b>{{ hover.k ? mlab(hover.k) : t("forecast.now") }}</b><span>{{ sg(d.bal[hover.k]) }}</span><small v-if="hover.k">{{ t("forecast.tipRange", { lo: sg(d.lo[hover.k]), hi: sg(d.hi[hover.k]) }) }}</small></template></div>
        </div>
        <div class="flex sm" style="gap:18px"><span><span class="dot" style="background:var(--acc)" /> {{ t("forecast.legBal") }}</span><span><span class="dot" style="background:color-mix(in srgb,var(--acc) 25%,transparent)" /> {{ t("forecast.legRange") }}</span></div>
      </div>

      <h2>{{ t("forecast.drives") }}</h2>
      <div id="fcTab" style="overflow-x:auto">
        <div class="sm" style="margin:0 2px 12px;line-height:1.55"><span>{{ t("forecast.basedOn", { n: nEff }, nEff) }}</span> <span>{{ t("forecast.tableNote") }}</span></div>
        <table class="rt">
          <thead><tr><th /><th style="text-align:end">{{ t("forecast.usually") }}</th><th style="text-align:end">{{ t("forecast.nextMonth") }}</th><th style="text-align:end">{{ H == 12 ? t("forecast.nextYear") : t("forecast.nextN", { n: H }) }}</th><th>{{ t("forecast.direction") }}</th></tr></thead>
          <tbody>
            <tr class="grp"><td colspan="5">{{ t("forecast.in") }}</td></tr>
            <tr v-for="x in incRows" :key="'i' + x.r.k"><td class="mer"><span class="catl" @click="goCat(x.r.k)">{{ srcName(x.r.k) }}</span></td><td class="am">₪{{ n0(x.r.mean) }}</td><td class="am">₪{{ n0(x.r.at(1)) }}</td><td class="am">₪{{ n0(x.tot) }}</td><td><span class="bd" :class="x.cls" v-rich="x.tip">{{ x.sym }}{{ tk("forecast.dir." + x.word) }}</span></td></tr>
            <tr class="tot"><td>{{ t("forecast.totalIn") }}</td><td class="am">₪{{ n0(incM) }}</td><td class="am">₪{{ n0(i1) }}</td><td class="am pos">₪{{ n0(i12) }}</td><td /></tr>
            <tr class="grp"><td colspan="5">{{ t("forecast.out") }}</td></tr>
            <tr v-for="x in exRows" :key="'e' + x.r.k"><td class="mer"><template v-if="x.r.k == 'Other / uncategorized'">{{ catName(x.r.k) }}</template><span v-else class="catl" @click="goCat(x.r.k)">{{ catName(x.r.k) }}</span></td><td class="am">₪{{ n0(x.r.mean) }}</td><td class="am">₪{{ n0(x.r.at(1)) }}</td><td class="am">₪{{ n0(x.tot) }}</td><td><span class="bd" :class="x.cls" v-rich="x.tip">{{ x.sym }}{{ tk("forecast.dir." + x.word) }}</span></td></tr>
            <tr class="tot"><td>{{ t("forecast.totalOut") }}</td><td class="am">₪{{ n0(exM) }}</td><td class="am">₪{{ n0(e1) }}</td><td class="am">₪{{ n0(e12) }}</td><td /></tr>
            <tr class="tot"><td>{{ t("forecast.left") }}</td><td v-for="(v, i) in leftOver" :key="i" class="am" :class="v < 0 ? 'neg' : 'pos'">{{ v < 0 ? "−" : "" }}₪{{ n0(v) }}</td><td /></tr>
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
            <div v-if="c.warn" class="jfw">{{ c.warn }}</div>
          </div>
        </div>
        <div v-else class="card sm">{{ t("forecast.j.none") }}</div>
        <div class="sm" style="margin-top:12px;line-height:1.55">{{ t("forecast.jarFoot", { free: fm(M.jars.pool0), net: sg(M.jars.net), span: t("forecast.lastN", { n: nEff }, nEff) }) }}</div>
      </div>

      <div class="sm" id="fcNote" style="line-height:1.6"><b style="color:var(--tx)">{{ t("forecast.note.title") }}</b>{{ " " + t("forecast.note.a", { span: t("forecast.lastSpan", { n: nEff }, nEff) }) }} <i>{{ t("forecast.avg") }}</i>{{ " " + t("forecast.note.b") }} <i>{{ t("forecast.trend") }}</i>{{ " " + t("forecast.note.c") }}</div>
    </template>
  </section>
</template>
