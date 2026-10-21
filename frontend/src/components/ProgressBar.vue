<script setup>
// A bar that fills up, for example how much of a budget is used. Turns red when it goes over the limit.
// Markup is the old app's .bar > i (styled in styles/legacy.css).
import { computed } from "vue";
import { clampPercent } from "../format.js";
const props = defineProps({ value: { type: Number, required: true }, max: { type: Number, default: 100 }, label: { type: String, required: true } });
const pct = computed(() => clampPercent(props.value, props.max));
const over = computed(() => props.max > 0 && props.value > props.max);
</script>

<template>
  <div class="bar" role="progressbar" :aria-label="label" aria-valuemin="0" :aria-valuemax="max" :aria-valuenow="value">
    <i :style="{ width: pct + '%', ...(over ? { background: 'var(--neg)' } : {}) }" />
  </div>
</template>
