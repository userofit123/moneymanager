<script setup>
// The title line of a card in Settings, the same markup as the current app's ssh() (web/js/06-trend-forecast-sync.js):
// a round icon, a bold title with an optional count, and a small grey explanation. Anything in the slot sits at the end (a button).
import { SI } from "./icons.js";
defineProps({ icon: { type: String, required: true }, title: { type: String, required: true }, desc: { type: String, default: "" }, count: { type: [Number, String], default: null } });
</script>

<template>
  <div class="ssh">
    <span class="ssi"><svg viewBox="0 0 24 24" v-html="SI[icon]" /></span>
    <div><b>{{ title }}<span v-if="count != null" class="cnt">{{ count }}</span></b><div v-if="desc" class="sm">{{ desc }}</div></div>
    <slot />
  </div>
</template>
