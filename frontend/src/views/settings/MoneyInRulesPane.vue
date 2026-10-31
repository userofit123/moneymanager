<script setup>
// Settings → Automatic sorting → Money coming in: money coming in whose name or payer holds a text is the kind picked
// here (earned, salary, money back, from a person, your own money or other income). The app reads them in lib/moneyIn.js.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import { MARKS, inRules } from "../../lib/moneyIn.js";
import RuleList from "./RuleList.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const kindName = (k) => t("txw.mi.k." + k);
const S = computed(() => data.state.value);
const rules = computed(() => (S.value ? inRules(S.value) : []));
const txt = ref(""), kind = ref("salary");
function add() {
  const why = C.inRuleCheck(S.value, txt.value);
  if (why) return err(why == "short" ? tk("mi.short") : tk("gen.exists"));
  const out = {};
  save((n) => C.addInRule(n, txt.value, kind.value, out)); txt.value = "";
  ok(out.n ? tk("mi.added", { n: out.n }, out.n) : tk("mi.addedNew"));
}
const setKind = (i, ev) => save((n) => C.setInRuleKind(n, i, ev.target.value));
const del = (i) => save((n) => C.deleteInRule(n, i));
</script>

<template>
  <RuleList v-if="S" id="setInRules" icon="salary" :title="tk('mi.title')" :desc="tk('mi.desc')" :count="rules.length" search="srules" :search-ph="tk('search.gen')" :empty="tk('mi.none')" @add="add">
    <template #add><input id="slr" v-model="txt" :placeholder="tk('mi.ph')" :aria-label="tk('text')" @keydown.enter.prevent="add"><select id="slk" v-model="kind" :aria-label="tk('mi.kind')"><option v-for="m in MARKS" :key="m" :value="m">{{ kindName(m) }}</option></select></template>
    <div v-for="(r, i) in rules" :key="i + '|' + r.k" class="rule"><span>{{ tk("mi.ifIn") }}</span><b class="gtxt">{{ r.k }}</b><span class="rarr">→</span><select data-c="ink" :data-i="i" :value="r.kind" :aria-label="tk('mi.kind')" @change="setKind(i, $event)"><option v-for="m in MARKS" :key="m" :value="m">{{ kindName(m) }}</option></select><button type="button" class="btn o s rdel" @click="del(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("mi.auto") }}</template>
  </RuleList>
</template>
