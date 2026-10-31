<script setup>
// The phone's window: a sheet that rises from the bottom, with a handle to drag it down, a title with Close, the content
// (scrolls inside) and a footer that stays above the keyboard and the home bar. size "fit" grows with the content up to 92% of
// the screen; "large" is always 92%. Escape, a tap on the dim area, the phone's Back and a pull down close it.
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { sheetOpened, sheetClosed } from "../../core/sheets.js";
import { layerOpen, layerClose } from "../../core/layers.js";
import { dragDown } from "../gestures.js";
import PIcon from "./PIcon.vue";

const props = defineProps({ open: { type: Boolean, default: true }, title: { type: String, default: "" }, size: { type: String, default: "fit" }, label: { type: String, default: "" } });
const emit = defineEmits(["update:open", "close"]);
const { t } = useI18n();
const el = ref(null), body = ref(null);
const close = () => { emit("update:open", false); emit("close"); };
let stopDrag = null;
watch(() => props.open, (o, was) => {
  if (o) { sheetOpened(close); layerOpen(close); nextTick(() => { if (el.value) { stopDrag?.(); stopDrag = dragDown(el.value, { onClose: close, body: body.value }); el.value.focus({ preventScroll: true }); } }); }
  else if (was) { sheetClosed(close); layerClose(close); stopDrag?.(); stopDrag = null; }
}, { immediate: true });
onBeforeUnmount(() => { stopDrag?.(); if (props.open) { sheetClosed(close); layerClose(close); } });
</script>

<template>
  <Teleport to="body">
    <Transition name="ph-fade"><div v-if="open" class="ph-scrim" @click="close" @touchmove.prevent /></Transition>
    <Transition name="ph-rise">
      <div v-if="open" ref="el" class="ph-sheet" :class="size" role="dialog" aria-modal="true" :aria-label="label || title || undefined" tabindex="-1">
        <div class="ph-grab" aria-hidden="true"><i /></div>
        <div v-if="title || $slots.head" class="ph-sheet-h">
          <slot name="head"><h2>{{ title }}</h2></slot>
          <button type="button" class="ph-ib ph-close" :aria-label="t('common.close')" @click="close"><PIcon name="close" /></button>
        </div>
        <div ref="body" class="ph-sheet-b"><slot :close="close" /></div>
        <div v-if="$slots.foot" class="ph-sheet-f"><slot name="foot" :close="close" /></div>
      </div>
    </Transition>
  </Teleport>
</template>
