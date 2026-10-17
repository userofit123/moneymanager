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
const mainPages = navPages.filter((p) => p.main);
const views = new Map(pages.filter((p) => p.component).map((p) => [p.name, defineAsyncComponent(p.component)]));
const view = computed(() => views.get(current.value.name));
const more = ref(false);
const moreOn = computed(() => !current.value.main);
watch(current, (p) => { more.value = false; document.title = tk("nav." + p.name) + " · " + t("app.title"); }, { immediate: true });
watch(locale, () => { document.title = tk("nav." + current.value.name) + " · " + t("app.title"); });
</script>

<template>
  <div class="frame">
    <nav class="side" :aria-label="t('shell.menu')">
      <div class="logo" aria-hidden="true">₪</div>
      <a v-for="p in navPages" :key="p.name" class="nb" :class="{ on: current.name === p.name }" :href="hrefOf(p)" :aria-current="current.name === p.name ? 'page' : undefined" @click="onLink">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="p.icon" /></svg><span>{{ tk("nav." + p.name) }}</span>
      </a>
      <div class="foot">
        <button type="button" class="nb" @click="setLang(locale === 'he' ? 'en' : 'he')"><span class="lang">{{ locale === "he" ? "EN" : "עב" }}</span><span>{{ t("app.otherLanguage") }}</span></button>
        <a class="nb" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg><span>{{ t("app.backToApp") }}</span></a>
      </div>
    </nav>

    <main class="content">
      <component :is="view" v-if="view" />
      <NotMovedYet v-else :key="current.name" :page="current" />
    </main>

    <nav class="bar" :aria-label="t('shell.menu')">
      <a v-for="p in mainPages" :key="p.name" class="bb" :class="{ on: current.name === p.name }" :href="hrefOf(p)" :aria-current="current.name === p.name ? 'page' : undefined" @click="onLink">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="p.icon" /></svg></span>{{ tk("nav." + p.name) }}
      </a>
      <button type="button" class="bb" :class="{ on: moreOn }" @click="more = true">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg></span>{{ t("shell.more") }}
      </button>
    </nav>

    <BaseDialog v-model:open="more" :title="t('shell.more')">
      <div class="morelist">
        <a v-for="p in navPages" :key="p.name" class="nb" :class="{ on: current.name === p.name }" :href="hrefOf(p)" @click="onLink">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="p.icon" /></svg><span>{{ tk("nav." + p.name) }}</span>
        </a>
        <button type="button" class="nb" @click="setLang(locale === 'he' ? 'en' : 'he')"><span class="lang">{{ locale === "he" ? "EN" : "עב" }}</span><span>{{ t("app.otherLanguage") }}</span></button>
        <a class="nb" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="flip" d="M15 6l-6 6 6 6" /></svg><span>{{ t("app.backToApp") }}</span></a>
      </div>
    </BaseDialog>
  </div>
</template>

<style>
.frame { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: 100vh; }
.side { position: sticky; top: 0; height: 100vh; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding: var(--sp5) var(--sp3); border-inline-end: 1px solid var(--ol); }
.logo { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; background: var(--acc); color: var(--on); font-weight: 700; font-size: 20px; margin: 0 var(--sp2) var(--sp4); }
.nb { display: flex; align-items: center; gap: var(--sp3); min-height: 44px; padding: 0 var(--sp3); border: 0; border-radius: var(--pill); background: none; color: var(--tx2); text-decoration: none; font-size: var(--fs); cursor: pointer; text-align: start; width: 100%; }
.nb svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.nb:hover { background: var(--s2); color: var(--tx); }
.nb.on { background: var(--accc); color: var(--onc); font-weight: 600; }
.nb:focus-visible, .bb:focus-visible { outline: 2px solid var(--acc); outline-offset: -2px; }
.lang { width: 20px; flex: none; font-size: 11px; font-weight: 700; text-align: center; }
html.he .flip { transform: scaleX(-1); transform-origin: center; }
.foot { margin-top: auto; padding-top: var(--sp4); display: flex; flex-direction: column; gap: 2px; }
.content { min-width: 0; max-width: 1100px; width: 100%; margin: 0 auto; padding: var(--sp6) var(--sp5) 90px; }
.bar { display: none; }
.morelist { display: flex; flex-direction: column; gap: 2px; }
.morelist .nb { color: var(--tx); }
@media (max-width: 760px) {
  .frame { grid-template-columns: minmax(0, 1fr); }
  .side { display: none; }
  .content { padding: calc(var(--sp4) + var(--st)) var(--sp4) calc(96px + var(--sb)); }
  .bar { display: flex; position: fixed; inset-inline: 0; bottom: 0; z-index: 20; padding: 6px 4px calc(6px + var(--sb)); background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(14px); border-top: 1px solid var(--ol); }
  .bb { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; border: 0; background: none; color: var(--tx2); font-size: 11.5px; text-decoration: none; cursor: pointer; padding: 2px 0; }
  .bb .ic { display: grid; place-items: center; width: 56px; height: 30px; border-radius: var(--pill); transition: background .2s; }
  .bb svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .bb.on { color: var(--tx); font-weight: 600; }
  .bb.on .ic { background: var(--accc); color: var(--onc); }
}
</style>
