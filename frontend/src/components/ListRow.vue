<script setup>
// One line in a list: an optional icon, a title with a short explanation, and something on the end (like an amount).
// With "clickable" the whole row is a button and shows an arrow that points the right way in Hebrew too.
defineProps({ title: { type: String, required: true }, subtitle: String, clickable: Boolean });
defineEmits(["click"]);
</script>

<template>
  <component :is="clickable ? 'button' : 'div'" class="row" :class="{ clickable }" :type="clickable ? 'button' : undefined" @click="clickable && $emit('click')">
    <span v-if="$slots.icon" class="icon"><slot name="icon" /></span>
    <span class="text">
      <span class="title">{{ title }}</span>
      <span v-if="subtitle" class="sub">{{ subtitle }}</span>
    </span>
    <span v-if="$slots.end" class="end"><slot name="end" /></span>
    <svg v-if="clickable" class="chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
  </component>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 12px 4px; border: 0; background: none; color: inherit; text-align: start; border-block-end: 1px solid var(--line); }
.row:last-child { border-block-end: 0; }
.clickable { cursor: pointer; border-radius: 12px; padding-inline: 8px; }
.clickable:hover { background: var(--accent-soft); }
.clickable:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
.icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); flex: none; }
.text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.title { font-weight: 600; }
.sub { color: var(--muted); font-size: .875rem; }
.end { font-weight: 600; white-space: nowrap; }
.chev { color: var(--muted); flex: none; }
:global(html.he .chev) { transform: scaleX(-1); }
</style>
