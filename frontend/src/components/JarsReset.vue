<script setup>
// "Reset all jars?": asks first, showing each open jar now and after the reset, and what stays free.
// Opened from the Jars page's ⋯ menu (views/Jars.vue) and the phone's Jars screen. plan: lib/jars.js resetPlan.
import { useI18n } from "vue-i18n";
import BaseSheet from "./BaseSheet.vue";
import { fm } from "../format.js";
import { tx } from "../core/heText.js";

defineProps({ open: Boolean, plan: { type: Object, default: null } });
const emit = defineEmits(["close", "yes"]);
const { t } = useI18n();
</script>

<template>
  <BaseSheet :open="open" @close="emit('close')">
    <h3>{{ t("jars.reset.title") }}</h3>
    <div class="sm jrs-text">{{ t("jars.reset.text", { amount: fm(plan?.pool || 0) }) }}</div>
    <div class="jrs">
      <div class="jrs-r jrs-h"><span class="jrs-n" /><span>{{ t("jars.reset.now") }}</span><span>{{ t("jars.reset.after") }}</span></div>
      <div v-for="r in plan?.rows || []" :key="r.id" class="jrs-r"><span class="jrs-n">{{ tx(r.n) }}</span><span class="num">{{ fm(r.before) }}</span><b class="num">{{ fm(r.after) }}</b></div>
      <div v-if="plan?.free > 0" class="jrs-r jrs-free"><span class="jrs-n">{{ t("jars.reset.free", { amount: fm(plan.free) }) }}</span></div>
    </div>
    <div class="sm jrs-text">{{ t("jars.reset.same") }}</div>
    <div class="flex jrs-btns"><button type="button" class="btn o" data-a="close" @click="emit('close')">{{ t("jars.cancel") }}</button><button type="button" class="btn" data-a="jarsResetYes" @click="emit('yes')">{{ t("jars.reset.yes") }}</button></div>
  </BaseSheet>
</template>
