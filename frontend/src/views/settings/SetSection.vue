<script setup>
// One card in Settings: the title line (SetHead) and the card's body under it.
// The default slot is the body (usually SetRow lines); "pad" gives the body even padding for content that is not rows.
// The "head" slot sits at the end of the title line (one button); the "foot" slot is a short grey note at the bottom.
import SetHead from "./SetHead.vue";
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  count: { type: [Number, String], default: null },
  pad: { type: Boolean, default: false },
});
</script>

<template>
  <section class="card ss">
    <SetHead :icon="icon" :title="title" :desc="desc" :count="count"><slot name="head" /></SetHead>
    <div v-if="$slots.default" class="ssb" :class="{ p: pad }"><slot /></div>
    <div v-if="$slots.foot" class="sfoot"><slot name="foot" /></div>
  </section>
</template>
