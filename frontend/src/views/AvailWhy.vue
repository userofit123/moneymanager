<script setup>
// "Free to use": how the free money is worked out, as the lines that add up to it. Opened from the Jars page
// ("How is this worked out?") and from Home ("Full breakdown →"). M: the home model (lib/home.js).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseSheet from "../components/BaseSheet.vue";
import { fm } from "../format.js";

const props = defineProps({ open: Boolean, M: { type: Object, required: true } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const F = computed(() => props.M.flow);
// the lines of Free to use, in whole shekels that add up exactly (the same parts as Home's money flow and the Jars page)
const K = computed(() => { const f = F.value, cash = Math.round(f.cash), cards = Math.round(Math.max(0, f.cards || 0)); return { cash, cards, up: cash - cards - f.really, aside: f.aside, toCome: f.toCome }; });
const close = () => emit("update:open", false);
</script>

<template>
  <BaseSheet :open="open" :label="t('num.free')" @close="close">
    <h3>{{ t("num.free") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ t("jars.av.intro") }}</div>
    <div class="inf" style="margin-bottom:14px"><div class="chl" style="margin:0">
      <div class="chn"><span>{{ t("num.inAccounts") }}</span><b class="num">{{ fm(K.cash) }}</b></div>
      <div v-if="K.cards" class="chn"><span>{{ t("num.cardsUnpaid") }}</span><b class="num">{{ fm(-K.cards) }}</b></div>
      <div v-if="K.up" class="chn"><span>{{ t("num.upcoming") }}</span><b class="num">{{ fm(-K.up) }}</b></div>
      <div v-if="K.toCome" class="chn"><span>{{ t("num.leftBudgets") }}</span><b class="num">{{ fm(-K.toCome) }}</b></div>
      <div v-if="K.aside" class="chn"><span>{{ t("num.putAside") }}</span><b class="num">{{ fm(-K.aside) }}</b></div>
      <div class="chn tot"><span>{{ t("num.free") }}</span><b class="num">{{ fm(F.free) }}</b></div>
      <div v-if="F.over > 0" class="sm" style="padding:8px 2px 0;color:var(--neg)">{{ t("jars.av.short", { amount: fm(F.over) }) }}</div>
    </div></div>
    <div class="sm" style="line-height:1.5"><b>{{ t("jars.av.howTitle") }}</b><ul class="blist"><li>{{ t("jars.av.how1") }}</li><li>{{ t("jars.av.how2") }}</li><li>{{ t("jars.av.how3") }}</li><li>{{ t("jars.av.how4") }}</li></ul></div>
    <div class="flex" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn" data-a="close" @click="close">{{ t("jars.av.done") }}</button></div>
  </BaseSheet>
</template>
