<script setup>
// One screen in a tab's stack: tells the screen (and its PhoneScreen frame) where it is, and shows the screen's file.
import { provide } from "vue";
import { screenOf } from "./screens.js";
import { SCREEN_KEY } from "./navigation.js";

const props = defineProps({ entry: { type: Object, required: true }, under: { type: Object, default: null } });
provide(SCREEN_KEY, props);
</script>

<template>
  <component :is="screenOf(entry.name)" :id="entry.id" />
</template>
