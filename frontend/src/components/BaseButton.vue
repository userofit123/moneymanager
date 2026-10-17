<script setup>
// variant: "filled" (main action), "tonal" (second action), "text" (quiet action)
defineProps({ variant: { type: String, default: "filled" }, type: { type: String, default: "button" } });
</script>

<template>
  <button :type="type" class="btn" :class="variant"><slot /></button>
</template>

<style scoped>
.btn { min-height: 40px; padding: 0 20px; border-radius: 999px; border: 0; cursor: pointer; font-weight: 600; background: var(--accent); color: var(--accent-fg); }
.btn.tonal { background: var(--accent-soft); color: var(--accent); }
.btn.text { background: transparent; color: var(--accent); padding: 0 12px; }
.btn:hover { filter: brightness(1.06); }
.btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.btn:disabled { opacity: .5; cursor: default; }
</style>
