<script setup>
// One line of a card in Settings: a title and a small explanation on one side, the control on the other.
// "desc" can also be given as the "desc" slot when it has markup in it.
defineProps({ title: { type: String, default: "" }, desc: { type: String, default: "" }, cls: { type: String, default: "" } });
</script>

<template>
  <div class="sr" :class="cls">
    <div class="srt"><b><slot name="title">{{ title }}</slot></b><div v-if="desc || $slots.desc" class="sm"><slot name="desc">{{ desc }}</slot></div></div>
    <div class="src"><slot /></div>
  </div>
</template>
