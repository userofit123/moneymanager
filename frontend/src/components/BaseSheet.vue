<script setup>
// The app's pop-up window (#scrim and #sheet), styled in styles/components/sheets.css:
// a centred window on a computer that grows out of the button that opened it, a bottom sheet on a phone that can be swiped down.
// Both fade out when closed. Escape, a click outside and the phone's Back button close it. Show it with v-if or v-model:open.
// cls adds a size class: "xw" (wider) or "txw" (the wide entry window).
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import { sheetOpened, sheetClosed, sheetsOpen, lastTap } from "../core/sheets.js";
import { layerOpen, layerClose } from "../core/layers.js";

const props = defineProps({ open: { type: Boolean, default: true }, cls: { type: String, default: "" }, label: { type: String, default: "" } });
const emit = defineEmits(["update:open", "close"]);
const el = ref(null), scrim = ref(null);
const close = () => { emit("update:open", false); emit("close"); };

function placeOrigin() {
  const sh = el.value; if (!sh || document.documentElement.classList.contains("mob")) return;
  const w = sh.offsetWidth, h = sh.offsetHeight, near = lastTap && Date.now() - lastTap.t < 1500;
  sh.style.transformOrigin = Math.round(near ? lastTap.x - (innerWidth - w) / 2 : w / 2) + "px " + Math.round(near ? lastTap.y - (innerHeight - h) / 2 : h / 2) + "px";
}
watch(() => props.open, (o, was) => {
  if (o) { sheetOpened(close); layerOpen(close); nextTick(() => { placeOrigin(); swapIn(); if (el.value) el.value.scrollTop = 0; }); }
  else if (was) { sheetClosed(close); layerClose(close); }
}, { immediate: true });
onBeforeUnmount(() => { if (props.open) { sheetClosed(close); layerClose(close); } });

// swipe down to close, on a phone
let y0 = null, dy = 0, ok = false;
function ts(e) { if (!document.documentElement.classList.contains("mob")) return; y0 = e.touches[0].clientY; dy = 0; ok = el.value.scrollTop <= 0 || !!e.target.closest(".grab"); el.value.style.transition = "none"; }
function tm(e) { if (y0 == null || !ok) return; dy = e.touches[0].clientY - y0; if (dy > 0) { el.value.style.transform = "translateY(" + dy + "px)"; if (e.cancelable) e.preventDefault(); } else if (dy < 0 && el.value.scrollTop <= 0) dy = 0; }
function te() {
  if (y0 == null) return; const d = dy, sh = el.value; y0 = null; dy = 0; sh.style.transition = "transform .2s";
  if (d > 90) { sh.style.transform = "translateY(100%)"; setTimeout(() => { close(); sh.style.transform = ""; sh.style.transition = ""; }, 180); }
  else { sh.style.transform = ""; setTimeout(() => { sh.style.transition = ""; }, 220); }
}
function tc() { y0 = null; if (el.value) { el.value.style.transform = ""; el.value.style.transition = ""; } }
const reduce = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
// A window that takes over from another (the previous one is still fading out, or it opens on top of one) is simply there, without
// growing or sliding in, and the previous one goes at once, so it reads as one window whose content changes.
function swapIn() {
  const prev = [...document.querySelectorAll(".sheet.out,.scrim.out")];
  if (!prev.length && sheetsOpen() < 2) return;
  prev.forEach((x) => (x.style.display = "none"));
  for (const n of [scrim.value, el.value]) if (n) { n.getAnimations().forEach((a) => a.finish()); n._swapAt = Date.now(); }
}
const leave = (n) => {
  n.classList.remove("on");
  queueMicrotask(() => { if ([...document.querySelectorAll(".sheet.on,.scrim.on")].some((x) => Date.now() - (x._swapAt || 0) < 100)) n.style.display = "none"; });
};
</script>

<template>
  <Teleport to="body">
    <Transition leave-active-class="out" :duration="{ enter: 1, leave: 240 }" :css="!reduce()" @before-leave="leave">
      <div v-if="open" ref="scrim" class="scrim on" @click="close" @touchmove.prevent />
    </Transition>
    <Transition leave-active-class="out" :duration="{ enter: 1, leave: 240 }" :css="!reduce()" @before-leave="leave">
      <div v-if="open" ref="el" class="sheet on" :class="cls" role="dialog" aria-modal="true" :aria-label="label || undefined" @touchstart.passive="ts" @touchmove="tm" @touchend="te" @touchcancel="tc">
        <div class="grab" />
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>
