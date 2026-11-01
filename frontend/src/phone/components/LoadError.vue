<script setup>
// What a screen shows when its data could not be loaded: what went wrong in plain words, and Try again, which loads the data again.
// Never a blank screen. text: the screen's own message.
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
defineProps({ text: { type: String, required: true } });
const { t } = useI18n();
</script>

<template>
  <div class="ph-loaderr" role="alert">
    <p>{{ text }}</p>
    <button type="button" class="ph-btn tonal" :disabled="data.loading.value" @click="data.load()">{{ t("phone.shell.tryAgain") }}</button>
  </div>
</template>
