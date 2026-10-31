<script setup>
// Settings → Automatic sorting → Card payments: bank lines that are the bill of a credit card (not counted as spending).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import RuleList from "./RuleList.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const ccr = ref("");
function ccAdd() {
  const why = C.genCheck(S.value.cardRules, ccr.value);
  if (why) return err(why == "short" ? tk("gen.cardShort") : tk("gen.exists"));
  save((n) => C.addCardRule(n, ccr.value)); ccr.value = "";
  ok(tk("gen.added"));
}
const ccDel = (i) => save((n) => C.deleteCardRule(n, i));
</script>

<template>
  <RuleList v-if="S" id="setCardRules" icon="card" :title="tk('gen.cardTitle')" :desc="tk('gen.cardDesc')" :count="(S.cardRules || []).length" search="cprules" :search-ph="tk('search.gen')" :empty="tk('gen.cardNone')" @add="ccAdd">
    <template #add><input id="ccr" v-model="ccr" :placeholder="tk('gen.cardPh')" :aria-label="tk('text')" @keydown.enter.prevent="ccAdd"></template>
    <div v-for="(r, i) in S.cardRules || []" :key="i + r" class="rule"><span>{{ tk("gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span class="rarr">→</span><b>{{ tk("gen.cardPay") }}</b><button type="button" class="btn o s rdel" @click="ccDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("gen.cardAuto", { list: C.CARD_NAMES.join(", ") }) }}</template>
  </RuleList>
</template>
