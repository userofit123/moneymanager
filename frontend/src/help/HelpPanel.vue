<script setup>
// The side panel (its buttons are in App.vue): the page guide, or the key numbers (helpMode "nums"). Styled by #help, .helph, .helpb and .knl.
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { current } from "../router.js";
import { helpOpen, helpMode, helpSet, guideOf, guideHtml, watchDots, guideReady, loadGuide } from "./help.js";
import { keyNums } from "../core/derived.js";
import { formatMoney } from "../format.js";
import { escLayer } from "../core/layers.js";
import { settingsTab } from "../views/settings/tab.js";
import { tx } from "../core/heText.js";
escLayer(helpOpen, () => helpSet(false));

const { t, locale } = useI18n();
const tk = (k) => t(k);
const he = computed(() => locale.value === "he");
// Settings has a guide for each section (helpKey: "set." + the open section).
const page = computed(() => (current.value.name === "settings" ? "set." + settingsTab.value : current.value.name));
// The guide text is loaded on its own (help.js): until the language's guide is here, the panel keeps what it showed.
const ready = computed(() => guideReady(he.value));
const guide = computed((prev) => (ready.value ? guideOf(page.value, he.value) : prev));
// The key numbers: the shared list's amounts as they are (already rounded), names with the month they speak of.
const nums = computed(() => helpMode.value === "nums");
const title = computed(() => (nums.value ? t("num.title") : (guide.value && guide.value.title) || tk("nav." + current.value.name)));
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthOf = (key) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const numName = (x) => t(x.name, x.mk ? { month: monthOf(x.mk) } : {});
// a row's name: Free to use below zero reads "Short by" (its amount stays below zero, so the rows still add up)
const rowName = (x) => (x.id === "free" && x.a < 0 ? t("num.shortBy") : x.from && x.short ? t(x.short, x.mk ? { month: monthOf(x.mk) } : {}) : numName(x));
const body = computed((prev) => (!ready.value ? prev || "" : guide.value ? guideHtml(guide.value, he.value, tx) : `<div class="hlead">${t("help.noGuide")}</div>`));
// The guide is loaded quietly a few seconds after start (so the panel opens at once), right away when the panel was left open,
// and in the other language once the language changes.
const load = () => loadGuide(he.value).catch(() => {});
if (helpOpen.value) load();
else onMounted(() => setTimeout(() => (window.requestIdleCallback || setTimeout)(load), 3000));
watch(he, () => { if (helpOpen.value || guideReady(false)) load(); });
const panel = ref(null);
const jump = (e) => {
  const b = e.target.closest && e.target.closest('[data-a="helpJump"]'); if (!b) return;
  const s = document.getElementById("hs" + b.dataset.i); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
};
watch([helpOpen, body, nums], () => { document.documentElement.classList.toggle("help-on", helpOpen.value); nextTick(() => { if (panel.value) panel.value.scrollTop = 0; }); }, { immediate: true });
let stop = () => {};
onMounted(() => { stop = watchDots(() => ({ page: page.value, he: he.value, label: t("help.aboutSection") })); });
onBeforeUnmount(() => stop());
</script>

<template>
  <aside id="help" class="help" :aria-label="nums ? t('num.title') : t('help.aboutPage')" :aria-hidden="helpOpen ? 'false' : 'true'">
    <div class="helph"><b id="helpT">{{ title }}</b><button type="button" class="ib" :aria-label="t('help.close')" @click="helpSet(false)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
    <div v-if="nums" ref="panel" class="helpb">
      <template v-if="keyNums">
        <section v-for="g in keyNums.groups" :key="g.id" class="hs">
          <h4>{{ t(g.name) }}</h4>
          <div class="knl" :class="{ guess: g.id.startsWith('likely') }">
            <div v-for="x in g.items" :key="x.id" class="knr" :class="{ from: x.from, res: x.op === '=' }" :data-tip="t(x.tip)"><span><i v-if="x.op && x.op !== '='" class="kno">{{ x.op }}</i>{{ rowName(x) }}</span><b class="num" :class="{ neg: x.a < 0 }">{{ formatMoney(x.a) }}</b></div>
          </div>
        </section>
      </template>
      <div v-else class="hlead">{{ t("num.none") }}</div>
    </div>
    <div v-else id="helpB" ref="panel" class="helpb" @click="jump" v-html="body" />
  </aside>
</template>
