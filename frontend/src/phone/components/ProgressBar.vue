<script setup>
// How far along something is (a budget spent, a jar filled): value of max. tone: "acc", "warn" or "neg".
import { computed } from "vue";
import { clampPercent } from "../../format.js";
const props = defineProps({ value: { type: Number, default: 0 }, max: { type: Number, default: 0 }, tone: { type: String, default: "acc" }, label: { type: String, default: "" } });
const pct = computed(() => clampPercent(props.value, props.max));
</script>

<template>
  <span class="ph-prog" :class="tone" role="progressbar" :aria-label="label || undefined" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(pct)"><i :style="{ inlineSize: pct + '%' }" /></span>
</template>
