<script setup>
// Years ahead's chart (Forecast, computer and phone): the money year by year with the amounts tried (a solid line with a soft
// area), at today's pace (a thin dashed line, on top so it shows when the two are the same), the goal (a dashed line across) and the point where the goal is reached.
// Drawn at its real width so its words keep their size. Its amounts are rounded the same way as the sentences (about()). Pointing at it, or touching and sliding along it, shows a year.
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { fm } from "../../format.js";
import { yearsChartOf, about } from "../../lib/yearsAhead.js";

const props = defineProps({
  chart: { type: Object, required: true }, // lib/yearsAhead.js yearsAheadModel(...).chart
  name: { type: Function, required: true }, // a year's name for the box: "Age 45", "In 11 years"
  axis: { type: Function, required: true }, // a year's label along the bottom
  label: { type: String, default: "" },
  paceLabel: { type: String, default: "" },
  height: { type: Number, default: 240 },
});
const wrap = ref(null), cw = ref(700), hv = ref(null);
let ro = null;
onMounted(() => {
  const fit = () => { const w = Math.round(wrap.value?.getBoundingClientRect().width || 0); if (w > 160) cw.value = w; };
  fit();
  if (typeof ResizeObserver !== "undefined" && wrap.value) { ro = new ResizeObserver(fit); ro.observe(wrap.value); }
});
onBeforeUnmount(() => ro?.disconnect());
const C = computed(() => yearsChartOf(props.chart, cw.value, props.height));
function show(e) {
  const r = e.currentTarget.getBoundingClientRect(); if (!r.width) return;
  const vx = ((e.clientX - r.left) / r.width) * C.value.W;
  hv.value = C.value.pts.reduce((b, p) => (Math.abs(p.x - vx) < Math.abs(b.x - vx) ? p : b), C.value.pts[0]).i;
}
const P = computed(() => (hv.value == null ? null : C.value.pts[Math.min(hv.value, C.value.pts.length - 1)]));
const tipStyle = computed(() => {
  if (!P.value) return { display: "none" };
  // above the higher of the two dots, kept inside the chart (the chart is drawn left to right, so its sides are fixed)
  const x = Math.max(80, Math.min(C.value.W - 80, P.value.x)), y = Math.max(0, Math.min(P.value.y, C.value.Y(P.value.p)) - 74);
  return { display: "flex", inset: `${y}px auto auto ${x}px` };
});
</script>

<template>
  <div ref="wrap" class="trw tight yac">
    <svg :viewBox="`0 0 ${C.W} ${C.Ht}`" :width="C.W" :height="C.Ht" style="direction:ltr;display:block;max-width:100%;height:auto" role="img" :aria-label="label"
      @pointermove="show" @pointerdown="show" @pointerleave="hv = null">
      <template v-for="(g, i) in C.ticks" :key="i"><line class="gl" :x1="C.Pl" :x2="C.W - C.Pr" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="C.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
      <defs><linearGradient id="yacg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".26" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".03" /></linearGradient></defs>
      <polygon fill="url(#yacg)" :points="C.area" />
      <line v-if="C.atX != null" :x1="C.atX" :x2="C.atX" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx2)" stroke-opacity=".35" stroke-dasharray="2 5" />
      <line class="yac-goal" :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.goalY" :y2="C.goalY" />
      <polyline class="yac-mine" :points="C.mine" />
      <polyline class="yac-pace" :points="C.pace" />
      <template v-if="C.hit"><circle :cx="C.hit.x" :cy="C.hit.y" r="9" class="yac-hit-h" /><circle :cx="C.hit.x" :cy="C.hit.y" r="5" class="yac-hit" /></template>
      <text v-for="x in C.xs" :key="'x' + x.i" :x="x.x" :y="C.Ht - 8" :text-anchor="x.i == 0 ? 'start' : x.i == chart.years ? 'end' : 'middle'">{{ axis(x.i) }}</text>
      <template v-if="P">
        <line :x1="P.x" :x2="P.x" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" />
        <circle :cx="P.x" :cy="C.Y(P.p)" r="4" fill="var(--bg)" stroke="var(--tx2)" stroke-width="2" />
        <circle :cx="P.x" :cy="P.y" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="2.5" />
      </template>
    </svg>
    <div class="trtip yac-tip" :style="tipStyle"><template v-if="P"><b>{{ name(P.i) }}</b><span>{{ fm(about(P.v)) }}</span><small v-if="paceLabel">{{ paceLabel }}: {{ fm(about(P.p)) }}</small></template></div>
  </div>
</template>
