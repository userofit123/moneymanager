<script setup>
// A bar that fills up, for example how much of a budget is used. Turns red when it goes over the limit.
import { computed } from "vue";
import { clampPercent } from "../format.js";
const props = defineProps({ value: { type: Number, required: true }, max: { type: Number, default: 100 }, label: { type: String, required: true } });
const pct = computed(() => clampPercent(props.value, props.max));
const over = computed(() => props.max > 0 && props.value > props.max);
</script>

<template>
  <div class="bar" :class="{ over }" role="progressbar" :aria-label="label" aria-valuemin="0" :aria-valuemax="max" :aria-valuenow="value">
    <i :style="{ inlineSize: pct + '%' }" />
  </div>
</template>

<style scoped>
.bar { height: 8px; background: var(--s2); border-radius: var(--pill); overflow: hidden; margin: var(--sp3) 0 var(--sp2); }
.bar i { display: block; height: 100%; border-radius: var(--pill); background: linear-gradient(90deg, var(--acc), var(--acc2)); transition: inline-size .6s; }
:global(html.he .bar i) { background: linear-gradient(-90deg, var(--acc), var(--acc2)); }
.over i { background: var(--neg) !important; }
</style>
