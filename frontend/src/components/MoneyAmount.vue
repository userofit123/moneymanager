<script setup>
// An amount of money, like ₪1,250. Always reads left to right (also in Hebrew) and lines up in columns.
// tone: "auto" colors money coming in green and going out red; "plain" keeps the normal text color.
import { computed } from "vue";
import { formatMoney } from "../format.js";
const props = defineProps({ value: { type: Number, required: true }, currency: { type: String, default: "ILS" }, decimals: { type: Number, default: 0 }, sign: Boolean, tone: { type: String, default: "plain" }, size: { type: String, default: "normal" } });
const text = computed(() => formatMoney(props.value, { currency: props.currency, decimals: props.decimals, sign: props.sign }));
const color = computed(() => (props.tone === "auto" ? (props.value > 0 ? "pos" : props.value < 0 ? "neg" : "") : ""));
</script>

<template>
  <span class="num amt" :class="[color, size]" dir="ltr">{{ text }}</span>
</template>

<style scoped>
.amt { unicode-bidi: isolate; white-space: nowrap; font-weight: 600; }
.big { display: block; font-size: var(--fs-val); letter-spacing: -1px; margin: var(--sp2) 0 2px; }
.small { font-size: var(--fs-sm); font-weight: 500; }
</style>
