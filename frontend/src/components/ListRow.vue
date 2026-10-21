<script setup>
// One line in a list: an optional icon, a title with a short explanation, and something on the end (like an amount).
// Markup is the old app's: .row > icon + .grow (b + .sm) + end (styled in styles/legacy.css). With "clickable" the whole row is a button.
defineProps({ title: { type: String, required: true }, subtitle: String, clickable: Boolean });
const emit = defineEmits(["click"]);
const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); emit("click"); } };
</script>

<template>
  <div class="row" :class="{ 'row-click': clickable }" :role="clickable ? 'button' : undefined" :tabindex="clickable ? 0 : undefined" @click="clickable && emit('click')" @keydown="clickable && key($event)">
    <slot name="icon" />
    <div class="grow"><b>{{ title }}</b><div v-if="subtitle" class="sm">{{ subtitle }}</div></div>
    <div v-if="$slots.end" style="text-align: end"><b class="num"><slot name="end" /></b></div>
  </div>
</template>

<style>
.row-click { cursor: pointer; }
</style>
