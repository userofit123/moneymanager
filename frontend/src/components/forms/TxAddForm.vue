<script setup>
// "Add transaction" (openAdd/addSave in web/js/04-transactions.js), also "Explain missing money" for a balance gap
// (gap: { acc, cur, amt, date }; plain: the plain title even with an account given). photo: open the file picker at once (Receipt photo).
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { now, dayOf } from "../../core/clock.js";
import { getJson } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { catNames, catLabel } from "../../core/cats.js";
import { rn, ruleTags } from "../../views/activity.js";
import { fm } from "../../lib/bills.js";
import { currencySymbol } from "../../format.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";
import MoneyInput from "../MoneyInput.vue";

const props = defineProps({ gap: { type: Object, default: null }, plain: Boolean, photo: Boolean });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const S = computed(() => data.state.value);
const g = props.gap;
const f = ref({ desc: "", amt: g && !props.plain ? Math.abs(g.amt) : "", type: g && g.amt > 0 ? "1" : "-1", date: (g && g.date) || dayOf(now.value), acc: g ? g.acc + "|" + g.cur : ((S.value?.accounts || []).find((a) => !a.hide)?.n || "Cash") + "|" + ((S.value?.accounts || []).find((a) => !a.hide)?.cur || "ILS"), cat: "", bal: true });
const accs = computed(() => (S.value?.accounts || []).filter((a) => !a.hide));
const pick = computed(() => { const [n, c] = f.value.acc.split("|"); return { n, c, ac: (S.value?.accounts || []).find((x) => x.n == n && x.cur == c) }; });
const cats = computed(() => catNames(S.value).filter((k) => k != "Uncategorized"));
const file = ref(null);
onMounted(() => { if (props.photo) setTimeout(() => file.value?.click(), 80); });
// The tags of every tag rule that matches the description (tagsFor).
const tagsFor = (S, desc) => { const l = rn(desc), o = []; (S.tagRules || []).forEach((r) => { if (r.k && rn(r.k) && l.includes(rn(r.k))) ruleTags(r).forEach((x) => { if (!o.includes(x)) o.push(x); }); }); return o; };

async function save() {
  const x = f.value, d = x.desc.trim(), a = +x.amt;
  if (!d || !a) return;
  const sg = +x.type, { n: acc, c: cur } = pick.value, date = x.date || dayOf(now.value), fl = file.value?.files?.[0];
  let rate = 1;
  if (cur != "ILS") { try { rate = (await getJson(`/api/fx/rate?cur=${cur}&date=${date}`)).rate || data.fx.value.fx[cur] || 1; } catch { rate = data.fx.value.fx[cur] || 1; } }
  const amt = +(sg * Math.abs(a) * rate).toFixed(2);
  let id = 0;
  close();
  data.change((S) => {
    id = Math.max(0, ...S.tx.map((t) => +t.id || 0)) + 1;
    S.tx.unshift({ id, d: date, desc: d, from: sg < 0 ? acc : d, to: sg < 0 ? d : acc, a: amt, ...(cur != "ILS" ? { orig: { cur, amt: +(sg * Math.abs(a)).toFixed(2) } } : {}), c: sg > 0 ? (S.cats["Income"] !== undefined ? "Income" : "") : x.cat, tags: tagsFor(S, d), docs: [], docIds: [], note: "" });
    const ac = S.accounts.find((y) => y.n == acc && y.cur == cur);
    if (ac && ac.custom && x.bal) ac.v = +(ac.v + sg * Math.abs(a)).toFixed(2);
    return [["Added transaction", d + " · " + fm(amt)]];
  });
  if (fl) {
    try {
      const u = await data.api(`/api/transactions/${id}/documents`, { method: "POST", headers: { "x-filename": encodeURIComponent(fl.name), "content-type": fl.type || "application/octet-stream" }, body: fl });
      data.change((S) => { const tx = S.tx.find((y) => y.id == id); if (!tx) return false; tx.docs.push(u.filename); tx.docIds.push(u.id); (tx.docHas = tx.docHas || []).push(true); return []; });
    } catch { toast(t("qa.upFail"), { kind: "err" }); }
  }
  // the server checks the gap again once the new entry is saved
  if (g) { await data.flushNow(); try { await data.load(); } catch { /* shown on the next load */ } }
}
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <h3>{{ g && !plain ? t("qa.explainT") : t("qa.addT") }}</h3>
    <div class="fld"><label for="nDesc">{{ t("qa.desc") }}</label><input id="nDesc" v-model="f.desc" :placeholder="t('qa.descEx')"></div>
    <div class="two">
      <div class="fld"><label for="nAmt">{{ t("qa.amount") }} <span>({{ currencySymbol(pick.c) }})</span></label><MoneyInput id="nAmt" v-model="f.amt" placeholder="0" /></div>
      <div class="fld"><label for="nType">{{ t("qa.type") }}</label><select id="nType" v-model="f.type"><option value="-1">{{ t("qa.exp") }}</option><option value="1">{{ t("qa.inc") }}</option></select></div>
    </div>
    <div class="two">
      <div class="fld"><label for="nDate">{{ t("qa.date") }}</label><input id="nDate" v-model="f.date" type="date"></div>
      <div class="fld"><label for="nAcc">{{ t("qa.account") }}</label><select id="nAcc" v-model="f.acc"><option v-for="a in accs" :key="a.n + '|' + a.cur" :value="a.n + '|' + a.cur">{{ a.n }}{{ a.cur != "ILS" ? " (" + a.cur + ")" : "" }}</option><option value="Cash|ILS">{{ t("qa.cash") }}</option></select></div>
    </div>
    <label v-if="pick.ac && pick.ac.custom" class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:-4px 0 12px;font-size:13px"><input v-model="f.bal" type="checkbox" style="margin-top:2px"><span>{{ t("qa.alsoBal") }}<br><span class="sm">{{ t("qa.alsoBalS") }}</span></span></label>
    <div class="fld"><label for="nCat">{{ t("qa.cat") }}</label><select id="nCat" v-model="f.cat"><option value="">{{ t("qa.catAuto") }}</option><option v-for="k in cats" :key="k" :value="k">{{ catLabel(k) }}</option></select></div>
    <div class="fld"><label for="nFile">{{ t("qa.receipt") }}</label><input id="nFile" ref="file" type="file" accept="image/*,application/pdf" capture="environment"></div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("qa.cancel") }}</button><button type="button" class="btn" @click="save">{{ t("qa.save") }}</button></div>
  </BaseSheet>
</template>
