<script setup>
// Settings → Automatic sorting → Salary: income whose text contains one of these is marked as Salary.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { searches, useRowSearch } from "../../core/rowSearch.js";
import * as C from "../../lib/categories.js";
import SetHead from "./SetHead.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const root = ref(null), none = useRowSearch(root, "srules");
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
  <div id="setSalRules" ref="root">
    <template v-if="S">
      <div class="rtool"><input v-model="searches.srules" class="rsearch" type="search" :placeholder="tk('search.gen')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
      <div v-if="none" class="rsnone sm">{{ t("cats.search.none", { q: none }) }}</div>
      <div class="card ss">
        <SetHead icon="rules" :title="tk('gen.salTitle')" :desc="tk('gen.salDesc')" :count="(S.salaryRules || []).length" />
        <div class="ssb p">
          <div v-for="(r, i) in S.salaryRules || []" :key="i + r" class="rule"><span>{{ tk("gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span>→</span><b>{{ tk("gen.salary") }}</b><button type="button" class="btn o s" style="margin-inline-start:auto" @click="salDel(i)">{{ tk("del") }}</button></div>
          <div v-if="!(S.salaryRules || []).length" class="sm" style="padding:4px 2px 10px">{{ tk("gen.salNone") }}</div>
        </div>
        <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="slr" v-model="slr" @keydown.enter.prevent="salAdd" :placeholder="tk('gen.salPh')"><button type="button" class="btn" @click="salAdd">{{ tk("addRule") }}</button></div>
        <div class="sm ssb" style="padding-top:0;line-height:1.55">{{ tk("gen.salAuto") }}</div>
      </div>
    </template>
  </div>
</template>
