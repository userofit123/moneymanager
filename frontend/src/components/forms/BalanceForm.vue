<script setup>
// "Update balance" of an account you keep yourself:
// the new balance and a note. The server keeps the old balance in the account's history. id: the account.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { sendJson } from "../../core/http.js";
import { fm, fmCur } from "../../format.js";
import { inILS } from "../../lib/home.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const props = defineProps({ id: { type: Number, required: true } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const a = computed(() => (data.state.value?.accounts || []).find((x) => x.id == props.id));
// Its balance now: in shekels with the last saved rate; with none ever, in its own currency and "not counted yet" (never ₪0);
// the amount is kept left to right as one piece, so Hebrew shows "USD 400", not "400 USD".
const nowText = computed(() => { const ils = inILS(a.value, data.fx.value.fx); return ils == null ? "\u2066" + fmCur(a.value.v, a.value.cur) + "\u2069 · " + t("tip.noRate") : fm(ils); });
const v = ref(a.value ? a.value.v : ""), note = ref(""), inp = ref(null);
onMounted(() => { if (!a.value) { emit("close"); return; } setTimeout(() => { inp.value?.focus(); inp.value?.select(); }, 80); });
async function save() {
  try { await data.api("/api/accounts/" + props.id + "/balance", sendJson("POST", { balance: String(v.value), note: note.value })); await data.load(); close(); toast(t("acc.f.balDone")); }
  catch (e) { toast(tx(e.message), { kind: "err" }); }
}
</script>

<template>
  <BaseSheet :open="open && !!a" @close="close">
    <template v-if="a">
      <h3>{{ t("acc.f.balT") }}</h3>
      <div class="sm" style="margin-bottom:14px">{{ t("acc.f.balX", { name: a.n, amount: nowText }) }}</div>
      <div class="fld"><label for="abV">{{ t("acc.f.newBal", { cur: a.cur }) }}</label><input id="abV" ref="inp" v-model="v" type="number" inputmode="decimal" step="any" autocomplete="off" @keydown.enter="save"></div>
      <div class="fld"><label for="abN">{{ t("acc.f.note") }}</label><input id="abN" v-model="note" maxlength="200" :placeholder="t('acc.f.noteEx')" autocomplete="off"></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("acc.f.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("acc.f.save") }}</button></div>
    </template>
  </BaseSheet>
</template>
