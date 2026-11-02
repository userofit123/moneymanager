<script setup>
// A part that slides open and shut (its height, with a fade) instead of popping in and out.
// The contents are only in the page while open or while sliding shut. Styles: .slo in styles/components/sections.css.
import { ref, watch, onBeforeUnmount } from "vue";
// ms: how long the slide takes (a tall part reads better with a slower, even slide)
const props = defineProps({ open: { type: Boolean, default: false }, ms: { type: Number, default: 260 } });
const on = ref(props.open), live = ref(props.open), done = ref(props.open); // done: fully open, so nothing inside is clipped (focus rings)
let tm = 0, raf = 0;
watch(() => props.open, (v) => {
  clearTimeout(tm); cancelAnimationFrame(raf); done.value = false;
  if (v) { live.value = true; raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { on.value = true; tm = setTimeout(() => { done.value = true; }, props.ms); }); }); }
  else { on.value = false; tm = setTimeout(() => { live.value = false; }, props.ms); }
});
onBeforeUnmount(() => { clearTimeout(tm); cancelAnimationFrame(raf); });
</script>

<template>
  <div class="slo" :class="{ on, done, slow: ms !== 260 }" :style="ms !== 260 ? { '--slo-ms': ms + 'ms' } : null"><div class="sloi"><slot v-if="live" /></div></div>
</template>
