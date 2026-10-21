<script setup>
// A line with a soft area under it, like the current app's account chart (accSvg in web/js/05-accounts-charts-help.js),
// with its hover: a dashed line and a dot follow the pointer to the nearest point and a small box shows that point's name and amount
// (hvReg/hoverInit). Touch shows it too. box: the width the chart may use (the page's width), as the old chart measured it.
import { ref, computed } from "vue";
import { fm } from "../../format.js";

const props = defineProps({ vals: { type: Array, required: true }, labels: { type: Array, required: true }, full: { type: Array, default: null }, color: { type: String, default: "var(--acc)" }, box: { type: Number, default: 0 }, gid: { type: String, default: "accg" } });
const G = computed(() => {
  const v = props.vals, cw = props.box || Math.min((typeof innerWidth == "number" ? innerWidth : 1200) - 110, 1100), W = Math.max(300, Math.round(cw - 48)), H = W < 520 ? 190 : 230, Pl = W < 520 ? 38 : 46, Pr = 10, Pt = 14, Pb = 26;
  const mx = Math.max(1, ...v), mn = Math.min(0, ...v), x = (i) => Pl + (i * (W - Pl - Pr)) / Math.max(1, v.length - 1), y = (n) => H - Pb - ((n - mn) / (mx - mn || 1)) * (H - Pb - Pt);
  const grid = [0, 1, 2, 3].map((k) => { const n = mn + ((mx - mn) * k) / 3; return { y: y(n), t: Math.abs(n) >= 1000 ? (n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1) + "k" : Math.round(n) }; });
  const pts = v.map((n, i) => x(i) + "," + y(n)).join(" "), base = y(Math.max(0, mn));
  return { W, H, Pl, Pr, Pt, Pb, x, y, grid, pts, area: `${x(0)},${base} ${pts} ${x(v.length - 1)},${base}`, xs: v.map((_, i) => x(i)) };
});
const svg = ref(null), tip = ref(null), hv = ref(null);
function show(e) {
  const r = svg.value?.getBoundingClientRect(); if (!r || !r.width) return;
  const k = G.value.W / r.width, vx = (e.clientX - r.left) * k; let i = 0, best = 1e9;
  G.value.xs.forEach((x, j) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = j; } });
  hv.value = { i, k, rw: r.width };
}
const tipStyle = computed(() => {
  if (!hv.value) return { display: "none" };
  const { i, k, rw } = hv.value, w = tip.value?.offsetWidth || 120, h = tip.value?.offsetHeight || 44, px = G.value.xs[i] / k, ty = G.value.y(props.vals[i]);
  return { left: Math.max(0, Math.min(rw - w, px - w / 2)) + "px", top: Math.max(0, ty / k - h - 12) + "px" };
});
</script>

<template>
  <div class="trw tight">
    <svg ref="svg" :viewBox="`0 0 ${G.W} ${G.H}`" :width="G.W" :height="G.H" style="display:block;max-width:100%;height:auto" aria-hidden="true" @pointermove="show" @pointerdown="show" @pointerleave="hv = null">
      <defs><linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="color" stop-opacity=".32" /><stop offset="1" :stop-color="color" stop-opacity="0" /></linearGradient></defs>
      <template v-for="(g, k) in G.grid" :key="k"><line class="gl" :x1="G.Pl" :x2="G.W - G.Pr" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="G.Pl - 6" :y="g.y + 4" text-anchor="end">{{ g.t }}</text></template>
      <polygon :fill="`url(#${gid})`" :points="G.area" />
      <polyline fill="none" :stroke="color" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" :points="G.pts" />
      <circle v-for="(v, i) in vals" :key="'c' + i" :cx="G.x(i)" :cy="G.y(v)" :r="i == vals.length - 1 ? 4.5 : 0" fill="var(--bg)" :stroke="color" stroke-width="2.4" />
      <template v-for="(l, i) in labels" :key="'l' + i"><text v-if="i % 2 == 0 || vals.length < 8" :x="G.x(i)" :y="G.H - 6" text-anchor="middle">{{ l }}</text></template>
      <template v-if="hv"><line :x1="G.xs[hv.i]" :x2="G.xs[hv.i]" :y1="G.Pt" :y2="G.H - G.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" style="pointer-events:none" /><circle :cx="G.xs[hv.i]" :cy="G.y(vals[hv.i])" r="5" :fill="color" stroke="var(--bg)" stroke-width="2" style="pointer-events:none" /></template>
    </svg>
    <div ref="tip" class="trtip" :style="hv ? { display: 'flex', ...tipStyle } : { display: 'none' }"><template v-if="hv"><b>{{ (full || labels)[hv.i] }}</b><span>{{ fm(vals[hv.i]) }}</span></template></div>
  </div>
</template>
