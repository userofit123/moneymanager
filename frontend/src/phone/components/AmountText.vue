<script setup>
// An amount, always formatted the same way (format.js) with even-width digits: money in is green with a plus,
// money out is plain, and red only when asked (over a limit, a balance below zero).
import { computed } from "vue";
import { fmCur } from "../../format.js";
const props = defineProps({ value: { type: Number, default: 0 }, currency: { type: String, default: "ILS" }, signed: { type: Boolean, default: false }, bad: { type: Boolean, default: false } });
const text = computed(() => (props.signed && props.value > 0 ? "+" : "") + fmCur(props.value, props.currency));
</script>

<template>
  <span class="ph-amt" :class="{ pos: signed && value > 0, neg: bad }">{{ text }}</span>
</template>
