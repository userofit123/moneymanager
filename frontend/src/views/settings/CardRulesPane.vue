<script setup>
// Settings → Automatic sorting → Card payments: bank lines that are the bill of a credit card (not counted as spending).
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
const root = ref(null), none = useRowSearch(root, "cprules");
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
  <div id="setCardRules" ref="root">
    <template v-if="S">
      <div class="rtool"><input v-model="searches.cprules" class="rsearch" type="search" :placeholder="tk('search.gen')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
      <div v-if="none" class="rsnone sm">{{ t("cats.search.none", { q: none }) }}</div>
      <div class="card ss">
        <SetHead icon="card" :title="tk('gen.cardTitle')" :desc="tk('gen.cardDesc')" :count="(S.cardRules || []).length" />
        <div class="tools ssb"><input id="ccr" v-model="ccr" @keydown.enter.prevent="ccAdd" :placeholder="tk('gen.cardPh')"><button type="button" class="btn" @click="ccAdd">{{ tk("addRule") }}</button></div>
        <div class="ssb p">
          <div v-for="(r, i) in S.cardRules || []" :key="i + r" class="rule"><span>{{ tk("gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span>→</span><b>{{ tk("gen.cardPay") }}</b><button type="button" class="btn o s" style="margin-inline-start:auto" @click="ccDel(i)">{{ tk("del") }}</button></div>
          <div v-if="!(S.cardRules || []).length" class="sm" style="padding:4px 2px 10px">{{ tk("gen.cardNone") }}</div>
        </div>
        <div class="sm ssb" style="padding-top:0;line-height:1.55">{{ tk("gen.cardAuto", { list: C.CARD_NAMES.join(", ") }) }}</div>
      </div>
    </template>
  </div>
</template>
