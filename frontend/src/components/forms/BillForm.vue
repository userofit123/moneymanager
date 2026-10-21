<script setup>
// "Add a bill by hand" (billForm in web/js/04-transactions.js): name, amount, how often, day of the month, paid from, matching text.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { now } from "../../core/clock.js";
import { addBill } from "../../lib/bills.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const S = computed(() => data.state.value);
// The accounts a bill can be paid from, with a card's last digits ("Max ·· 1234").
const srcList = computed(() => {
  const A = S.value?.accounts || [], L = [...new Set(A.filter((a) => !a.hide && ["bank", "card", "wallet"].includes(a.kind)).map((a) => a.n))], src = L.length ? L : ["Bank Hapoalim", "Max", "Isracard", "Wise"];
  return src.map((x) => { const ac = A.find((a) => a.n == x); return { v: x, label: x + (ac && ac.kind == "card" && ac.tail && !/··/.test(x) ? " ⁦·· " + ac.tail + "⁩" : "") }; });
});
const f = ref({ n: "", amt: "", every: "1", dom: 1, src: srcList.value[0]?.v || "", match: "" });
function save() {
  const x = f.value; if (!x.n.trim() || !+x.amt) return;
  close();
  data.change((n) => addBill(n, x, now.value));
}
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ t("bills.add.title") }}</h3>
    <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("bills.add.i1") }}<br>{{ t("bills.add.i2") }}<br>{{ t("bills.add.i3") }}</div>
    <div class="fld"><label for="bN">{{ t("bills.add.name") }}</label><input id="bN" v-model="f.n" :placeholder="t('bills.add.nameEx')"></div>
    <div class="two"><div class="fld"><label for="bA">{{ t("bills.add.amount") }}</label><input id="bA" v-model="f.amt" type="number" inputmode="decimal"></div><div class="fld"><label for="bE">{{ t("bills.add.often") }}</label><select id="bE" v-model="f.every"><option value="1">{{ t("bills.cad.1") }}</option><option value="2">{{ t("bills.cad.2") }}</option><option value="12">{{ t("bills.cad.12") }}</option><option value="0">{{ t("bills.add.opt0") }}</option></select></div></div>
    <div class="two"><div class="fld"><label for="bD">{{ t("bills.add.day") }}</label><input id="bD" v-model="f.dom" type="number" inputmode="numeric" min="1" max="28"></div><div class="fld"><label for="bS">{{ t("bills.add.from") }}</label><select id="bS" v-model="f.src"><option v-for="o in srcList" :key="o.v" :value="o.v">{{ o.label }}</option></select></div></div>
    <div class="fld"><label for="bM">{{ t("bills.add.match") }}</label><input id="bM" v-model="f.match" :placeholder="t('bills.add.matchEx')"></div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("bills.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("bills.save") }}</button></div>
  </BaseSheet>
</template>
