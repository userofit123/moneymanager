<script setup>
// What a screen shows when there is nothing to show yet: an icon, a title, one plain sentence, and an optional button (in the "action" slot).
defineProps({ title: { type: String, required: true }, text: String });
</script>

<template>
  <div class="empty">
    <span class="ic" aria-hidden="true"><slot name="icon"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 12h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></slot></span>
    <b>{{ title }}</b>
    <p v-if="text">{{ text }}</p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty { display: grid; gap: var(--sp2); justify-items: center; text-align: center; padding: 34px var(--sp4); }
.ic { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; background: var(--accc); color: var(--onc); margin-block-end: var(--sp1); }
b { font-size: var(--fs-lg); }
p { margin: 0 0 var(--sp2); color: var(--tx2); max-inline-size: 32rem; }
</style>
