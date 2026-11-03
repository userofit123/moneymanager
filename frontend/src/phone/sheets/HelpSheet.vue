<script setup>
// Help in the phone app: the list of screens (and Settings sections) that have a guide; a tap shows that guide, the same
// text and little pictures as the computer's "About this page" panel (help/help.js). Opened by helpOn() in ../help.js,
// straight on one screen's guide or on the list.
import { computed, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { guideOf, guideHtml, guideReady, loadGuide } from "../../help/help.js";
import { NAV } from "../../views/settings/nav.js";
import { tx } from "../../core/heText.js";
import { helpShown, helpPage, helpOn } from "../help.js";
import PhoneSheet from "../components/PhoneSheet.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";

const { t, locale } = useI18n();
const he = computed(() => locale.value === "he");
const open = computed({ get: () => helpShown.value === "guide", set: (v) => { if (!v) helpShown.value = ""; } });
const ready = computed(() => guideReady(he.value));
watch([open, he], () => { if (open.value) loadGuide(he.value).catch(() => {}); }, { immediate: true });

// the topics: every page with a guide, then every Settings section with one (the desktop app's own section is left out)
const inDesktop = typeof window !== "undefined" && !!window.desktopServers;
const screens = computed(() => (ready.value ? pages.filter((p) => p.nav && p.name !== "settings" && guideOf(p.name, he.value)) : []));
const sections = computed(() => (ready.value ? NAV.flatMap((g) => g.tabs).filter((x) => (!x.desktop || inDesktop) && guideOf("set." + x.id, he.value)) : []));
const pageName = (n) => (n === "reports" ? t("shell.moreRep") : t("nav." + n));
const iconOf = (key) => (key.startsWith("set.") ? NAV.flatMap((g) => g.tabs).find((x) => "set." + x.id === key)?.icon : pages.find((p) => p.name === key)?.icon) || "";

const guide = computed(() => (ready.value && helpPage.value ? guideOf(helpPage.value, he.value) : null));
const title = computed(() => (guide.value ? guide.value.title || pageName(helpPage.value) : t("phone.sheets.help")));
const body = computed(() => (guide.value ? guideHtml(guide.value, he.value, tx) : ""));

// the guide's own "jump to" buttons scroll inside the sheet; a new guide starts at its top
const box = ref(null);
const jump = (e) => {
  const b = e.target.closest && e.target.closest('[data-a="helpJump"]'); if (!b || !box.value) return;
  box.value.querySelector("#hs" + b.dataset.i)?.scrollIntoView({ behavior: "smooth", block: "start" });
};
watch(helpPage, () => nextTick(() => box.value?.closest(".ph-sheet-b")?.scrollTo(0, 0)));
</script>

<template>
  <PhoneSheet v-model:open="open" size="large" cls="ph-help">
    <template #head>
      <button v-if="helpPage" type="button" class="ph-ib ph-help-back" :aria-label="t('phone.sheets.helpAll')" @click="helpOn('guide')"><PIcon name="back" dir /></button>
      <h2>{{ title }}</h2>
    </template>
    <SkeletonRows v-if="!ready" :rows="5" />
    <div v-else-if="guide" ref="box" class="ph-guide" @click="jump" v-html="body" />
    <template v-else>
      <ListGroup :title="t('phone.sheets.helpScreens')">
        <ListRow v-for="p in screens" :key="p.name" :title="pageName(p.name)" :sub="t('phone.shell.about.' + p.name)" :icon="p.icon" link @tap="helpOn('guide', p.name)" />
      </ListGroup>
      <ListGroup :title="t('nav.settings')">
        <ListRow v-for="x in sections" :key="x.id" :title="t('settings.nav.tabs.' + x.id)" :sub="t('phone.settings.rows.' + x.id)" :icon="iconOf('set.' + x.id)" tone="var(--c6)" link @tap="helpOn('guide', 'set.' + x.id)" />
      </ListGroup>
    </template>
  </PhoneSheet>
</template>
