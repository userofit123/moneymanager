<script setup>
// Every phone screen's frame: the top bar (Back to the screen under it, the small title, up to two buttons), the large title
// that slides up into the bar as the page scrolls, an optional part under the title (slot "head"), the content,
// and pull down to sync (refresh). A screen with a guide gets a ? in the bar that opens it in the Help sheet. The page itself scrolls (the document), so the browser's own bars hide as on any site.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onActivated, onDeactivated } from "vue";
import { useI18n } from "vue-i18n";
import { SCREENS } from "../screens.js";
import { usePhoneNav, useScreen } from "../navigation.js";
import { pullToRefresh } from "../gestures.js";
import { syncNow } from "../../core/sources.js";
import { job } from "../../core/jobs.js";
import { HELP_PAGE, guideOf, loadGuide } from "../../help/help.js";
import { helpOn } from "../help.js";
import PIcon from "./PIcon.vue";

const props = defineProps({
  title: { type: String, default: "" }, // the screen's name (default: its name in screens.js)
  large: { type: Boolean, default: true }, // false: only the small title in the bar
  refresh: { type: Boolean, default: false }, // pull down to sync
});
const { t } = useI18n();
const nav = usePhoneNav(), here = useScreen();
const name = computed(() => props.title || (here.entry ? t(SCREENS[here.entry.name].title) : ""));
const backTo = computed(() => (here.under ? t(SCREENS[here.under.name].title) : ""));

// the guide to this screen: a page's own, a pushed screen's page (an account: Accounts), a Settings section's
const guide = computed(() => {
  const e = here.entry; if (!e) return "";
  if (e.name === "settingsSection") return e.id ? "set." + e.id : "";
  const page = HELP_PAGE[e.name] ? e.name : SCREENS[e.name]?.on;
  return HELP_PAGE[page] ? page : "";
});
// (the Settings sections' guides are known once the guide is loaded)
const hasGuide = computed(() => !!guide.value && (!guide.value.startsWith("set.") || !!guideOf(guide.value, false)));
const showGuide = () => helpOn("guide", guide.value);

// Back shows the name of the screen under it; when its side of the bar is too narrow for that name, just "Back"
const backBox = ref(null), backFull = ref(true);
let fullW = 0, ro = null;
const fitBack = () => {
  const box = backBox.value, s = box?.querySelector(".ph-back span"); if (!s) return;
  if (backFull.value) fullW = s.scrollWidth;
  const room = box.clientWidth - (s.parentElement.offsetWidth - s.offsetWidth); // the side's width less the chevron and padding
  backFull.value = fullW <= room + 1;
};
watch(backTo, () => { backFull.value = true; nextTick(fitBack); });

// the large title has scrolled under the bar: the small one shows and the bar gets its glass and hairline
const sentinel = ref(null), bar = ref(null), small = ref(!props.large);
let io = null;
const watchTitle = () => {
  if (!props.large || !sentinel.value) return;
  io?.disconnect();
  const h = bar.value?.offsetHeight || 52; // the bar with the safe area above it
  io = new IntersectionObserver(([e]) => { small.value = !e.isIntersecting && e.boundingClientRect.top < h + 1; }, { rootMargin: `-${h}px 0px 0px 0px` });
  io.observe(sentinel.value);
};

// pull to sync: the sync icon turns with the pull and a line says what letting go will do; let go past the line and
// the page stays down a little, the icon spinning, until the sync is over, then eases back up
const REST = 64; // how far the page stays down while syncing
const pull = ref(0), ready = ref(false), hold = ref(false), turn = ref(0), root = ref(null);
const gap = computed(() => Math.max(pull.value, hold.value ? REST : 0));
const pullText = computed(() => t(hold.value ? "phone.shell.syncing" : ready.value ? "phone.shell.release" : "phone.shell.pull"));
let stopPull = null;
const jobDone = () => new Promise((res) => { const stop = watch(job, (v) => { if (!v) { stop(); res(); } }, { immediate: true }); });
const runSync = async () => {
  if (hold.value) return;
  hold.value = true;
  const t0 = performance.now();
  try { await (job.value ? jobDone() : syncNow()); } finally {
    await new Promise((res) => setTimeout(res, Math.max(0, 600 - (performance.now() - t0)))); // a very quick sync still shows
    hold.value = false;
  }
};
onMounted(() => {
  watchTitle();
  if (backBox.value) { ro = new ResizeObserver(fitBack); ro.observe(backBox.value); }
  if (guide.value.startsWith("set.")) loadGuide(false).catch(() => {});
  if (props.refresh) stopPull = pullToRefresh(root.value, { onMove: (d, r) => { pull.value = d; ready.value = r; if (d) turn.value = d * 3; }, onRun: runSync });
});
onActivated(watchTitle);
onDeactivated(() => io?.disconnect());
onBeforeUnmount(() => { io?.disconnect(); ro?.disconnect(); stopPull?.(); });
</script>

<template>
  <div ref="root" class="ph-screen" :data-key="here.entry?.url" :data-screen="here.entry?.name">
    <div ref="bar" class="ph-bar" :class="{ small }">
      <div ref="backBox" class="ph-bar-start">
        <button v-if="here.under" type="button" class="ph-back" :aria-label="t('phone.shell.back')" @click="nav.back()">
          <PIcon name="back" dir /><span>{{ backFull ? backTo : t("phone.shell.back") }}</span>
        </button>
      </div>
      <h2 class="ph-bar-title" :aria-hidden="large && !small ? 'true' : undefined">{{ name }}</h2>
      <div class="ph-bar-end"><slot name="actions" /><button v-if="hasGuide" type="button" class="ph-ib ph-guide-b" :aria-label="t('phone.shell.guide')" @click="showGuide"><PIcon name="help" /></button></div>
    </div>
    <div class="ph-body" :style="refresh && gap ? { transform: `translateY(${gap}px)`, transition: pull ? 'none' : null } : null">
      <div v-if="refresh" class="ph-pull" :class="{ ready, run: hold, drag: !!pull }" :style="{ opacity: Math.min(1, Math.max(0, (gap - 16) / 36)) }" aria-hidden="true">
        <span class="ph-pull-ic" :style="{ transform: `rotate(${turn}deg)` }"><PIcon name="sync" /></span>
        <span class="ph-pull-tx">{{ pullText }}</span>
      </div>
      <div v-if="large" class="ph-titlebox">
        <h1 class="ph-title">{{ name }}</h1>
        <div ref="sentinel" class="ph-sentinel" />
        <slot name="sub" />
      </div>
      <slot name="head" />
      <div class="ph-content"><slot /></div>
    </div>
  </div>
</template>
