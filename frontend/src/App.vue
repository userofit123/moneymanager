<script setup>
// The app's frame: the menu (a rail on a computer, a bar at the bottom of a phone), the job bar, the offline banner,
// the help and alerts buttons, the + button, the page for the current address, and the windows every page can open.
// Before that, the sign-in screen when this browser is not signed in (core/boot.js).
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
import { helpOpen, helpSet } from "./help/help.js";
import ToastHost from "./components/ToastHost.vue";
import AuthScreen from "./components/AuthScreen.vue";
import AppNav from "./components/shell/AppNav.vue";
import JobBar from "./components/shell/JobBar.vue";
import MoreSheet from "./components/shell/MoreSheet.vue";
import QuickSheet from "./components/shell/QuickSheet.vue";
import FormHost from "./components/FormHost.vue";
import AskPop from "./components/AskPop.vue";
import { suggestions, suggestOpen, bulbPop } from "./core/suggest.js";

// Windows that open from a button or a link are loaded in files of their own, once the app has started (they are drawn
// as soon as the app is shown, closed, so they are already here when first opened, and they open with the same animation).
const AppearancePanel = defineAsyncComponent(() => import("./components/AppearancePanel.vue"));
const SyncSheet = defineAsyncComponent(() => import("./components/shell/SyncSheet.vue"));
const WelcomePops = defineAsyncComponent(() => import("./components/shell/WelcomePops.vue"));
const Suggestions = defineAsyncComponent(() => import("./components/shell/Suggestions.vue"));
const TxWindow = defineAsyncComponent(() => import("./components/tx/TxWindow.vue"));
const TxPops = defineAsyncComponent(() => import("./components/tx/TxPops.vue"));
const DocViewer = defineAsyncComponent(() => import("./components/tx/DocViewer.vue"));
const AssistWindow = defineAsyncComponent(() => import("./views/settings/AssistWindow.vue"));

const { t } = useI18n();
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
  <AuthScreen v-if="app.phase === 'auth'" />
  <template v-else-if="app.phase !== 'start'">
    <JobBar />
    <div id="offline" class="banner" :class="{ on: !online }">{{ t("auth.offline") }}</div>
    <AppNav />
    <AppearancePanel />
    <div class="fabx">
      <button id="suggBtn" type="button" class="sugb" :class="{ pop2: bulb }" :style="{ display: suggestions.length ? 'grid' : 'none' }" :aria-label="t('txw.suggA')" :data-tip="t('txw.suggTip')" @click="suggestOpen = true"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg><i>{{ suggestions.length }}</i></button>
      <button id="helpBtn" type="button" class="ib" :aria-label="t('shell.aboutPage')" :aria-expanded="helpOpen ? 'true' : 'false'" aria-controls="help" @click="helpSet(!helpOpen)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg></button>
      <a class="ib" :href="hrefOf(alertsPage)" :aria-label="t('shell.alerts')" @click="onLink"><svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" /></svg><span class="badge" :style="{ display: alertList.length ? 'grid' : 'none' }">{{ alertList.length }}</span></a>
    </div>
    <button type="button" class="fab" :aria-label="t('shell.add')" @click="quickOpen = true">+</button>
    <main>
      <div v-if="app.phase === 'down'" class="card warn" style="margin-bottom:16px"><b>{{ t("auth.downT") }}</b><div class="sm">{{ t("auth.down") }}</div></div>
      <component :is="view" v-if="view && app.phase === 'ready'" />
    </main>
    <HelpPanel />
    <MoreSheet />
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
</template>
