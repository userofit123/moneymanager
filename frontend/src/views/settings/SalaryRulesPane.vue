<script setup>
// Settings → Automatic sorting → Salary: income whose text contains one of these is marked as Salary.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import RuleList from "./RuleList.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const slr = ref("");
function salAdd() {
  const why = C.genCheck(S.value.salaryRules, slr.value);
  if (why) return err(why == "short" ? tk("gen.salShort") : tk("gen.exists"));
  const out = {};
  save((n) => C.addSalaryRule(n, slr.value, out)); slr.value = "";
  ok(out.n ? tk("gen.salAdded", { n: out.n }, out.n) : tk("gen.salAddedNew"));
}
const salDel = (i) => save((n) => C.deleteSalaryRule(n, i));
</script>

<template>
  <RuleList v-if="S" id="setSalRules" icon="salary" :title="tk('gen.salTitle')" :desc="tk('gen.salDesc')" :count="(S.salaryRules || []).length" search="srules" :search-ph="tk('search.gen')" :empty="tk('gen.salNone')" @add="salAdd">
    <template #add><input id="slr" v-model="slr" :placeholder="tk('gen.salPh')" :aria-label="tk('text')" @keydown.enter.prevent="salAdd"></template>
    <div v-for="(r, i) in S.salaryRules || []" :key="i + r" class="rule"><span>{{ tk("gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span class="rarr">→</span><b>{{ tk("gen.salary") }}</b><button type="button" class="btn o s rdel" @click="salDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("gen.salAuto") }}</template>
  </RuleList>
</template>
