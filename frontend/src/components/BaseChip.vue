<script setup>
// A small label. kind: "plain" (outlined), "tint" (colored, like a tag), "good" (green), "bad" (red), "info".
// With "clickable" it is a button (for filters).
defineProps({ kind: { type: String, default: "plain" }, clickable: Boolean, selected: Boolean });
defineEmits(["click"]);
</script>

<template>
  <component :is="clickable ? 'button' : 'span'" class="chip" :class="[kind, { clickable, selected }]" :type="clickable ? 'button' : undefined" :aria-pressed="clickable ? selected : undefined" @click="clickable && $emit('click')"><slot /></component>
</template>

<style scoped>
.chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--ol); border-radius: 10px; padding: 5px 11px; font-size: 12px; color: var(--tx2); background: var(--s1); white-space: nowrap; }
.tint { background: var(--accc); color: var(--onc); border-color: transparent; border-radius: var(--pill); }
.good { background: color-mix(in srgb, var(--pos) 15%, transparent); color: var(--pos); border-color: transparent; border-radius: var(--pill); font-weight: 600; }
.bad { background: color-mix(in srgb, var(--neg) 15%, transparent); color: var(--neg); border-color: transparent; border-radius: var(--pill); font-weight: 600; }
.info { background: color-mix(in srgb, var(--acc) 16%, transparent); color: var(--acc); border-color: transparent; border-radius: var(--pill); font-weight: 600; }
.clickable { cursor: pointer; }
.clickable:hover { background: var(--s2); color: var(--tx); }
.selected { background: var(--accc); color: var(--onc); border-color: transparent; }
.clickable:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
</style>
