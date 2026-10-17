<script setup>
defineProps({ title: String });
</script>

<template>
  <section class="card">
    <h2 v-if="title">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--gap); }
h2 { margin: 0 0 8px; font-size: 1.05rem; }
</style>
