<script setup>
// The top of every page: the page name and today's date under it.
// Markup: header > div > h1 + .sub (styled in styles/app.css, including the sticky band on a phone).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { now } from "../core/clock.js";
defineProps({ title: { type: String, required: true } });
const { locale } = useI18n();
const today = computed(() => now.value.toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
</script>

<template>
  <header>
    <div><h1>{{ title }}</h1><div class="sub">{{ today }}</div></div>
    <slot />
  </header>
</template>
