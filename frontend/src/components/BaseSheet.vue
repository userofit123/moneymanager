<script setup>
// The app's pop-up window (#scrim and #sheet), styled in styles/components/sheets.css:
// a centred window that grows out of the button that opened it and fades out when closed.
// Escape, a click outside and the Back button close it. Show it with v-if or v-model:open.
// cls adds a size class: "xw" (wider) or "txw" (the wide entry window).
// The window itself does not scroll: its inner part (.sheet-scroll) does, so the scrollbar sits inside the rounded window.
// In the phone app (mobile.js) the same content shows in the phone's own sheet (phone/components/PhoneSheet.vue), loaded only there.
import { ref, watch, nextTick, onBeforeUnmount, defineAsyncComponent } from "vue";
import { isPhone } from "../mobile.js";
import { sheetOpened, sheetClosed, sheetsOpen, lastTap } from "../core/sheets.js";
import { layerOpen, layerClose } from "../core/layers.js";

const props = defineProps({ open: { type: Boolean, default: true }, cls: { type: String, default: "" }, label: { type: String, default: "" } });
const emit = defineEmits(["update:open", "close"]);
const el = ref(null), scrim = ref(null), box = ref(null);
const close = () => { emit("update:open", false); emit("close"); };
const phone = isPhone.value;
const PhoneSheet = phone ? defineAsyncComponent(() => import("../phone/components/PhoneSheet.vue")) : null;

function placeOrigin() {
  const sh = el.value; if (!sh) return;
  const w = sh.offsetWidth, h = sh.offsetHeight, near = lastTap && Date.now() - lastTap.t < 1500;
  sh.style.transformOrigin = Math.round(near ? lastTap.x - (innerWidth - w) / 2 : w / 2) + "px " + Math.round(near ? lastTap.y - (innerHeight - h) / 2 : h / 2) + "px";
}
watch(() => props.open, (o, was) => {
  if (phone) return;
  if (o) { sheetOpened(close); layerOpen(close); nextTick(() => { placeOrigin(); swapIn(); if (box.value) box.value.scrollTop = 0; }); }
  else if (was) { sheetClosed(close); layerClose(close); }
}, { immediate: true });
onBeforeUnmount(() => { if (!phone && props.open) { sheetClosed(close); layerClose(close); } });

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
  <component :is="PhoneSheet" v-if="phone" :open="open" :label="label" :size="/xw/.test(cls) ? 'large' : 'fit'" :cls="'ph-adopt ' + cls" @close="close">
    <slot :close="close" />
  </component>
  <Teleport v-else to="body">
    <Transition leave-active-class="out" :duration="{ enter: 1, leave: 240 }" :css="!reduce()" @before-leave="leave">
      <div v-if="open" ref="scrim" class="scrim on" @click="close" @touchmove.prevent />
    </Transition>
    <Transition leave-active-class="out" :duration="{ enter: 1, leave: 240 }" :css="!reduce()" @before-leave="leave">
      <div v-if="open" ref="el" class="sheet on" :class="cls" role="dialog" aria-modal="true" :aria-label="label || undefined">
        <div ref="box" class="sheet-scroll">
          <div class="sheet-content">
            <div class="grab" />
            <slot :close="close" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
