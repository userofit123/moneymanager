<script setup>
// A small number tile for rows of two: its name, the number, and a short line under it. Tap: emits "tap" (its explanation).
defineProps({ label: { type: String, required: true }, value: { type: String, default: "" }, note: { type: String, default: "" }, tone: { type: String, default: "" } });
defineEmits(["tap"]);
</script>

<template>
  <button type="button" class="ph-stat" :class="tone" @click="$emit('tap')"><span class="ph-stat-l">{{ label }}</span><b class="ph-stat-v">{{ value }}</b><span v-if="note" class="ph-stat-n">{{ note }}</span></button>
</template>
