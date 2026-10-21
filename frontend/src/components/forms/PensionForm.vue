<script setup>
// "Update pension balance" (case pensionSet/pensionSave): typed by hand when money is moved into it.
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { fm } from "../../lib/bills.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const acc = computed(() => (data.state.value?.accounts || []).find((x) => x.kind == "pension"));
const v = ref(acc.value?.v || "");
const inp = ref(null);
onMounted(() => { if (!acc.value) { toast(t("qa.penNone"), { kind: "err" }); emit("close"); return; } nextTick(() => { inp.value?.focus(); inp.value?.select(); }); });
function save() {
  const a = acc.value, n = parseFloat(String(v.value).replace(/[,\s₪]/g, ""));
  if (!a) return;
  if (!isFinite(n) || n < 0) { toast(t("qa.penNum"), { kind: "err" }); return; }
  close();
  if (n === a.v) { toast(t("qa.penSame"), { kind: "err" }); return; }
  data.change((S) => { const x = S.accounts.find((y) => y.kind == "pension"); const was = x.v; x.v = n; return [["Updated pension", fm(was) + " → " + fm(n)]]; });
}
</script>

<template>
  <BaseSheet :open="open && !!acc" @close="close">
    <h3>{{ t("qa.penT") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ t("qa.penI") }}</div>
    <div class="fld"><label for="pnV">{{ t("qa.penV") }}</label><input id="pnV" ref="inp" v-model="v" type="text" inputmode="decimal" :placeholder="t('qa.penEx')" @keydown.enter="save"></div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("qa.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("qa.save") }}</button></div>
  </BaseSheet>
</template>
