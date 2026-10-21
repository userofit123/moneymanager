<script setup>
// The small floating menu next to a button (.cmenu): the ⋯ menus on Jars and Bills and a jar's history.
// at: the button it belongs to (null = closed). It sits under the button (above when there is no room, under the whole
// [data-menuanchor] group when there is one), marks the button with data-open, and closes on a click elsewhere (or Esc).
// Buttons with aria-haspopup open and close menus themselves, so a click on one is left to the page.
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { escLayer } from "../core/layers.js";
const props = defineProps({ at: { type: Object, default: null }, cls: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const el = ref(null);

function place(m, btn) {
  const an = btn.closest("[data-menuanchor]"), r = (an || btn).getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth;
  const up = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8;
  m.style.top = (up ? r.top - 6 - h : r.bottom + 6) + "px";
  const rtl = document.documentElement.classList.contains("he"), x = Math.max(8, Math.min(rtl ? r.left : innerWidth - r.right, innerWidth - w - 8));
  m.style.left = m.style.right = ""; m.style[rtl ? "left" : "right"] = x + "px";
  m.style.maxHeight = Math.max(120, Math.min(up ? r.top - 14 : innerHeight - r.bottom - 14, 360)) + "px";
}
watch(() => props.at, (b, old) => {
  if (old) delete old.dataset.open;
  if (b) { b.dataset.open = "1"; nextTick(() => el.value && props.at && place(el.value, props.at)); }
}, { flush: "post" });

const onClick = (e) => { if (props.at && !(el.value && el.value.contains(e.target)) && !e.target.closest?.("[aria-haspopup]")) emit("close"); };
escLayer(() => !!props.at, () => emit("close"));
// scrolling the page (not the menu itself) closes it
const onScroll = (e) => { if (props.at && !(e.target.closest && e.target.closest(".cmenu"))) emit("close"); };
onMounted(() => { document.addEventListener("click", onClick); addEventListener("scroll", onScroll, { passive: true, capture: true }); });
onBeforeUnmount(() => { document.removeEventListener("click", onClick); removeEventListener("scroll", onScroll, { capture: true }); if (props.at) delete props.at.dataset.open; });
</script>

<template>
  <Teleport to="body">
    <div v-if="at" ref="el" class="cmenu" :class="cls" role="menu"><slot /></div>
  </Teleport>
</template>
