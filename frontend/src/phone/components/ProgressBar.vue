<script setup>
// How far along something is (a budget spent, a jar filled): value of max. tone: "acc", "warn" or "neg"; color: its own colour
// (a jar's), instead of the tone. mark: an optional thin line at a place on the bar (0 to 100), such as today's place in the month.
import { computed } from "vue";
import { clampPercent } from "../../format.js";
const props = defineProps({ value: { type: Number, default: 0 }, max: { type: Number, default: 0 }, tone: { type: String, default: "acc" }, color: { type: String, default: "" }, mark: { type: Number, default: null }, label: { type: String, default: "" } });
const pct = computed(() => clampPercent(props.value, props.max));
</script>

<template>
  <span class="ph-prog-w">
    <span class="ph-prog" :class="tone" role="progressbar" :aria-label="label || undefined" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(pct)"><i :style="{ inlineSize: pct + '%', background: color || undefined }" /></span>
    <u v-if="mark != null" class="ph-prog-m" :style="{ insetInlineStart: Math.max(0, Math.min(100, mark)) + '%' }" aria-hidden="true" />
  </span>
</template>
