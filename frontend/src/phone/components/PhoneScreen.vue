<script setup>
// Every phone screen's frame: the top bar (Back to the screen under it, the small title, up to two buttons), the large title
// that slides up into the bar as the page scrolls, an optional part under the title (slot "head"), the content,
// and pull down to sync (refresh). The page itself scrolls (the document), so the browser's own bars hide as on any site.
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated } from "vue";
import { useI18n } from "vue-i18n";
import { SCREENS } from "../screens.js";
import { usePhoneNav, useScreen } from "../navigation.js";
import { pullToRefresh } from "../gestures.js";
import { syncNow } from "../../core/sources.js";
import { job } from "../../core/jobs.js";
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

// pull to sync: the ring grows as the page is pulled, and spins while the sync runs
const pull = ref(0), ready = ref(false), root = ref(null);
let stopPull = null;
const runSync = () => { if (!job.value) syncNow(); };
onMounted(() => {
  watchTitle();
  if (props.refresh) stopPull = pullToRefresh(root.value, { onMove: (d, r) => { pull.value = d; ready.value = r; }, onRun: runSync });
});
onActivated(watchTitle);
onDeactivated(() => io?.disconnect());
onBeforeUnmount(() => { io?.disconnect(); stopPull?.(); });
</script>

<template>
  <div ref="root" class="ph-screen" :data-key="here.entry?.url" :data-screen="here.entry?.name">
    <div ref="bar" class="ph-bar" :class="{ small }">
      <div class="ph-bar-start">
        <button v-if="here.under" type="button" class="ph-back" :aria-label="t('phone.shell.back')" @click="nav.back()">
          <PIcon name="back" dir /><span>{{ backTo }}</span>
        </button>
      </div>
      <h2 class="ph-bar-title" :aria-hidden="large && !small ? 'true' : undefined">{{ name }}</h2>
      <div class="ph-bar-end"><slot name="actions" /></div>
    </div>
    <div v-if="refresh" class="ph-pull" :class="{ ready, run: !!job }" :style="{ '--pull': pull + 'px' }" aria-hidden="true">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" :style="{ strokeDasharray: 57, strokeDashoffset: 57 - Math.min(1, pull / 72) * 52 }" /></svg>
    </div>
    <div class="ph-body" :style="refresh && pull ? { transform: `translateY(${pull}px)`, transition: 'none' } : null">
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
