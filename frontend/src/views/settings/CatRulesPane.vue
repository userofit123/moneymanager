<script setup>
// Settings → Automatic sorting → Category rules: if a description contains a text, it gets a category.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { catNames, catLabel } from "../../core/cats.js";
import { searches, useRowSearch } from "../../core/rowSearch.js";
import * as C from "../../lib/categories.js";
import SetHead from "./SetHead.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const root = ref(null), none = useRowSearch(root, "rules");
const names = computed(() => (S.value ? catNames(S.value) : []));

const rk = ref(""), rc = ref("");
const newRuleCat = computed(() => (names.value.includes(rc.value) ? rc.value : names.value[0] || ""));
const ruleOpts = (c) => (names.value.includes(c) ? names.value : [c, ...names.value]);
function ruleAdd() {
  const k = rk.value.trim(); if (!k) return;
  if (C.ruleExists(S.value, k)) return err(tk("r.dup"));
  const c = newRuleCat.value, before = C.uncategorized(S.value);
  save((n) => C.addRule(n, k, c));
  rk.value = "";
  const n = before - C.uncategorized(S.value); // the upkeep after the change sorted these
  ok(n ? tk("r.added", { n, c: catLabel(c) }, n) : tk("r.addedNew"));
}
const ruleDel = (i) => save((n) => C.deleteRule(n, i));
function ruleText(i, ev) { const r = S.value.rules[i], v = ev.target.value.trim(); if (!v) { ev.target.value = r.k; return; } save((n) => C.setRuleText(n, i, v)); }
function ruleCat(i, ev) {
  const r = S.value.rules[i], old = r.c, c = ev.target.value;
  if (!save((n) => C.setRuleCat(n, i, c))) return;
  const n = C.ruleMoveCount(S.value, r.k, old);
  ok(tk("r.newGo", { k: r.k, c: catLabel(c) }), { title: tk("r.updated"), ms: 14000, actions: n ? [{ label: tk("r.move", { n }, n), run: () => rulePast(i, old) }, { label: tk("r.leave") }] : [] });
}
function rulePast(i, old) { const out = {}; if (save((n) => C.applyRulePast(n, i, old, out))) ok(tk("r.moved", { n: out.n, c: catLabel(out.c) })); }
</script>

<template>
  <div id="setRules" ref="root">
    <template v-if="S">
      <div class="rtool"><input v-model="searches.rules" class="rsearch" type="search" :placeholder="tk('search.rules')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
      <div v-if="none" class="rsnone sm">{{ t("cats.search.none", { q: none }) }}</div>
      <div class="card ss">
        <SetHead icon="rules" :title="tk('r.title')" :desc="tk('r.desc')" :count="S.rules.length" />
        <div class="ssb p">
          <div v-for="(r, i) in S.rules" :key="i + '|' + r.k" class="rule"><span>{{ tk("ifDesc") }}</span><input data-c="rulek" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="ruleText(i, $event)"><span>→</span><select data-c="rulec" :data-i="i" :value="r.c" :aria-label="tk('r.cat')" @change="ruleCat(i, $event)"><option v-for="c in ruleOpts(r.c)" :key="c" :value="c">{{ catLabel(c) }}</option></select><button type="button" class="btn o s" style="margin-inline-start:auto" @click="ruleDel(i)">{{ tk("del") }}</button></div>
          <div v-if="!S.rules.length" class="sm" style="padding:4px 2px 10px">{{ tk("r.none") }}</div>
        </div>
        <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="rk" v-model="rk" @keydown.enter.prevent="ruleAdd" :placeholder="tk('ifDescPh')"><select id="rc" :value="newRuleCat" @change="rc = $event.target.value"><option v-for="c in names" :key="c" :value="c">{{ catLabel(c) }}</option></select><button type="button" class="btn" @click="ruleAdd">{{ tk("addRule") }}</button></div>
      </div>
    </template>
  </div>
</template>
