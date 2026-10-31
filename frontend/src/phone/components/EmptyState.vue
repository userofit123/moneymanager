<script setup>
// What an empty screen or list shows: an icon in a soft circle, one line, one sentence, and the action that fills it.
import PIcon from "./PIcon.vue";
defineProps({ icon: { type: String, default: "" }, iconName: { type: String, default: "" }, title: { type: String, default: "" }, text: { type: String, default: "" }, action: { type: String, default: "" } });
defineEmits(["action"]);
</script>

<template>
  <div class="ph-empty">
    <span class="ph-empty-ic"><PIcon :svg="icon" :name="iconName" /></span>
    <h3 v-if="title">{{ title }}</h3>
    <p v-if="text">{{ text }}</p>
    <button v-if="action" type="button" class="ph-btn" @click="$emit('action')">{{ action }}</button>
    <slot />
  </div>
</template>
