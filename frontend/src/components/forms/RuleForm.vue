<script setup>
// "New category rule" (case ruleNew/ruleSaveQ): when a description contains some text, it gets a category. It never overrides a category set by hand.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { catNames, catLabel } from "../../core/cats.js";
import { toast } from "../../core/toast.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const props = defineProps({ k: { type: String, default: "" }, c: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const cats = computed(() => catNames(data.state.value));
const k = ref(props.k), c = ref(props.c || cats.value[0] || "");
function save() {
  const kw = k.value.trim();
  if (!kw) { toast(t("qa.ruleNeed"), { kind: "err" }); return; }
  close();
  data.change((S) => { S.rules.push({ k: kw, c: c.value, t: "" }); return [["Added rule", `"${kw}" → ${c.value}`]]; });
}
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ t("qa.ruleT") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ t("qa.ruleI") }}</div>
    <div class="fld"><label for="qrk">{{ t("qa.ruleIf") }}</label><input id="qrk" v-model="k" :placeholder="t('qa.ruleEx')" @keydown.enter="save"></div>
    <div class="fld"><label for="qrc">{{ t("qa.cat") }}</label><select id="qrc" v-model="c"><option v-for="x in cats" :key="x" :value="x">{{ catLabel(x) }}</option></select></div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("qa.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("qa.save") }}</button></div>
  </BaseSheet>
</template>
