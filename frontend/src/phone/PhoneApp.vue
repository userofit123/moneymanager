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
import { edgeBack, tabSwipe } from "./gestures.js";
import { sign, isRtl } from "./dir.js";
import { TABS } from "./screens.js";
import { swipeTarget, tabStep, tabTap } from "../lib/tabSwipe.js";
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

// A screen remembers where it was scrolled (kept as it scrolls: by the time the address changes, the router has already
// gone to the top); the stacks follow the address.
const keepScroll = () => { if (!moving) screen.value.y = scrollY; };
addEventListener("scroll", keepScroll, { passive: true });
onBeforeUnmount(() => removeEventListener("scroll", keepScroll));
watch(url, async (u) => {
  const was = nav.tab;
  const how = showUrl(nav, u);
  if (how === "none") return;
  await nextTick();
  scrollTo(0, screen.value.y || 0);
  if (!moving) slideIn(how, how === "tab" ? tabStep(TABS, was, nav.tab) : 0);
});

// Motion: a pushed screen slides in from the end side, Back slides it out (View Transitions where the browser has them;
// otherwise only the new screen moves in). Another tab: the open screen slides a little towards the side the tab bar
// moves away from and fades, then the new one slides in from the other side and settles (step: 1 a tab further along,
// -1 an earlier one; mirrored in Hebrew). Under reduced motion, nothing slides: a short fade.
const still = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
let moving = false;
// the motion times and curves from tokens.css (read once; the values there today as fallback)
let T = null;
function times() {
  if (T) return T;
  const s = getComputedStyle(document.documentElement);
  const ms = (k, d) => parseFloat(s.getPropertyValue(k)) || d, ease = (k, d) => s.getPropertyValue(k).trim() || d;
  return (T = {
    out: ms("--p-t-tab-out", 120), in: ms("--p-t-tab-in", 240), fade: ms("--p-t-tab-fade", 180),
    easeIn: ease("--p-ease-in", "cubic-bezier(.4,0,1,1)"), ease: ease("--p-ease", "cubic-bezier(.2,.8,.2,1)"),
  });
}
function moved(how, change) {
  const H = document.documentElement;
  if (!document.startViewTransition || still() || how === "none") return change();
  H.dataset.phnav = how; moving = true;
  const vt = document.startViewTransition(change);
  vt.finished.finally(() => { moving = false; delete H.dataset.phnav; });
  return vt.updateCallbackDone;
}
// Another tab, like the calculator app: the screen itself slides 30px away and fades, then the new one comes in. Both
// move inside the page, so the page's own background shows between them. (Done as a View Transition, the moment between
// the two pictures showed whatever the phone draws under the page, a black screen on some phones.)
// Quick taps: the tab being opened (pending) counts as the open one, and only the newest swap opens its tab, ends the
// motion and slides its screen in; an older one still sliding out is dropped.
let pending = null, swaps = 0, outs = [];
async function swapTab(to, step) {
  const change = async () => { if (to !== nav.tab) { go(top(nav, to).url); follow(); await drawn(); } };
  const el = stage.value;
  if (!el?.animate || still() || !step) { if (pending) settle(); return change(); }
  const id = ++swaps;
  pending = to; moving = true;
  const he = document.documentElement.classList.contains("he") ? -1 : 1;
  const out = el.animate([{ opacity: 0, transform: `translateX(${-30 * step * he}px)` }], { duration: times().out, easing: times().easeIn, fill: "forwards" });
  outs.push(out);
  await out.finished.catch(() => {});
  if (id !== swaps) return;
  try { await change(); } finally { if (id === swaps) { settle(); slideIn("tab", step); } }
}
// ends the tab motion: drops any older swap and puts the screen back where it belongs
function settle() { ++swaps; pending = null; moving = false; outs.forEach((a) => a.cancel()); outs = []; }
const stage = ref(null);
function slideIn(how, step = 0) {
  const el = stage.value; if (!el || !el.animate) return;
  if (still()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: times().out }); return; }
  const he = document.documentElement.classList.contains("he") ? -1 : 1;
  if (step) {
    // 40px in from the side, settling (also the second half of swapTab)
    el.animate([{ transform: `translateX(${40 * step * he}px)` }, { transform: "none" }], { duration: times().in, easing: times().ease });
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: times().fade, easing: times().ease });
    return;
  }
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
    const tap = tabTap({ tabs: TABS, at: nav.tab, pending, name });
    if (tap.open) return swapTab(name, tap.step);
    if (tap.busy) return;
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
let stopEdge = null, stopSwipe = null;
// on a tab's first screen, a sideways swipe goes to the next or previous tab in the tab bar's order (mirrored in Hebrew)
const swiped = (m) => { const to = swipeTarget({ ...m, tabs: TABS, at: pending ?? nav.tab, rtl: isRtl() }); if (to) api.tab(to); };
onMounted(() => {
  document.documentElement.classList.add("ph-ready");
  if (standalone && stage.value) stopEdge = edgeBack(stage.value, { can: () => stack.value.length > 1, onBack: () => api.back(), sign });
  if (stage.value) stopSwipe = tabSwipe(stage.value, { can: () => stack.value.length === 1, onSwipe: swiped });
});
onBeforeUnmount(() => { stopEdge?.(); stopSwipe?.(); document.documentElement.classList.remove("ph-ready"); });
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
