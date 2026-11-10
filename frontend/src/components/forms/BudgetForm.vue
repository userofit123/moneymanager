<script setup>
// "Add a budget": a category and its monthly limit. After choosing a category it shows what that category cost in each of the
// last complete months and their average, and fills in the average (rounded) as a suggested limit until the person types their own.
// k: the category to start with; a: an amount to start with instead of the suggestion (the person can still change it).
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { budgets } from "../../core/derived.js";
import { formPast, formCategories, setBudget } from "../../lib/budgets.js";
import { fm } from "../../lib/bills.js";
import { categoryName } from "../../catnames.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";
import MoneyInput from "../MoneyInput.vue";

const props = defineProps({ k: { type: String, default: "" }, a: { type: [Number, String], default: "" } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t, locale } = useI18n();
const f = ref({ k: props.k || formCategories(budgets.value, "")[0] || "", a: props.a });
const own = ref(!!props.a); // the person typed (or was given) their own amount: the suggestion no longer replaces it
const cats = computed(() => formCategories(budgets.value, f.value.k));
const past = computed(() => formPast(budgets.value, f.value.k));
const mname = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "long" });
watch(past, (p) => { if (!own.value) f.value.a = p ? p.sug : ""; }, { immediate: true });
const sugShown = computed(() => !own.value && !!past.value);
const typed = (v) => { f.value.a = v; own.value = true; };
function save() { const x = f.value; if (!x.k || !+x.a) return; close(); data.change((n) => setBudget(n, x.k, x.a)); }
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ t("budgets.add.title") }}</h3>
    <div class="fld"><label for="budK">{{ t("budgets.add.cat") }}</label><select id="budK" v-model="f.k"><option v-for="c in cats" :key="c" :value="c">{{ categoryName(c, locale) }}</option></select></div>
    <div v-if="past" class="bud-past">
      <div class="bud-past-h">{{ t("budgets.add.past") }}</div>
      <div v-for="x in past.months" :key="x.m" class="kvr"><span class="k">{{ mname(x.m) }}</span><span class="v">{{ fm(x.v) }}</span></div>
      <div class="kvr bud-past-avg"><span class="k">{{ t("budgets.add.avg") }}</span><span class="v">{{ fm(past.avg) }}</span></div>
    </div>
    <div v-else-if="f.k" class="sm bud-past-none">{{ t("budgets.add.none") }}</div>
    <div class="fld"><label for="budA">{{ t("budgets.add.limit") }}</label><MoneyInput id="budA" :model-value="f.a" @update:model-value="typed" /></div>
    <div v-if="sugShown" class="sm" style="margin-bottom:12px">{{ t("budgets.add.sug") }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("budgets.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("budgets.save") }}</button></div>
  </BaseSheet>
</template>
