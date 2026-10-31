<script setup>
// Settings → Automatic sorting → Card payments: bank lines that are the bill of a credit card (not counted as spending).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import { normD } from "../../lib/activity.js";
import { USUAL, ruleText, ruleWhere, ruleHow } from "../../lib/ruleFields.js";
import RuleList from "./RuleList.vue";
import RuleWhen from "./RuleWhen.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const ccr = ref(""), ccf = ref(USUAL.card), ccm = ref("in");
function ccAdd() {
  const why = C.genCheck(S.value.cardRules, ccr.value);
  if (why) return err(why == "short" ? tk("gen.cardShort") : tk("gen.exists"));
  save((n) => C.addCardRule(n, ccr.value, ccf.value, ccm.value)); ccr.value = ""; ccf.value = USUAL.card; ccm.value = "in";
  ok(tk("gen.added"));
}
const ccDel = (i) => save((n) => C.deleteCardRule(n, i));
function ccText(i, ev) {
  const r = S.value.cardRules[i], why = C.genCheck(S.value.cardRules.filter((_, j) => j != i), ev.target.value);
  if (why && normD(ev.target.value) != normD(ruleText(r))) { ev.target.value = ruleText(r); return err(why == "short" ? tk("gen.cardShort") : tk("gen.exists")); }
  if (save((n) => C.setCardRuleText(n, i, ev.target.value))) ok(tk("gen.textChanged"));
  ev.target.value = ruleText(S.value.cardRules[i]);
}
const ccMatch = (i, key, v) => save((n) => C.setRuleMatch(n, "card", i, key, v));
</script>

<template>
  <RuleList v-if="S" id="setCardRules" icon="card" :title="tk('gen.cardTitle')" :desc="tk('gen.cardDesc')" :count="(S.cardRules || []).length" search="cprules" :search-ph="tk('search.gen')" :empty="tk('gen.cardNone')" @add="ccAdd">
    <template #add><RuleWhen v-model:f="ccf" v-model:m="ccm" kind="card" /><input id="ccr" v-model="ccr" :placeholder="tk('gen.cardPh')" :aria-label="tk('text')" @keydown.enter.prevent="ccAdd"></template>
    <div v-for="(r, i) in S.cardRules || []" :key="i + ruleText(r)" class="rule"><RuleWhen kind="card" :f="ruleWhere(r, 'card')" :m="ruleHow(r)" @update:f="ccMatch(i, 'f', $event)" @update:m="ccMatch(i, 'm', $event)" /><input data-c="cck" :value="ruleText(r)" :aria-label="tk('text')" @change="ccText(i, $event)"><span class="rarr">→</span><b>{{ tk("gen.cardPay") }}</b><button type="button" class="btn o s rdel" @click="ccDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("gen.cardAuto", { list: C.CARD_NAMES.join(", ") }) }}</template>
  </RuleList>
</template>
