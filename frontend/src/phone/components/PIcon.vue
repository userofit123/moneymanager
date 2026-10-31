<script setup>
// One phone icon by name (phone/icons.js) or by its drawing (svg). dir: it points somewhere, so it mirrors in Hebrew.
import { computed } from "vue";
import { ICONS } from "../icons.js";
const props = defineProps({ name: { type: String, default: "" }, svg: { type: String, default: "" }, dir: { type: Boolean, default: false } });
const inner = computed(() => props.svg || ICONS[props.name] || "");
</script>

<template>
  <svg class="ph-ic" :class="{ dir }" viewBox="0 0 24 24" aria-hidden="true" v-html="inner" />
</template>
