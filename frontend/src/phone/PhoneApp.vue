<script setup>
// The phone app's frame: the open tab's screen (each tab keeps its own stack of screens and their scroll),
// the tab bar, the offline pill, the sync bar, and the windows every screen can open.
// The address decides what shows (navigation.js), so Back, Forward, links and alerts work as on the computer.
import { reactive, ref, computed, watch, provide, nextTick, onMounted, onBeforeUnmount, defineAsyncComponent } from "vue";
import { current, query, go } from "../router.js";
import { createNav, showUrl, top, pushUrl, rootUrl, NAV_KEY } from "./navigation.js";
import { txOpenId } from "../core/txwin.js";
import { settingsTab, settingsAsked } from "../views/settings/tab.js";
import { job } from "../core/jobs.js";
import { app } from "../core/boot.js";
import { edgeBack } from "./gestures.js";
import { sign } from "./dir.js";
import ScreenHost from "./ScreenHost.vue";
import TabBar from "./components/TabBar.vue";
import OfflinePill from "./components/OfflinePill.vue";
import FormHost from "../components/FormHost.vue";
import "./styles/index.css";

// Windows shared with the computer, until the phone has its own (they open as the computer's windows for now).
const AppearancePanel = defineAsyncComponent(() => import("../components/AppearancePanel.vue"));
const SyncSheet = defineAsyncComponent(() => import("../components/shell/SyncSheet.vue"));
const TxPops = defineAsyncComponent(() => import("../components/tx/TxPops.vue"));
const DocViewer = defineAsyncComponent(() => import("../components/tx/DocViewer.vue"));
const AssistWindow = defineAsyncComponent(() => import("../views/settings/AssistWindow.vue"));
const AddSheet = defineAsyncComponent(() => import("./sheets/AddSheet.vue"));
const ExplainSheet = defineAsyncComponent(() => import("./sheets/ExplainSheet.vue"));
const HelpSheet = defineAsyncComponent(() => import("./sheets/HelpSheet.vue"));
const KeyNumbersSheet = defineAsyncComponent(() => import("./sheets/KeyNumbersSheet.vue"));
const SuggestionsSheet = defineAsyncComponent(() => import("./sheets/SuggestionsSheet.vue"));
const WelcomeSheet = defineAsyncComponent(() => import("./sheets/WelcomeSheet.vue"));

const here = () => location.pathname + location.search;
const url = ref(here());
const nav = reactive(createNav(url.value));
const stack = computed(() => nav.stacks[nav.tab]);
const screen = computed(() => top(nav));

// The address changes through the router (links, alerts, goActivity) or Back and Forward; /more is the phone's own.
const follow = () => { url.value = here(); };
watch([current, query], follow);
addEventListener("popstate", follow);
onBeforeUnmount(() => removeEventListener("popstate", follow));

// html.ph-glow: the background glow shows behind the top of Home and More only, so lists stay calm
const glow = (name) => document.documentElement.classList.toggle("ph-glow", name === "home" || name === "more");
glow(screen.value.name);

// A screen remembers where it was scrolled (kept as it scrolls: by the time the address changes, the router has already
// gone to the top); the stacks follow the address.
const keepScroll = () => { if (!moving) screen.value.y = scrollY; };
addEventListener("scroll", keepScroll, { passive: true });
onBeforeUnmount(() => removeEventListener("scroll", keepScroll));
watch(url, async (u) => {
  const how = showUrl(nav, u);
  if (how === "none") return;
  glow(screen.value.name);
  await nextTick();
  scrollTo(0, screen.value.y || 0);
  if (!moving) slideIn(how);
});

// Motion: a pushed screen slides in from the end side, Back slides it out, tabs cross-fade (View Transitions where the
// browser has them; otherwise only the new screen moves in). Under reduced motion, a short fade.
const still = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
let moving = false;
function moved(how, change) {
  const H = document.documentElement;
  if (!document.startViewTransition || still() || how === "none") return change();
  H.dataset.phnav = how; moving = true;
  const vt = document.startViewTransition(change);
  vt.finished.finally(() => { moving = false; delete H.dataset.phnav; });
  return vt.updateCallbackDone;
}
const stage = ref(null);
function slideIn(how) {
  const el = stage.value; if (!el || !el.animate) return;
  if (still()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); return; }
  const he = document.documentElement.classList.contains("he") ? -1 : 1;
  const from = how === "push" ? `translateX(${30 * he}%)` : how === "pop" ? `translateX(${-30 * he}%)` : "none";
  el.animate([{ transform: from, opacity: how === "tab" ? 0 : 0.6 }, { transform: "none", opacity: 1 }], { duration: how === "tab" ? 160 : 280, easing: "cubic-bezier(.16,1,.3,1)" });
}
// waits until the new screen is in the page (its file may still be loading) before the new picture is taken; at most 0.6s.
// (no requestAnimationFrame here: the browser holds frames while it waits for this)
const drawn = () => new Promise((res) => {
  let n = 0;
  const check = () => { const el = stage.value?.firstElementChild; return ++n > 40 || (el && el.dataset.key === screen.value.url) ? res() : setTimeout(check, 15); };
  nextTick(check);
});

function open(to, how) {
  return moved(how, async () => { go(to); follow(); await drawn(); });
}
const api = {
  // push a screen on the open tab: push("account", 4), push("accounts")
  push(name, id) {
    open(pushUrl(screen.value.url, name, id), "push");
  },
  back() {
    if (stack.value.length < 2) return;
    moved("pop", () => new Promise((res) => { addEventListener("popstate", () => { follow(); drawn().then(res); }, { once: true }); history.back(); }));
  },
  // a tab: its stack as it was; the open tab again: to its top, then to its first screen
  tab(name) {
    if (name !== nav.tab) return open(top(nav, name).url, "tab");
    if (scrollY > 4) return scrollTo({ top: 0, behavior: still() ? "auto" : "smooth" });
    if (stack.value.length > 1) open(rootUrl(name), "pop");
  },
  stack, screen, tabName: computed(() => nav.tab),
};
provide(NAV_KEY, api);

// A transaction opened anywhere (openTx) is pushed on the open tab; a Settings section opened from anywhere is pushed in More.
watch(txOpenId, (id) => { if (id == null) return; txOpenId.value = null; api.push("transaction", id); });
watch(settingsAsked, () => { const id = settingsTab.value; if (id) open(pushUrl("/settings", "settingsSection", id), "push"); });

// the thin line under the top bar while a sync runs
const syncing = computed(() => !!job.value);
// the installed iPhone app has no Back gesture of its own: a drag from the start edge goes back (elsewhere the system's is used)
const standalone = typeof navigator !== "undefined" && (navigator.standalone === true || matchMedia("(display-mode: standalone)").matches) && /iPhone|iPad|iPod/.test(navigator.userAgent);
let stopEdge = null;
onMounted(() => {
  document.documentElement.classList.add("ph-ready");
  if (standalone && stage.value) stopEdge = edgeBack(stage.value, { can: () => stack.value.length > 1, onBack: () => api.back(), sign });
});
onBeforeUnmount(() => { stopEdge?.(); document.documentElement.classList.remove("ph-ready", "ph-glow"); });
</script>

<template>
  <div class="ph-app">
    <div class="ph-syncbar" :class="{ on: syncing }" aria-hidden="true"><i /></div>
    <OfflinePill />
    <div ref="stage" class="ph-stage">
      <KeepAlive :max="16">
        <ScreenHost :key="screen.url" :entry="screen" :under="stack.length > 1 ? stack[stack.length - 2] : null" />
      </KeepAlive>
    </div>
    <TabBar />
    <AppearancePanel />
    <AddSheet />
    <ExplainSheet />
    <SyncSheet />
    <HelpSheet />
    <KeyNumbersSheet />
    <FormHost />
    <TxPops />
    <DocViewer />
    <AssistWindow />
    <SuggestionsSheet />
    <WelcomeSheet v-if="app.phase === 'ready'" />
  </div>
</template>
