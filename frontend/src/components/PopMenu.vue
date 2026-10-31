<script setup>
// The small floating menu next to a button (.cmenu): the ⋯ menus on Jars and Bills and a jar's history.
// at: the button it belongs to (null = closed). It sits under the button (above when there is no room, under the whole
// [data-menuanchor] group when there is one), marks the button with data-open, and closes on a click elsewhere (or Esc).
// Buttons with aria-haspopup open and close menus themselves, so a click on one is left to the page.
// In the phone app (mobile.js) the same items show as an action sheet from the bottom, with Cancel apart under them.
import { ref, watch, nextTick, onMounted, onBeforeUnmount, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import { isPhone } from "../mobile.js";
import { escLayer } from "../core/layers.js";
const props = defineProps({ at: { type: Object, default: null }, cls: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const el = ref(null);
const phone = isPhone.value;
const PhoneSheet = phone ? defineAsyncComponent(() => import("../phone/components/PhoneSheet.vue")) : null;
const { t } = useI18n();
// a tap on an action runs it (the page's own handler) and closes the sheet; check boxes keep it open
const picked = (e) => { if (e.target.closest?.('[role="menuitem"],[data-a]')) nextTick(() => emit("close")); };

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
  if (b) { b.dataset.open = "1"; if (!phone) nextTick(() => el.value && props.at && place(el.value, props.at)); }
}, { flush: "post" });

const onClick = (e) => { if (props.at && !(el.value && el.value.contains(e.target)) && !e.target.closest?.("[aria-haspopup]")) emit("close"); };
if (!phone) escLayer(() => !!props.at, () => emit("close"));
// scrolling the page (not the menu itself) closes it
const onScroll = (e) => { if (props.at && !(e.target.closest && e.target.closest(".cmenu"))) emit("close"); };
onMounted(() => { if (phone) return; document.addEventListener("click", onClick); addEventListener("scroll", onScroll, { passive: true, capture: true }); });
onBeforeUnmount(() => { document.removeEventListener("click", onClick); removeEventListener("scroll", onScroll, { capture: true }); if (props.at) delete props.at.dataset.open; }); // eslint-disable-line vue/no-mutating-props -- the button is a DOM element; its data-open mark is not Vue state
</script>

<template>
  <component :is="PhoneSheet" v-if="phone" :open="!!at" :cls="'ph-menu ' + cls" @close="$emit('close')">
    <div class="ph-menu-b" role="menu" @click="picked"><slot /></div>
    <button type="button" class="ph-act ph-act-x" @click="$emit('close')">{{ t("phone.shell.cancel") }}</button>
  </component>
  <Teleport v-else to="body">
    <div v-if="at" ref="el" class="cmenu" :class="cls" role="menu"><slot /></div>
  </Teleport>
</template>
