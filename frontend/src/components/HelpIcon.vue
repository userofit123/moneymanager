<script setup>
// The small (i) button next to a word that needs explaining. Shows the explanation in a tooltip.
import BaseTooltip from "./BaseTooltip.vue";
defineProps({ text: { type: String, required: true }, label: { type: String, required: true } });
</script>

<template>
  <BaseTooltip :text="text">
    <button type="button" class="hq" :aria-label="label"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></button>
  </BaseTooltip>
</template>

<style scoped>
.hq { display: inline-grid; place-items: center; width: 20px; height: 20px; margin-inline-start: 6px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; opacity: .55; cursor: pointer; transition: opacity .15s, background .15s, color .15s; }
.hq svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.hq:hover, .hq:focus-visible { opacity: 1; color: var(--acc); background: color-mix(in srgb, var(--acc) 12%, transparent); outline: 0; }
</style>
