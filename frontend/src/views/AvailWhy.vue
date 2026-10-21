<script setup>
// "Safe to put in jars": how the free money is worked out (openAvail in web/js/04-transactions.js). Opened from the Jars page
// ("How is this worked out?") and from Home ("Full breakdown →"). M: the home model (views/home.js). A category name opens Activity
// showing only that category (goCat).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseSheet from "../components/BaseSheet.vue";
import { billLists, isAll } from "./jars.js";
import { fm } from "../format.js";
import { catLabel } from "../core/cats.js";
import { goActivity } from "../core/shell.js";

const props = defineProps({ open: Boolean, M: { type: Object, required: true } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const sum = (a) => a.reduce((x, y) => x + y, 0);
const F = computed(() => props.M.flow);
const avail = computed(() => {
  const R = F.value.R, bl = billLists(props.M), rb = R.rows.filter((r) => r.kind == "bill"), ro = R.rows.filter((r) => r.kind != "bill");
  const active = (props.M.S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p);
  return { bills: sum(rb.map((r) => r.amt)), limits: sum(ro.map((r) => r.amt)), billRows: rb, otherRows: ro.map((r) => ({ ...r, bl: sum((r.bills || []).map((x) => x.amt)) })), any: R.rows.length > 0,
    covered: active.filter((j) => j.bill).map((j) => ({ jar: j.n, bills: isAll(j.bill) ? bl.all(j.bill) : bl.rec.filter((b) => b.match == j.bill) })).filter((x) => x.bills.length) };
});
const close = () => emit("update:open", false);
const goCat = (k) => { close(); goActivity({ cat: k }); };
</script>

<template>
  <BaseSheet :open="open" :label="t('jars.safe')" @close="close">
    <h3>{{ t("jars.safe") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ t("jars.av.intro") }}</div>
    <div class="inf" style="margin-bottom:14px"><div class="chl" style="margin:0">
      <div class="chn"><span>{{ t("jars.av.cash") }}</span><b class="num">{{ fm(F.cash) }}</b></div>
      <div class="chn"><span>{{ t("jars.av.inJars") }}</span><b class="num">{{ fm(-F.inJars) }}</b></div>
      <div v-if="F.buffer" class="chn"><span>{{ t("jars.keep") }}</span><b class="num">{{ fm(-F.buffer) }}</b></div>
      <div v-if="avail.bills" class="chn"><span>{{ t("jars.av.bills") }}</span><b class="num">{{ fm(-avail.bills) }}</b></div>
      <div v-if="avail.limits" class="chn"><span>{{ t("jars.av.planned") }}</span><b class="num">{{ fm(-avail.limits) }}</b></div>
      <div class="chn tot"><span>{{ t("jars.av.free") }}</span><b class="num">{{ fm(F.free) }}</b></div>
      <div v-if="F.over > 0" class="sm" style="padding:8px 2px 0;color:var(--neg)">{{ t("jars.av.short", { amount: fm(F.over) }) }}</div>
    </div></div>
    <template v-if="avail.billRows.length">
      <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.bills") }} · {{ fm(avail.bills) }}</div>
      <div class="inf" style="margin-bottom:12px"><div v-for="r in avail.billRows" :key="r.k" class="chn" style="align-items:flex-start"><span><span class="catl" data-a="goCat" @click="goCat(r.k)">{{ catLabel(r.k) }}</span><div class="sm" style="margin-top:2px">{{ r.bills.length > 1 ? t("jars.av.nBills", { n: r.bills.length }) : t("jars.av.bill") }}</div><div v-if="r.bills.length" class="sm" style="margin-top:2px">{{ r.bills.map((x) => x.n + (x.overdue ? " " + t("jars.av.overdue") : "") + " " + fm(x.amt)).join(" · ") }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
    </template>
    <template v-if="avail.otherRows.length">
      <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.planned") }} · {{ fm(avail.limits) }}</div>
      <div class="sm" style="margin:0 0 6px">{{ t("jars.av.plannedNote") }}</div>
      <div class="inf" style="margin-bottom:12px"><div v-for="r in avail.otherRows" :key="r.k" class="chn" style="align-items:flex-start"><span><span class="catl" data-a="goCat" @click="goCat(r.k)">{{ catLabel(r.k) }}</span><div class="sm" style="margin-top:2px">{{ r.kind == "budget" ? t("jars.av.budget", { spent: fm(r.spent), base: fm(r.base) }) : t("jars.av.typical", { spent: fm(r.spent), base: fm(r.base) }) }}</div><div v-if="r.bl > 0" class="sm" style="margin-top:2px">{{ t("jars.av.includes", { amount: fm(r.bl), names: r.bills.map((x) => x.n).join(", ") }) }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
    </template>
    <template v-if="avail.covered.length">
      <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.covered") }}</div>
      <div class="inf" style="margin-bottom:12px"><div v-for="c in avail.covered" :key="c.jar" class="chn" style="align-items:flex-start"><span><b>{{ c.jar }}</b><div class="sm" style="margin-top:2px">{{ c.bills.map((b) => b.n + " " + t("jars.av.mo", { amount: fm(b.mo) })).join(" · ") }}</div></span><b class="num">{{ t("jars.av.mo", { amount: fm(c.bills.reduce((x, b) => x + b.mo, 0)) }) }}</b></div></div>
    </template>
    <div v-if="!avail.any" class="inf" style="margin-bottom:12px"><div class="it">{{ t("jars.av.nothing") }}</div></div>
    <div class="sm" style="line-height:1.5"><b>{{ t("jars.av.howTitle") }}</b><ul class="blist"><li>{{ t("jars.av.how1") }}</li><li>{{ t("jars.av.how2") }}</li><li>{{ t("jars.av.how3") }}</li><li>{{ t("jars.av.how4") }}</li></ul></div>
    <div class="flex" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn" data-a="close" @click="close">{{ t("jars.av.done") }}</button></div>
  </BaseSheet>
</template>
