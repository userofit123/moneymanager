<script setup>
// A small label. kind: "plain" (outlined), "tint" (colored, like a tag), "good" (green), "bad" (red), "info".
// With "clickable" it is a button (for filters). Classes are the old app's: chip, chip t, and the .bd badges (bd dn green, bd up red, bd bill blue).
defineProps({ kind: { type: String, default: "plain" }, clickable: Boolean, selected: Boolean });
defineEmits(["click"]);
const cls = { plain: "chip", tint: "chip t", good: "bd dn", bad: "bd up", info: "bd bill" };
</script>

<template>
  <component :is="clickable ? 'button' : 'span'" :class="[cls[kind] || 'chip', { 'chip-on': selected }]" :type="clickable ? 'button' : undefined" :aria-pressed="clickable ? selected : undefined" :style="clickable ? 'cursor:pointer;font-family:inherit' : undefined" @click="clickable && $emit('click')"><slot /></component>
</template>

<style>
.chip-on { background: var(--accc); color: var(--onc); border-color: transparent; }
</style>
