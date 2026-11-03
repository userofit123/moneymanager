<script setup>
// "Add or update" in the phone app (the + on Home): the computer's + window (components/shell/QuickSheet.vue), every kind
// of thing that can be added (core/addActions.js) as two columns of its tiles, each with its icon, name and a short hint.
// A tap closes the sheet and opens that thing's window.
import { useI18n } from "vue-i18n";
import { quickOpen } from "../../core/shell.js";
import { ADD_ITEMS, ADD_ICONS } from "../../core/addActions.js";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";

const { t } = useI18n();
const pick = (run) => { quickOpen.value = false; run(); };
</script>

<template>
  <PhoneSheet v-model:open="quickOpen" :title="t('qa.title')" cls="ph-add">
    <div class="ph-add-g">
      <button v-for="[ic, k, run] in ADD_ITEMS" :key="k" type="button" class="ph-add-i" :data-k="k" @click="pick(run)">
        <span class="ph-tile"><PIcon :svg="ADD_ICONS[ic]" /></span>
        <span class="ph-add-w"><span class="ph-add-t">{{ t("qa." + k) }}</span><span class="ph-add-h">{{ t("qa." + k + "H") }}</span></span>
      </button>
    </div>
  </PhoneSheet>
</template>
