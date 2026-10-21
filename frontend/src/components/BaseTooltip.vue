<script setup>
// A short explanation that shows on hover or keyboard focus (and on tap on phones), like the current app's tooltips.
// The cursor stays normal: never the question-mark cursor. Uses the old app's .tip (a floating box placed next to the thing, styled in styles/legacy.css).
import { ref, useId, nextTick } from "vue";
defineProps({ text: { type: String, required: true } });
const open = ref(false);
const root = ref(null);
const box = ref(null);
const id = useId();
const show = async () => {
  open.value = true;
  await nextTick();
  const t = root.value?.firstElementChild, b = box.value;
  if (!t || !b) return;
  const r = t.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
  const up = r.top > h + 14;
  // the page is always laid out left to right at the top level (only the body is right to left), so screen coordinates go straight in
  b.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  b.style.top = (up ? r.top - h - 8 : r.bottom + 8) + "px";
};
const hide = () => { open.value = false; };
</script>

<template>
  <span ref="root" class="tw" @mouseenter="show" @mouseleave="hide" @focusin="show" @focusout="hide" @click="open ? hide() : show()" @keydown.esc="hide">
    <slot />
    <Teleport to="body"><div v-if="open" :id="id" ref="box" role="tooltip" class="tip on">{{ text }}</div></Teleport>
  </span>
</template>

<style>
.tw { display: contents; }
</style>
