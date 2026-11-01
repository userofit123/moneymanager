<script setup>
// "Offline. Showing your last data." above the tab bar while the phone has no connection (html.ph-off lifts the toasts over it).
import { ref, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import PIcon from "./PIcon.vue";
const { t } = useI18n();
const off = ref(typeof navigator !== "undefined" && navigator.onLine === false);
const on = () => (off.value = false), down = () => (off.value = true);
addEventListener("online", on); addEventListener("offline", down);
watch(off, (v) => document.documentElement.classList.toggle("ph-off", v), { immediate: true });
onBeforeUnmount(() => { removeEventListener("online", on); removeEventListener("offline", down); document.documentElement.classList.remove("ph-off"); });
</script>

<template>
  <div class="ph-offline" :class="{ on: off }" role="status"><PIcon name="offline" /><span>{{ t("phone.shell.offline") }}</span></div>
</template>
