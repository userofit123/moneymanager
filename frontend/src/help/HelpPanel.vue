<script setup>
// The guide panel that slides in from the side (the help button is in App.vue). Same markup and class names as the current app (#help, .helph, .helpb).
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { current } from "../router.js";
import { helpOpen, helpSet, guideOf, guideHtml, watchDots } from "./help.js";
import { escLayer } from "../core/layers.js";
import { settingsTab } from "../views/settings/tab.js";
escLayer(helpOpen, () => helpSet(false));

const { t, locale } = useI18n();
const tk = (k) => t(k);
const he = computed(() => locale.value === "he");
// Settings has a guide for each section (helpKey: "set." + the open section).
const page = computed(() => (current.value.name === "settings" ? "set." + settingsTab.value : current.value.name));
const guide = computed(() => guideOf(page.value, he.value));
const title = computed(() => (guide.value && guide.value.title) || tk("nav." + current.value.name));
const body = computed(() => (guide.value ? guideHtml(guide.value, he.value) : `<div class="hlead">${t("help.noGuide")}</div>`));
const panel = ref(null);
const jump = (e) => {
  const b = e.target.closest && e.target.closest('[data-a="helpJump"]'); if (!b) return;
  const s = document.getElementById("hs" + b.dataset.i); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
};
watch([helpOpen, body], () => { document.documentElement.classList.toggle("help-on", helpOpen.value); nextTick(() => { if (panel.value) panel.value.scrollTop = 0; }); }, { immediate: true });
let stop = () => {};
onMounted(() => { stop = watchDots(() => ({ page: page.value, he: he.value, label: t("help.aboutSection") })); });
onBeforeUnmount(() => stop());
</script>

<template>
  <aside id="help" class="help" :aria-label="t('help.aboutPage')" :aria-hidden="helpOpen ? 'false' : 'true'">
    <div class="helph"><b id="helpT">{{ title }}</b><button type="button" class="ib" :aria-label="t('help.close')" @click="helpSet(false)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
    <div id="helpB" ref="panel" class="helpb" @click="jump" v-html="body" />
  </aside>
</template>
