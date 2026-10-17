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
  <div class="frame">
    <!-- Same menu as the current app: a narrow rail with the icon above the name (computer), a bar at the bottom (phone). -->
    <nav class="side" :aria-label="t('shell.menu')">
      <div class="logo" aria-hidden="true">₪</div>
      <a v-for="p in navPages" :key="p.name" class="nb" :class="{ on: current.name === p.name, sec: !p.main }" :href="hrefOf(p)" :aria-current="current.name === p.name ? 'page' : undefined" @click="onLink">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="p.icon" /></span>{{ tk("nav." + p.name) }}
      </a>
      <button type="button" class="nb mob-only" :class="{ on: moreOn }" @click="more = true">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></span>{{ t("shell.more") }}
      </button>
      <div class="navb">
        <button type="button" class="nb" @click="setLang(locale === 'he' ? 'en' : 'he')"><span class="ic"><b class="lang">{{ locale === "he" ? "EN" : "עב" }}</b></span>{{ t("app.otherLanguage") }}</button>
        <a class="nb" href="/"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg></span>{{ t("app.backToApp") }}</a>
      </div>
    </nav>

    <main class="content">
      <component :is="view" v-if="view" />
      <NotMovedYet v-else :key="current.name" :page="current" />
    </main>

    <BaseDialog v-model:open="more" :title="t('shell.more')">
      <div class="morelist">
        <a v-for="p in navPages" :key="p.name" class="mi" :class="{ on: current.name === p.name }" :href="hrefOf(p)" @click="onLink">
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="p.icon" /><span>{{ tk("nav." + p.name) }}</span>
        </a>
        <button type="button" class="mi" @click="setLang(locale === 'he' ? 'en' : 'he')"><b class="lang">{{ locale === "he" ? "EN" : "עב" }}</b><span>{{ t("app.otherLanguage") }}</span></button>
        <a class="mi" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg><span>{{ t("app.backToApp") }}</span></a>
      </div>
    </BaseDialog>
  </div>
</template>

<style>
/* Copied from the current app (web/css/app.css: nav, .logo, .nb, .navb, main, and the html.mob rules for phones). */
.frame { display: flex; min-height: 100vh; }
.side { width: 88px; padding: 18px 0 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; position: sticky; top: 0; height: 100vh; border-inline-end: 1px solid var(--ol); overflow-y: auto; scrollbar-width: none; flex: none; }
.side::-webkit-scrollbar { display: none; }
.logo { width: 44px; height: 44px; border-radius: 15px; background: linear-gradient(135deg, var(--acc), var(--acc2)); color: var(--on); display: grid; place-items: center; font-weight: 700; font-size: 20px; margin-bottom: 8px; box-shadow: 0 6px 20px -6px var(--acc); flex: none; }
.nb { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11px; color: var(--tx2); cursor: pointer; border: 0; background: none; font-family: inherit; padding: 2px 0; width: 100%; position: relative; flex: none; text-decoration: none; text-align: center; line-height: 1.3; }
.nb svg { width: 22px; height: 22px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.nb .ic { width: 54px; height: 30px; border-radius: 15px; display: grid; place-items: center; transition: .25s; }
.nb:hover .ic { background: var(--s2); }
.nb.on { color: var(--tx); font-weight: 600; }
.nb.on .ic { background: var(--accc); color: var(--onc); }
.nb:focus-visible { outline: 2px solid var(--acc); outline-offset: -2px; border-radius: 12px; }
.lang { font-size: 11px; font-weight: 700; }
html.he .flip { transform: scaleX(-1); transform-origin: center; }
.navb { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; padding-top: 10px; flex: none; }
.mob-only { display: none; }
.content { flex: 1 1 0; width: 100%; max-width: 1320px; margin: 0 auto; padding: 24px 32px 90px; min-width: 0; }
.morelist { display: flex; flex-direction: column; gap: 2px; }
.mi { display: flex; align-items: center; gap: var(--sp3); min-height: 44px; padding: 0 var(--sp3); border: 0; border-radius: var(--pill); background: none; color: var(--tx); text-decoration: none; font-size: var(--fs); cursor: pointer; text-align: start; width: 100%; }
.mi svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.mi .lang { width: 22px; text-align: center; flex: none; }
.mi:hover { background: var(--s2); }
.mi.on { background: var(--accc); color: var(--onc); font-weight: 600; }
/* Phone: same switch point as the current app (860px wide, or a touch screen up to 1100px). */
@media (max-width: 860px), (pointer: coarse) and (max-width: 1100px) {
  .side { position: fixed; top: auto; bottom: 0; inset-inline: 0; width: 100%; height: auto; flex-direction: row; justify-content: space-around; align-items: stretch; padding: 8px 8px calc(8px + var(--sb)); border-inline-end: 0; box-shadow: 0 -1px 0 var(--ol), 0 -10px 30px -18px #0006; background: color-mix(in srgb, var(--bg) 90%, var(--s1)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 50; overflow: visible; }
  .logo, .navb, .nb.sec { display: none; }
  .mob-only { display: flex; }
  .nb { min-height: 56px; gap: 4px; font-size: 11.5px; font-weight: 500; letter-spacing: .1px; justify-content: center; flex: 1 1 0; width: auto; min-width: 0; }
  .nb .ic { width: 60px; height: 32px; border-radius: 16px; transition: background .25s, transform .15s; }
  .nb:active .ic { transform: scale(.94); }
  .nb.on { font-weight: 700; color: var(--tx); }
  .content { padding: 0 16px calc(148px + var(--sb)); margin: 0 auto; }
}
@media (max-width: 360px) {
  .content { padding-inline: 12px; }
  .nb .ic { width: 52px; }
  .nb { font-size: 11px; }
}
</style>
