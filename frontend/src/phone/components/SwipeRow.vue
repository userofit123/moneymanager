<script setup>
// A row that slides sideways to show actions: from the end side (drag towards the start) "end" actions,
// from the start side "start" actions; in Hebrew the sides mirror. A long drag runs the first action.
// The same actions must also be reachable another way: a press and hold (or a right click) emits "hold", for the row's menu.
// The action buttons stay hidden while the row is at rest, so their colour never shows at a group's rounded corners.
// actions: [{ label, tone: "acc" | "neg" | "warn", run }].
import { ref, watch } from "vue";
import { sign } from "../dir.js";
const props = defineProps({ start: { type: Array, default: () => [] }, end: { type: Array, default: () => [] } });
const emit = defineEmits(["hold"]);
const x = ref(0), drag = ref(false), shown = ref(false), W = 84;
let x0 = null, y0 = 0, base = 0, lock = null, timer = 0, held = false;
const max = (side) => (side === "end" ? props.end : props.start).length * W;
function down(e) {
  x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; base = x.value; lock = null; held = false;
  clearTimeout(timer); timer = setTimeout(() => { held = true; x0 = null; navigator.vibrate?.(10); emit("hold"); }, 500);
}
function move(e) {
  if (x0 == null) return;
  const dx = (e.touches[0].clientX - x0) * sign(), dy = e.touches[0].clientY - y0;
  if (Math.abs(dx) + Math.abs(dy) > 10) clearTimeout(timer);
  if (lock == null && Math.abs(dx) + Math.abs(dy) > 8) lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  if (lock !== "x") return;
  drag.value = true; shown.value = true;
  const v = base + dx; // < 0: towards the start, shows the end actions
  x.value = Math.max(-max("end") * 1.6, Math.min(max("start") * 1.6, v));
  if (e.cancelable) e.preventDefault();
}
function up() {
  clearTimeout(timer);
  if (x0 == null) return; x0 = null; drag.value = false;
  const v = x.value, side = v < 0 ? "end" : "start", list = side === "end" ? props.end : props.start, m = max(side);
  if (list.length && Math.abs(v) > m * 1.4) { x.value = 0; list[0].run(); return; }
  x.value = list.length && Math.abs(v) > W / 2 ? (v < 0 ? -m : m) : 0;
}
// the tap that ends a press and hold does nothing else
const click = (e) => { if (held) { held = false; e.preventDefault(); e.stopPropagation(); } };
// once the row is back in place (after its slide back), the actions hide again
watch(x, (v) => { if (!v) setTimeout(() => { if (!x.value && !drag.value) shown.value = false; }, 300); });
const run = (a) => { x.value = 0; a.run(); };
</script>

<template>
  <div class="ph-swipe" :class="{ rest: !shown }" @touchstart.passive="down" @touchmove="move" @touchend="up" @touchcancel="up" @click.capture="click" @contextmenu.prevent="$emit('hold')">
    <div class="ph-swipe-a start"><button v-for="a in start" :key="a.label" type="button" :class="a.tone || 'acc'" @click="run(a)">{{ a.label }}</button></div>
    <div class="ph-swipe-a end"><button v-for="a in end" :key="a.label" type="button" :class="a.tone || 'acc'" @click="run(a)">{{ a.label }}</button></div>
    <div class="ph-swipe-row" :class="{ drag }" :style="{ transform: `translateX(${x * sign()}px)` }"><slot /></div>
  </div>
</template>
