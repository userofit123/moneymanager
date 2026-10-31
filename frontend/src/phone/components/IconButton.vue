<script setup>
// A round 44px icon button for the top bar and cards, with a count when something waits.
import PIcon from "./PIcon.vue";
defineProps({ label: { type: String, required: true }, icon: { type: String, default: "" }, iconName: { type: String, default: "" }, badge: { type: [Number, String], default: 0 } });
defineEmits(["tap"]);
</script>

<template>
  <button type="button" class="ph-ib" :aria-label="label" @click="$emit('tap')"><PIcon :svg="icon" :name="iconName" /><span v-if="badge" class="ph-badge">{{ badge }}</span></button>
</template>
