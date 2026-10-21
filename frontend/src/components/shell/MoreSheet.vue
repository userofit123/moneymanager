<script setup>
// "More" on a phone: the pages that are not in the bottom bar, then Appearance, Sync status and Install app.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { go, hrefOf } from "../../router.js";
import { moreOpen, appearanceOpen, syncOpen } from "../../core/shell.js";
import { installPrompt, install } from "../../core/pwa.js";
import BaseSheet from "../BaseSheet.vue";

const { t } = useI18n();
const ORDER = ["recap", "accounts", "budgets", "reports", "forecast", "categories", "settings"];
const rows = computed(() => ORDER.map((n) => pages.find((p) => p.name === n)).map((p) => ({ p, label: p.name === "reports" ? t("shell.moreRep") : t("nav." + p.name) })));
const ICON = { theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>', sync: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>', install: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>' };
const open = (p) => { moreOpen.value = false; go(hrefOf(p)); };
const theme = () => { moreOpen.value = false; appearanceOpen.value = true; };
const sync = () => { moreOpen.value = false; syncOpen.value = true; };
</script>

<template>
  <BaseSheet v-model:open="moreOpen" :label="t('shell.more')">
    <h3>{{ t("shell.more") }}</h3>
    <div v-for="r in rows" :key="r.p.name" class="row mrow" role="link" tabindex="0" @click="open(r.p)" @keydown.enter="open(r.p)"><span class="mi"><svg viewBox="0 0 24 24" v-html="r.p.icon" /></span><div class="grow">{{ r.label }}</div><span class="sm">›</span></div>
    <div class="row mrow" role="button" tabindex="0" data-theme-open @click="theme" @keydown.enter="theme"><span class="mi"><svg viewBox="0 0 24 24" v-html="ICON.theme" /></span><div class="grow">{{ t("shell.appearance") }}</div><span class="sm">›</span></div>
    <div class="row mrow" role="button" tabindex="0" @click="sync" @keydown.enter="sync"><span class="mi"><svg viewBox="0 0 24 24" v-html="ICON.sync" /></span><div class="grow">{{ t("shell.syncStatus") }}</div><span class="sm">›</span></div>
    <div v-if="installPrompt" class="row mrow" role="button" tabindex="0" @click="install" @keydown.enter="install"><span class="mi"><svg viewBox="0 0 24 24" v-html="ICON.install" /></span><div class="grow">{{ t("shell.install") }}</div><span class="sm">›</span></div>
  </BaseSheet>
</template>
