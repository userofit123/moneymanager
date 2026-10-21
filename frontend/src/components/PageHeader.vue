<script setup>
// The top of every page, same as the current app: the page name and today's date under it.
// Markup is the old app's: header > div > h1 + .sub (styled in styles/legacy.css, including the sticky band on a phone).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
defineProps({ title: { type: String, required: true } });
const { locale } = useI18n();
const today = computed(() => new Date().toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
</script>

<template>
  <header>
    <div><h1>{{ title }}</h1><div class="sub">{{ today }}</div></div>
    <slot />
  </header>
</template>
