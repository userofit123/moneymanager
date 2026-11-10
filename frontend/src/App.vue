<script setup>
// The app's frame: the menu (a rail at the side), the job bar, the offline banner,
// the help and alerts buttons, the + button, the page for the current address, and the windows every page can open.
// Before that, the sign-in screen when this browser is not signed in (core/boot.js).
// On a phone (mobile.js) the phone app (phone/PhoneApp.vue) shows instead of this frame; it is loaded only on a phone.
import { ref, computed, defineAsyncComponent, watch } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "./routes.js";
import { current, hrefOf, onLink, startRouter } from "./router.js";
import { app, boot } from "./core/boot.js";
import { alertList } from "./core/derived.js";
import { quickOpen } from "./core/shell.js";
import "./core/notices.js";
import "./core/upkeep.js";
import "./core/alertReport.js"; // the open alerts go to the server's alert history from every page
import HelpPanel from "./help/HelpPanel.vue";
import { helpOpen, helpMode, panelToggle } from "./help/help.js";
import ToastHost from "./components/ToastHost.vue";
import LevelParty from "./components/LevelParty.vue";
import { UP } from "./core/updates.js";
import AuthScreen from "./components/AuthScreen.vue";
import AppNav from "./components/shell/AppNav.vue";
import JobBar from "./components/shell/JobBar.vue";
import QuickSheet from "./components/shell/QuickSheet.vue";
import FormHost from "./components/FormHost.vue";
import AskPop from "./components/AskPop.vue";
import { suggestions, suggestOpen, bulbPop } from "./core/suggest.js";
import { isPhone } from "./mobile.js";

// Windows that open from a button or a link are loaded in files of their own, once the app has started (they are drawn
// as soon as the app is shown, closed, so they are already here when first opened, and they open with the same animation).
const PhoneApp = defineAsyncComponent(() => import("./phone/PhoneApp.vue"));
const AppearancePanel = defineAsyncComponent(() => import("./components/AppearancePanel.vue"));
const SyncSheet = defineAsyncComponent(() => import("./components/shell/SyncSheet.vue"));
const WelcomePops = defineAsyncComponent(() => import("./components/shell/WelcomePops.vue"));
const Suggestions = defineAsyncComponent(() => import("./components/shell/Suggestions.vue"));
const TxWindow = defineAsyncComponent(() => import("./components/tx/TxWindow.vue"));
const TxPops = defineAsyncComponent(() => import("./components/tx/TxPops.vue"));
const DocViewer = defineAsyncComponent(() => import("./components/tx/DocViewer.vue"));
const AssistWindow = defineAsyncComponent(() => import("./views/settings/AssistWindow.vue"));

const { t } = useI18n();
const appMenu = (e) => { const r = e.currentTarget.getBoundingClientRect(); window.desktopFrame?.menu?.(r.left, r.bottom); }; // the Server menu, in the desktop app (there is no menu bar to show)
const dframe = typeof window !== "undefined" && !!window.desktopFrame; // the desktop app: the page draws the title bar (see layout.css)
startRouter();
boot();
const views = new Map(pages.filter((p) => p.component).map((p) => [p.name, defineAsyncComponent(p.component)]));
const view = computed(() => views.get(current.value.name));
const alertsPage = pages.find((p) => p.name === "alerts");

// The tab shows the app's name only.
watch(current, () => { document.title = t("app.title"); }, { immediate: true });

// the light bulb pops when a new suggestion arrives
const bulb = ref(false);
watch(bulbPop, () => { bulb.value = false; requestAnimationFrame(() => (bulb.value = true)); });

const online = ref(typeof navigator === "undefined" ? true : navigator.onLine);
addEventListener("online", () => (online.value = true));
addEventListener("offline", () => (online.value = false));
</script>

<template>
  <div v-if="dframe" id="dragbar" aria-hidden="true"></div>
  <button v-if="dframe" id="dmenu" type="button" :class="{ upd: ['available', 'downloading', 'ready'].includes(UP.status) }" :aria-label="t('shell.appMenu')" :title="t('shell.appMenu')" @click="appMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg></button>
  <AuthScreen v-if="app.phase === 'auth'" />
  <PhoneApp v-else-if="isPhone && app.phase !== 'start'" />
  <template v-else-if="app.phase !== 'start'">
    <JobBar />
    <div id="offline" class="banner" :class="{ on: !online }">{{ t("auth.offline") }}</div>
    <AppNav />
    <AppearancePanel />
    <div class="fabx">
      <button id="suggBtn" type="button" class="sugb" :class="{ pop2: bulb }" :style="{ display: suggestions.length ? 'grid' : 'none' }" :aria-label="t('txw.suggA')" :data-tip="t('txw.suggTip')" @click="suggestOpen = true"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg><i>{{ suggestions.length }}</i></button>
      <button id="numsBtn" type="button" class="ib" :aria-label="t('num.title')" :data-tip="t('num.title')" :aria-expanded="helpOpen && helpMode === 'nums' ? 'true' : 'false'" aria-controls="help" @click="panelToggle('nums')"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8.5 7h7M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5v3M9 17.5h.01M12 17.5h.01" /></svg></button>
      <button id="helpBtn" type="button" class="ib" :aria-label="t('shell.aboutPage')" :aria-expanded="helpOpen && helpMode === 'guide' ? 'true' : 'false'" aria-controls="help" @click="panelToggle('guide')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg></button>
      <a class="ib" :href="hrefOf(alertsPage)" :aria-label="t('shell.alerts')" @click="onLink"><svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" /></svg><span class="badge" :style="{ display: alertList.length ? 'grid' : 'none' }">{{ alertList.length }}</span></a>
    </div>
    <button type="button" class="fab" :aria-label="t('shell.add')" @click="quickOpen = true">+</button>
    <main>
      <div v-if="app.phase === 'down'" class="card warn" style="margin-bottom:16px"><b>{{ t("auth.downT") }}</b><div class="sm">{{ t("auth.down") }}</div></div>
      <component :is="view" v-if="view && app.phase === 'ready'" />
    </main>
    <HelpPanel />
    <SyncSheet />
    <QuickSheet />
    <FormHost />
    <TxWindow />
    <TxPops />
    <DocViewer />
    <AssistWindow />
    <Suggestions />
    <WelcomePops v-if="app.phase === 'ready'" />
  </template>
  <AskPop />
  <ToastHost />
  <LevelParty />
</template>
