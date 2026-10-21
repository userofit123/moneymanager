<script setup>
// A card. "hero" is the colored main card at the top of a screen; "clickable" lifts on hover and acts as a button; "warn" has a red edge.
// Classes are the old app's: card, card hero, card click, card warn, and .lbl for the small title line (styled in styles/legacy.css).
const props = defineProps({ title: String, hero: Boolean, clickable: Boolean, warn: Boolean });
const emit = defineEmits(["click"]);
const key = (e) => { if (props.clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); emit("click"); } };
</script>

<template>
  <div class="card" :class="{ hero, click: clickable, warn }" :role="clickable ? 'button' : undefined" :tabindex="clickable ? 0 : undefined" @click="clickable && emit('click')" @keydown="key">
    <div v-if="title || $slots.head" class="lbl"><span>{{ title }}</span><slot name="head" /></div>
    <slot />
  </div>
</template>
