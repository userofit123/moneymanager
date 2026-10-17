<script setup>
// A short explanation that shows on hover or keyboard focus (and on tap on phones), like the current app's tooltips.
// The cursor stays normal: never the question-mark cursor.
import { ref, useId } from "vue";
defineProps({ text: { type: String, required: true } });
const open = ref(false);
const id = useId();
</script>

<template>
  <span class="tw" @mouseenter="open = true" @mouseleave="open = false" @focusin="open = true" @focusout="open = false" @click="open = !open" @keydown.esc="open = false">
    <span :aria-describedby="id"><slot /></span>
    <span :id="id" role="tooltip" class="tip" :class="{ on: open }">{{ text }}</span>
  </span>
</template>

<style scoped>
.tw { position: relative; display: inline-flex; cursor: default; }
.tip { position: absolute; z-index: 300; inset-block-end: calc(100% + 8px); inset-inline-start: 50%; translate: -50% 4px; inline-size: max-content; max-inline-size: min(320px, calc(100vw - 20px)); padding: 10px 13px; border-radius: var(--r-sm); background: var(--s2); color: var(--tx); border: 1px solid var(--ol); box-shadow: var(--shadow-pop); font-size: 13px; font-weight: 400; line-height: 1.5; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .16s, translate .16s, visibility .16s; white-space: normal; }
:global(html.he .tw .tip) { translate: 50% 4px; }
.tip.on { opacity: 1; visibility: visible; translate: -50% 0; }
:global(html.he .tw .tip.on) { translate: 50% 0; }
</style>
