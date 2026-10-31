<script setup>
// Settings → Automatic sorting → Card payments: bank lines that are the bill of a credit card (not counted as spending).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import { USUAL, ruleText, ruleWhere } from "../../lib/ruleFields.js";
import RuleList from "./RuleList.vue";
import RuleWhere from "./RuleWhere.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const ccr = ref(""), ccf = ref(USUAL.card);
function ccAdd() {
  const why = C.genCheck(S.value.cardRules, ccr.value);
  if (why) return err(why == "short" ? tk("gen.cardShort") : tk("gen.exists"));
  save((n) => C.addCardRule(n, ccr.value, ccf.value)); ccr.value = ""; ccf.value = USUAL.card;
  ok(tk("gen.added"));
}
const ccDel = (i) => save((n) => C.deleteCardRule(n, i));
const ccWhere = (i, f) => save((n) => C.setRuleWhere(n, "card", i, f));
</script>

<template>
  <RuleList v-if="S" id="setCardRules" icon="card" :title="tk('gen.cardTitle')" :desc="tk('gen.cardDesc')" :count="(S.cardRules || []).length" search="cprules" :search-ph="tk('search.gen')" :empty="tk('gen.cardNone')" @add="ccAdd">
    <template #add><RuleWhere id="ccf" v-model="ccf" kind="card" /><input id="ccr" v-model="ccr" :placeholder="tk('gen.cardPh')" :aria-label="tk('text')" @keydown.enter.prevent="ccAdd"></template>
    <div v-for="(r, i) in S.cardRules || []" :key="i + ruleText(r)" class="rule"><span>{{ tk("if") }}</span><RuleWhere data-c="ccf" :data-i="i" :model-value="ruleWhere(r, 'card')" kind="card" @update:model-value="ccWhere(i, $event)" /><span>{{ tk("has") }}</span><b class="gtxt">{{ ruleText(r) }}</b><span class="rarr">→</span><b>{{ tk("gen.cardPay") }}</b><button type="button" class="btn o s rdel" @click="ccDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("gen.cardAuto", { list: C.CARD_NAMES.join(", ") }) }}</template>
  </RuleList>
</template>
