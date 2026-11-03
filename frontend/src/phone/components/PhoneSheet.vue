<script setup>
// The phone's window: a sheet that rises from the bottom, with a handle to drag it down, a title with Close, the content
// (scrolls inside) and a footer that stays above the keyboard and the home bar. size "fit" grows with the content up to 92% of
// the screen; "large" is always 92%. Escape, a tap on the dim area, the phone's Back and a pull down close it.
// cls: extra classes (ph-adopt: a computer window's content, restyled by styles/adopted.css; its own first heading is the
// title, with Close floating beside it).
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { sheetOpened, sheetClosed } from "../../core/sheets.js";
import { layerOpen, layerClose } from "../../core/layers.js";
import { dragDown } from "../gestures.js";
import PIcon from "./PIcon.vue";

const props = defineProps({ open: { type: Boolean, default: true }, title: { type: String, default: "" }, size: { type: String, default: "fit" }, label: { type: String, default: "" }, cls: { type: String, default: "" } });
const emit = defineEmits(["update:open", "close"]);
const { t } = useI18n();
const el = ref(null), body = ref(null);
// a computer window brings its own title as the first line of its content: Close then floats at the title's end
const adopted = computed(() => /(^|\s)ph-adopt(\s|$)/.test(props.cls));
const close = () => { emit("update:open", false); emit("close"); };
let stopDrag = null;
// A sheet that takes over from another in the same moment (a tile in "Add or update" opens its form) is simply there, and
// the one it replaces goes at once, so it reads as one sheet whose content changes, as the computer's windows do (BaseSheet).
// (a computer window's sheet loads a moment later, so "the same moment" is 400ms; the one still sliding away is hidden then)
const swapIn = (n) => {
  if (Date.now() - swap.closed > 400) return;
  n.classList.add("ph-swap");
  document.querySelectorAll(".ph-rise-leave-active, .ph-fade-leave-active").forEach((x) => { if (x !== n) x.style.display = "none"; });
};
const swapOut = (n) => { if (Date.now() - swap.opened < 80) n.style.display = "none"; };
const swapDone = (n) => n.classList.remove("ph-swap");
// the on-screen keyboard: the sheet sits on top of it (--kb is its height, --vvh the height left above it), and the field
// being typed in stays in sight, also when the next field is tapped while the keyboard stays open
const vv = typeof window !== "undefined" ? window.visualViewport : null;
let kbNow = 0;
const showField = () => {
  const f = document.activeElement;
  if (kbNow && f && el.value?.contains(f) && f.matches("input,textarea,select")) requestAnimationFrame(() => f.scrollIntoView({ block: "nearest" }));
};
const onKb = () => {
  if (!el.value || !vv) return;
  kbNow = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
  el.value.style.setProperty("--kb", kbNow + "px");
  el.value.style.setProperty("--vvh", Math.round(vv.height) + "px");
  showField();
};
watch(() => props.open, (o, was) => {
  if (o) { swap.opened = Date.now(); sheetOpened(close); layerOpen(close); vv?.addEventListener("resize", onKb); nextTick(() => { if (el.value) { stopDrag?.(); stopDrag = dragDown(el.value, { onClose: close, body: body.value }); el.value.focus({ preventScroll: true }); onKb(); } }); }
  else if (was) { swap.closed = Date.now(); sheetClosed(close); layerClose(close); vv?.removeEventListener("resize", onKb); stopDrag?.(); stopDrag = null; }
}, { immediate: true });
onBeforeUnmount(() => { stopDrag?.(); vv?.removeEventListener("resize", onKb); if (props.open) { sheetClosed(close); layerClose(close); } });
</script>

<script>
// when the last sheet opened and closed, shared by every sheet (see swapIn)
const swap = { opened: 0, closed: 0 };
</script>

<template>
  <Teleport to="body">
    <Transition name="ph-fade" @before-enter="swapIn" @after-enter="swapDone" @before-leave="swapOut"><div v-if="open" class="ph-scrim" @click="close" @touchmove.prevent /></Transition>
    <Transition name="ph-rise" @before-enter="swapIn" @after-enter="swapDone" @before-leave="swapOut">
      <div v-if="open" ref="el" class="ph-sheet" :class="[size, cls]" role="dialog" aria-modal="true" :aria-label="label || title || undefined" tabindex="-1" @focusin="showField">
        <div class="ph-grab" aria-hidden="true"><i /></div>
        <div v-if="title || $slots.head" class="ph-sheet-h">
          <slot name="head"><h2>{{ title }}</h2></slot>
          <button type="button" class="ph-ib ph-close" :aria-label="t('common.close')" @click="close"><PIcon name="close" /></button>
        </div>
        <button v-else-if="adopted" type="button" class="ph-ib ph-close ph-close-f" :aria-label="t('common.close')" @click="close"><PIcon name="close" /></button>
        <div ref="body" class="ph-sheet-b"><slot :close="close" /></div>
        <div v-if="$slots.foot" class="ph-sheet-f"><slot name="foot" :close="close" /></div>
      </div>
    </Transition>
  </Teleport>
</template>
