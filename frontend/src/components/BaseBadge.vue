<script setup>
// A small red number on an icon, for example how many things need a look. Hidden when the count is 0.
// Uses the old app's .badge, which sits in the corner of the icon next to it (styled in styles/legacy.css; shown by display:grid, as the old app's script does).
defineProps({ count: { type: Number, default: 0 }, label: { type: String, required: true } });
</script>

<template>
  <span v-if="count > 0" class="badge" style="display: grid" :aria-label="label">{{ count > 99 ? "99+" : count }}</span>
</template>
