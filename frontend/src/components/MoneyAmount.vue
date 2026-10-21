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

<style>
.amt { unicode-bidi: isolate; white-space: nowrap; font-weight: 600; }
.amt.big { display: block; font-size: 32px; letter-spacing: -1px; margin: 8px 0 2px; }
.amt.small { font-size: 12.5px; font-weight: 500; }
</style>
