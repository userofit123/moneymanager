<script setup>
// "New category" (case catNew/catSaveQ).
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const n = ref("");
function save() {
  const v = n.value.trim();
  if (!v) { toast(t("qa.catNeed"), { kind: "err" }); return; }
  if (data.state.value?.cats?.[v] != null) { toast(t("qa.catHas"), { kind: "err" }); return; }
  close();
  data.change((S) => { S.cats[v] = Object.keys(S.cats).length % 7; return [["Added category", v]]; });
}
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ t("qa.catT") }}</h3>
    <div class="fld"><label for="qnc">{{ t("qa.name") }}</label><input id="qnc" v-model="n" :placeholder="t('qa.catEx')" @keydown.enter="save"></div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("qa.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("qa.create") }}</button></div>
  </BaseSheet>
</template>
