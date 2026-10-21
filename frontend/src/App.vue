<script setup>
// The app's frame: the side menu (computer), the bottom bar (phone), and the page for the current address.
// Same pages, order and icons as the current app. Pages not moved yet show a link to the current app.
import { ref, computed, defineAsyncComponent, watch } from "vue";
import { useI18n } from "vue-i18n";
import { setLang } from "./i18n.js";
import { pages } from "./routes.js";
import { current, hrefOf, onLink, startRouter } from "./router.js";
import NotMovedYet from "./views/NotMovedYet.vue";
import BaseDialog from "./components/BaseDialog.vue";
import HelpPanel from "./help/HelpPanel.vue";

const { t, locale } = useI18n();
const tk = (k) => t(k);
startRouter();
const navPages = pages.filter((p) => p.nav);
const views = new Map(pages.filter((p) => p.component).map((p) => [p.name, defineAsyncComponent(p.component)]));
const view = computed(() => views.get(current.value.name));
const more = ref(false);
const moreOn = computed(() => !current.value.main);
watch(current, (p) => { more.value = false; document.title = tk("nav." + p.name) + " · " + t("app.title"); }, { immediate: true });
watch(locale, () => { document.title = tk("nav." + current.value.name) + " · " + t("app.title"); });
</script>

<template>
      <!-- Same menu as the current app: a narrow rail with the icon above the name (computer), a bar at the bottom (phone). -->
    <nav :aria-label="t('shell.menu')">
      <div class="logo" aria-hidden="true">₪</div>
      <a v-for="p in navPages" :key="p.name" class="nb" :class="{ on: current.name === p.name, sec: !p.main }" :href="hrefOf(p)" :aria-current="current.name === p.name ? 'page' : undefined" @click="onLink">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="p.icon" /></span>{{ tk("nav." + p.name) }}
      </a>
      <button type="button" class="nb only-m" :class="{ on: moreOn }" @click="more = true">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></span>{{ t("shell.more") }}
      </button>
      <div class="navb">
        <button type="button" class="nb" @click="setLang(locale === 'he' ? 'en' : 'he')"><span class="ic"><b class="lang">{{ locale === "he" ? "EN" : "עב" }}</b></span>{{ t("app.otherLanguage") }}</button>
        <a class="nb" href="/"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg></span>{{ t("app.backToApp") }}</a>
      </div>
    </nav>

    <main>
      <component :is="view" v-if="view" />
      <NotMovedYet v-else :key="current.name" :page="current" />
    </main>
    <HelpPanel />

    <BaseDialog v-model:open="more" :title="t('shell.more')">
      <div class="morelist">
        <a v-for="p in navPages" :key="p.name" class="mi" :class="{ on: current.name === p.name }" :href="hrefOf(p)" @click="onLink">
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="p.icon" /><span>{{ tk("nav." + p.name) }}</span>
        </a>
        <button type="button" class="mi" @click="setLang(locale === 'he' ? 'en' : 'he')"><b class="lang">{{ locale === "he" ? "EN" : "עב" }}</b><span>{{ t("app.otherLanguage") }}</span></button>
        <a class="mi" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg><span>{{ t("app.backToApp") }}</span></a>
      </div>
    </BaseDialog>
</template>

<style>
/* Menu, logo, .nb, .navb, main and the phone rules all come from legacy.css (a copy of web/css/app.css). Only what the old app does not have is here. */
a.nb { text-decoration: none; text-align: center; line-height: 1.3; }
.lang { font-size: 11px; font-weight: 700; }
html.he .flip { transform: scaleX(-1); transform-origin: center; }
.morelist { display: flex; flex-direction: column; gap: 2px; }
.mi { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 99px; background: none; color: var(--tx); text-decoration: none; font-size: 14px; cursor: pointer; text-align: start; width: 100%; font-family: inherit; }
.mi svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.mi .lang { width: 22px; text-align: center; flex: none; }
.mi:hover { background: var(--s2); }
.mi.on { background: var(--accc); color: var(--onc); font-weight: 600; }
</style>
