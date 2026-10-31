<script setup>
// Settings → Automatic sorting → Money coming in: money coming in that holds a text (where the rule looks) is a Salary or
// Money back, as picked here. The app reads them in lib/moneyIn.js.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import { RULE_KINDS, inRules } from "../../lib/moneyIn.js";
import { USUAL, ruleWhere } from "../../lib/ruleFields.js";
import RuleList from "./RuleList.vue";
import RuleWhere from "./RuleWhere.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const kindName = (k) => t("txw.mi.k." + k);
const S = computed(() => data.state.value);
const rules = computed(() => (S.value ? inRules(S.value) : []));
const txt = ref(""), kind = ref("salary"), where = ref(USUAL.in);
function add() {
  const why = C.inRuleCheck(S.value, txt.value);
  if (why) return err(why == "short" ? tk("mi.short") : tk("gen.exists"));
  const out = {};
  save((n) => C.addInRule(n, txt.value, kind.value, out, where.value)); txt.value = ""; where.value = USUAL.in;
  ok(out.n ? tk("mi.added", { n: out.n }, out.n) : tk("mi.addedNew"));
}
const setKind = (i, ev) => save((n) => C.setInRuleKind(n, i, ev.target.value));
const del = (i) => save((n) => C.deleteInRule(n, i));
const setWhere = (i, f) => save((n) => C.setRuleWhere(n, "in", i, f));
</script>

<template>
  <RuleList v-if="S" id="setInRules" icon="salary" :title="tk('mi.title')" :desc="tk('mi.desc')" :count="rules.length" search="srules" :search-ph="tk('search.gen')" :empty="tk('mi.none')" @add="add">
    <template #add><RuleWhere id="slf" v-model="where" kind="in" /><input id="slr" v-model="txt" :placeholder="tk('mi.ph')" :aria-label="tk('text')" @keydown.enter.prevent="add"><select id="slk" v-model="kind" :aria-label="tk('mi.kind')"><option v-for="m in RULE_KINDS" :key="m" :value="m">{{ kindName(m) }}</option></select></template>
    <div v-for="(r, i) in rules" :key="i + '|' + r.k" class="rule"><span>{{ tk("if") }}</span><RuleWhere data-c="inf" :data-i="i" :model-value="ruleWhere(r, 'in')" kind="in" @update:model-value="setWhere(i, $event)" /><span>{{ tk("has") }}</span><b class="gtxt">{{ r.k }}</b><span class="rarr">→</span><select data-c="ink" :data-i="i" :value="r.kind" :aria-label="tk('mi.kind')" @change="setKind(i, $event)"><option v-for="m in RULE_KINDS" :key="m" :value="m">{{ kindName(m) }}</option></select><button type="button" class="btn o s rdel" @click="del(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("mi.auto") }}</template>
  </RuleList>
</template>
