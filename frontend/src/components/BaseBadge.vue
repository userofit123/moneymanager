<script setup>
// A small red number on an icon, for example how many things need a look. Hidden when the count is 0.
defineProps({ count: { type: Number, default: 0 }, label: { type: String, required: true } });
</script>

<template>
  <span v-if="count > 0" class="badge" :aria-label="label">{{ count > 99 ? "99+" : count }}</span>
</template>

<style scoped>
.badge { display: inline-grid; place-items: center; min-inline-size: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--neg); color: #fff; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
