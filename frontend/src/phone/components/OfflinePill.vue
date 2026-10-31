<script setup>
// "Offline. Showing your last data." under the top bar while the phone has no connection.
import { ref, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import PIcon from "./PIcon.vue";
const { t } = useI18n();
const off = ref(typeof navigator !== "undefined" && navigator.onLine === false);
const on = () => (off.value = false), down = () => (off.value = true);
addEventListener("online", on); addEventListener("offline", down);
onBeforeUnmount(() => { removeEventListener("online", on); removeEventListener("offline", down); });
</script>

<template>
  <div class="ph-offline" :class="{ on: off }" role="status"><PIcon name="offline" /><span>{{ t("phone.shell.offline") }}</span></div>
</template>
