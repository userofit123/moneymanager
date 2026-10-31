<script setup>
// A ring that fills as something gets closer to its goal (a jar), with an optional icon or text in the middle.
import { computed } from "vue";
import { clampPercent } from "../../format.js";
const props = defineProps({ value: { type: Number, default: 0 }, max: { type: Number, default: 0 }, size: { type: Number, default: 40 }, tone: { type: String, default: "acc" }, label: { type: String, default: "" } });
const C = 2 * Math.PI * 16;
const off = computed(() => C * (1 - clampPercent(props.value, props.max) / 100));
</script>

<template>
  <span class="ph-ring" :class="tone" :style="{ inlineSize: size + 'px', blockSize: size + 'px' }" role="img" :aria-label="label || undefined">
    <svg viewBox="0 0 40 40" aria-hidden="true"><circle class="trk" cx="20" cy="20" r="16" /><circle class="val" cx="20" cy="20" r="16" :stroke-dasharray="C" :stroke-dashoffset="off" /></svg>
    <span class="ph-ring-in"><slot /></span>
  </span>
</template>
