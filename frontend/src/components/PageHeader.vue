<script setup>
// The top of every page, same as the current app: the page name and today's date under it.
// On a phone it stays at the top while scrolling, on a see-through blurred band.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
defineProps({ title: { type: String, required: true } });
const { locale } = useI18n();
const today = computed(() => new Date().toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
</script>

<template>
  <header class="ph">
    <div><h1>{{ title }}</h1><div class="sub">{{ today }}</div></div>
    <slot />
  </header>
</template>

<style scoped>
/* web/css/app.css: header, h1, .sub, and html.mob main>header */
.ph { margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h1 { font-size: 30px; font-weight: 600; letter-spacing: -.6px; margin: 0; }
.sub { color: var(--tx2); font-size: 13px; margin-top: 2px; }
@media (max-width: 860px), (pointer: coarse) and (max-width: 1100px) {
  .ph { position: sticky; top: 0; z-index: 30; margin: 0 -16px 8px; padding: calc(10px + var(--st)) 16px 10px; gap: 8px; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(18px) saturate(1.4); -webkit-backdrop-filter: blur(18px) saturate(1.4); }
  h1 { font-size: 24px; line-height: 1.15; letter-spacing: -.4px; font-weight: 700; }
  .sub { font-size: 12px; margin-top: 1px; opacity: .85; }
}
@media (max-width: 360px) { .ph { margin-inline: -12px; padding-inline: 12px; } }
</style>
