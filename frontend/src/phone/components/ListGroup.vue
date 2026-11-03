<script setup>
// A section of a page, as on the computer: a small heading with an optional "All" link at its end, one card, and an
// optional note below. Slot "top": a control above the card (a switch between two views), or what shows instead of it
// (an empty state). Slot "head": a control at the heading's end, before the link (Home's Current / Planned).
// pad: the card holds content that is not rows (a chart, a sentence, a form) and gets the card's inner room.
// bare: no card; the slot brings its own (a row of amount cards).
import PIcon from "./PIcon.vue";
defineProps({ title: { type: String, default: "" }, note: { type: String, default: "" }, more: { type: String, default: "" }, pad: { type: Boolean, default: false }, bare: { type: Boolean, default: false } });
defineEmits(["more"]);
</script>

<template>
  <section class="ph-group">
    <div v-if="title || more" class="ph-group-h">
      <h3>{{ title }}</h3>
      <slot name="head" />
      <button v-if="more" type="button" class="ph-link" @click="$emit('more')">{{ more }}<PIcon name="chevron" dir /></button>
    </div>
    <div v-if="$slots.top" class="ph-group-top"><slot name="top" /></div>
    <slot v-if="bare" />
    <div v-else-if="$slots.default" class="ph-group-b" :class="{ pad }"><slot /></div>
    <p v-if="note || $slots.note" class="ph-group-n"><slot name="note">{{ note }}</slot></p>
  </section>
</template>
