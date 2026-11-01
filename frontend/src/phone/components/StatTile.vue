<script setup>
// A small number tile for rows of two: its name, the number, and a short line under it. With @tap it is a button
// (its explanation, or the list behind it); without, a plain tile that does not press.
defineProps({ label: { type: String, required: true }, value: { type: String, default: "" }, note: { type: String, default: "" }, tone: { type: String, default: "" }, onTap: { type: Function, default: null } });
</script>

<template>
  <button v-if="onTap" type="button" class="ph-stat" :class="tone" @click="onTap()"><span class="ph-stat-l">{{ label }}</span><b class="ph-stat-v">{{ value }}</b><span v-if="note" class="ph-stat-n">{{ note }}</span></button>
  <div v-else class="ph-stat" :class="tone"><span class="ph-stat-l">{{ label }}</span><b class="ph-stat-v">{{ value }}</b><span v-if="note" class="ph-stat-n">{{ note }}</span></div>
</template>
