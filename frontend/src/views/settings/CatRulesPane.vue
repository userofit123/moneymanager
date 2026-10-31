<script setup>
// Settings → Automatic sorting → Category rules: if a transaction contains a text (where the rule looks), it gets a category.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { catNames, catLabel } from "../../core/cats.js";
import * as C from "../../lib/categories.js";
import { USUAL } from "../../lib/ruleFields.js";
import RuleList from "./RuleList.vue";
import RuleWhen from "./RuleWhen.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const names = computed(() => (S.value ? catNames(S.value) : []));

const rk = ref(""), rc = ref(""), rf = ref(USUAL.cat), rm = ref("in");
const newRuleCat = computed(() => (names.value.includes(rc.value) ? rc.value : names.value[0] || ""));
const ruleOpts = (c) => (names.value.includes(c) ? names.value : [c, ...names.value]);
function ruleAdd() {
  const k = rk.value.trim(); if (!k) return;
  if (C.ruleExists(S.value, k)) return err(tk("r.dup"));
  const c = newRuleCat.value, before = C.uncategorized(S.value);
  save((n) => C.addRule(n, k, c, rf.value, rm.value));
  rk.value = ""; rf.value = USUAL.cat; rm.value = "in";
  const n = before - C.uncategorized(S.value); // the upkeep after the change sorted these
  ok(n ? tk("r.added", { n, c: catLabel(c) }, n) : tk("r.addedNew"));
}
const ruleDel = (i) => save((n) => C.deleteRule(n, i));
const ruleMatch = (i, key, v) => save((n) => C.setRuleMatch(n, "cat", i, key, v));
function ruleText(i, ev) { const r = S.value.rules[i], v = ev.target.value.trim(); if (!v) { ev.target.value = r.k; return; } save((n) => C.setRuleText(n, i, v)); }
function ruleCat(i, ev) {
  const r = S.value.rules[i], old = r.c, c = ev.target.value;
  if (!save((n) => C.setRuleCat(n, i, c))) return;
  const n = C.ruleMoveCount(S.value, r.k, old, r.f, r.m);
  ok(tk("r.newGo", { k: r.k, c: catLabel(c) }), { title: tk("r.updated"), ms: 14000, actions: n ? [{ label: tk("r.move", { n }, n), run: () => rulePast(i, old) }, { label: tk("r.leave") }] : [] });
}
function rulePast(i, old) { const out = {}; if (save((n) => C.applyRulePast(n, i, old, out))) ok(tk("r.moved", { n: out.n, c: catLabel(out.c) })); }
</script>

<template>
  <RuleList v-if="S" id="setRules" icon="rules" :title="tk('r.title')" :desc="tk('r.desc')" :count="S.rules.length" search="rules" :search-ph="tk('search.rules')" :empty="tk('r.none')" @add="ruleAdd">
    <template #add><RuleWhen v-model:f="rf" v-model:m="rm" kind="cat" /><input id="rk" v-model="rk" :placeholder="tk('ifDescPh')" :aria-label="tk('text')" @keydown.enter.prevent="ruleAdd"><select id="rc" :value="newRuleCat" :aria-label="tk('r.cat')" @change="rc = $event.target.value"><option v-for="c in names" :key="c" :value="c">{{ catLabel(c) }}</option></select></template>
    <div v-for="(r, i) in S.rules" :key="i + '|' + r.k" class="rule"><RuleWhen kind="cat" :f="r.f || USUAL.cat" :m="r.m || 'in'" @update:f="ruleMatch(i, 'f', $event)" @update:m="ruleMatch(i, 'm', $event)" /><input data-c="rulek" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="ruleText(i, $event)"><span class="rarr">→</span><select data-c="rulec" :data-i="i" :value="r.c" :aria-label="tk('r.cat')" @change="ruleCat(i, $event)"><option v-for="c in ruleOpts(r.c)" :key="c" :value="c">{{ catLabel(c) }}</option></select><button type="button" class="btn o s rdel" @click="ruleDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("r.foot") }}</template>
  </RuleList>
</template>
