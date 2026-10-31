<script setup>
// Settings → Automatic sorting → Display names: give entries a clearer name to show (the bank's text stays as it is).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import RuleList from "./RuleList.vue";
import RuleWhere from "./RuleWhere.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const nameRules = computed(() => S.value?.cfg?.nameRules || []);
const nr = ref({ f: "any", m: "in", k: "", n: "" });
function nameAdd() {
  const x = nr.value;
  if (!x.k.trim() || !x.n.trim()) return err(tk("n.needBoth"));
  save((n) => C.addNameRule(n, x));
  nr.value = { f: "any", m: "in", k: "", n: "" };
  ok(tk("n.added"));
}
function nameEdit(i, f, ev) {
  if (!save((n) => C.setNameRule(n, i, f, ev.target.value))) return;
  const r = nameRules.value[i];
  if (f == "k" || f == "n") ev.target.value = r[f];
  if (!r.k || !r.n) err(tk("n.needBothEdit"));
}
const nameDel = (i) => save((n) => C.deleteNameRule(n, i));
</script>

<template>
  <RuleList v-if="S" id="setNames" icon="name" :title="tk('n.title')" :desc="tk('n.desc')" :count="nameRules.length" search="names" :search-ph="tk('search.names')" :empty="tk('n.none')" @add="nameAdd">
    <template #add>
      <RuleWhere id="nrf" v-model="nr.f" kind="name" />
      <select id="nrm" v-model="nr.m" :aria-label="tk('n.how')"><option value="in">{{ tk("n.in") }}</option><option value="eq">{{ tk("n.eq") }}</option></select>
      <input id="nrk" v-model="nr.k" :placeholder="tk('n.textPh')" :aria-label="tk('text')" @keydown.enter.prevent="nameAdd"><input id="nrn" v-model="nr.n" :placeholder="tk('n.namePh')" :aria-label="tk('n.name')" @keydown.enter.prevent="nameAdd">
    </template>
    <div v-for="(r, i) in nameRules" :key="i" class="rule"><span>{{ tk("n.if") }}</span>
      <RuleWhere data-c="nrf" :data-i="i" :model-value="r.f || 'any'" kind="name" @update:model-value="nameEdit(i, 'f', { target: { value: $event } })" />
      <select data-c="nrm" :data-i="i" :value="r.m == 'eq' ? 'eq' : 'in'" :aria-label="tk('n.how')" @change="nameEdit(i, 'm', $event)"><option value="in">{{ tk("n.in") }}</option><option value="eq">{{ tk("n.eq") }}</option></select>
      <input data-c="nrk" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="nameEdit(i, 'k', $event)"><span class="rarr">→</span><input data-c="nrn" :data-i="i" :value="r.n" :aria-label="tk('n.name')" @change="nameEdit(i, 'n', $event)"><button type="button" class="btn o s rdel" @click="nameDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("n.foot") }}</template>
  </RuleList>
</template>
