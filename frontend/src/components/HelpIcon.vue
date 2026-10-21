<script setup>
// The small (i) button next to a word that needs explaining. Shows the explanation in a tooltip.
// Markup is the old app's .hq button (styled in styles/legacy.css).
import BaseTooltip from "./BaseTooltip.vue";
defineProps({ text: { type: String, required: true }, label: { type: String, required: true } });
</script>

<template>
  <BaseTooltip :text="text">
    <button type="button" class="hq" :aria-label="label"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></button>
  </BaseTooltip>
</template>
