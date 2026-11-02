<script setup>
// A group of rows on a rounded surface, with an optional title above, a note below, and a "See all" link in the title line.
// Slot "top": a control above the rows (a switch between two lists), or what shows instead of them (an empty state).
// pad: the card holds content that is not rows (a chart, a sentence, a form) and gets the card's inner room.
defineProps({ title: { type: String, default: "" }, note: { type: String, default: "" }, more: { type: String, default: "" }, pad: { type: Boolean, default: false } });
defineEmits(["more"]);
</script>

<template>
  <section class="ph-group">
    <div v-if="title || more" class="ph-group-h">
      <h3>{{ title }}</h3>
      <button v-if="more" type="button" class="ph-link" @click="$emit('more')">{{ more }}</button>
    </div>
    <div v-if="$slots.top" class="ph-group-top"><slot name="top" /></div>
    <div v-if="$slots.default" class="ph-group-b" :class="{ pad }"><slot /></div>
    <p v-if="note || $slots.note" class="ph-group-n"><slot name="note">{{ note }}</slot></p>
  </section>
</template>
