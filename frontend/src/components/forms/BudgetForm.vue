<script setup>
// "Add a budget" (budForm in web/js/04-transactions.js): a category and its monthly limit, with a suggested amount from past months. k: the category to start with.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { budgets } from "../../core/derived.js";
import { formSuggestion, formCategories, setBudget } from "../../lib/budgets.js";
import { categoryName } from "../../catnames.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const props = defineProps({ k: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t, locale } = useI18n();
const M = budgets.value;
const sug = formSuggestion(M, props.k || "");
const f = ref({ k: props.k || formCategories(M, props.k || "")[0] || "", a: sug, sug: !!sug });
const cats = computed(() => formCategories(budgets.value, f.value.k));
function save() { const x = f.value; if (!x.k || !+x.a) return; close(); data.change((n) => setBudget(n, x.k, x.a)); }
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ t("budgets.add.title") }}</h3>
    <div class="fld"><label for="budK">{{ t("budgets.add.cat") }}</label><select id="budK" v-model="f.k"><option v-for="c in cats" :key="c" :value="c">{{ categoryName(c, locale) }}</option></select></div>
    <div class="fld"><label for="budA">{{ t("budgets.add.limit") }}</label><input id="budA" v-model="f.a" type="number" inputmode="numeric"></div>
    <div v-if="f.sug" class="sm" style="margin-bottom:12px">{{ t("budgets.add.sug") }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("budgets.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("budgets.save") }}</button></div>
  </BaseSheet>
</template>
