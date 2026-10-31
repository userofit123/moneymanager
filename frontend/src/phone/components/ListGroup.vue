<script setup>
// A group of rows on a rounded surface, with an optional title above, a note below, and a "See all" link in the title line.
defineProps({ title: { type: String, default: "" }, note: { type: String, default: "" }, more: { type: String, default: "" } });
defineEmits(["more"]);
</script>

<template>
  <section class="ph-group">
    <div v-if="title || more" class="ph-group-h">
      <h3>{{ title }}</h3>
      <button v-if="more" type="button" class="ph-link" @click="$emit('more')">{{ more }}</button>
    </div>
    <div class="ph-group-b"><slot /></div>
    <p v-if="note || $slots.note" class="ph-group-n"><slot name="note">{{ note }}</slot></p>
  </section>
</template>
