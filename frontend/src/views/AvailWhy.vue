<script setup>
// "Why this much is free": the window behind Home's "Full breakdown →" (openAvail in the current app). A copy of the one on the Jars page.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseButton from "../components/BaseButton.vue";
import BaseDialog from "../components/BaseDialog.vue";
import { billLists, isAll } from "./jars.js";
import { formatMoney } from "../format.js";

const props = defineProps({ open: Boolean, M: { type: Object, required: true } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const fm = (v) => formatMoney(Math.round(v));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const F = computed(() => props.M.flow);
const avail = computed(() => {
  const R = F.value.R, bl = billLists(props.M), rb = R.rows.filter((r) => r.kind == "bill"), ro = R.rows.filter((r) => r.kind != "bill");
  const active = (props.M.S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p);
  return { bills: sum(rb.map((r) => r.amt)), limits: sum(ro.map((r) => r.amt)), billRows: rb, otherRows: ro.map((r) => ({ ...r, bl: sum((r.bills || []).map((x) => x.amt)) })),
    covered: active.filter((j) => j.bill).map((j) => ({ jar: j.n, bills: isAll(j.bill) ? bl.all(j.bill) : bl.rec.filter((b) => b.match == j.bill) })).filter((x) => x.bills.length) };
});
const over = computed(() => F.value.over), free = computed(() => F.value.free);
</script>

<template>
        <BaseDialog :open="open" @update:open="(v) => emit('update:open', v)" :title="t('jars.safe')">
          <div class="av">
            <div class="sm avi">{{ t("jars.av.intro") }}</div>
            <div class="inf">
              <div class="chn"><span>{{ t("jars.av.cash") }}</span><b class="num">{{ fm(F.cash) }}</b></div>
              <div class="chn"><span>{{ t("jars.av.inJars") }}</span><b class="num">{{ fm(-F.inJars) }}</b></div>
              <div v-if="F.buffer" class="chn"><span>{{ t("jars.keep") }}</span><b class="num">{{ fm(-F.buffer) }}</b></div>
              <div v-if="avail.bills" class="chn"><span>{{ t("jars.av.bills") }}</span><b class="num">{{ fm(-avail.bills) }}</b></div>
              <div v-if="avail.limits" class="chn"><span>{{ t("jars.av.planned") }}</span><b class="num">{{ fm(-avail.limits) }}</b></div>
              <div class="chn tot"><span>{{ t("jars.av.free") }}</span><b class="num">{{ fm(F.free) }}</b></div>
              <div v-if="F.over > 0" class="sm avs">{{ t("jars.av.short", { amount: fm(F.over) }) }}</div>
            </div>
            <template v-if="avail.billRows.length">
              <div class="lbl avh">{{ t("jars.av.bills") }} · {{ fm(avail.bills) }}</div>
              <div class="inf"><div v-for="r in avail.billRows" :key="r.k" class="chn top"><span><span>{{ r.k }}</span><div class="sm">{{ r.bills.length > 1 ? t("jars.av.nBills", { n: r.bills.length }) : t("jars.av.bill") }}</div><div v-if="r.bills.length" class="sm">{{ r.bills.map((x) => x.n + (x.overdue ? " " + t("jars.av.overdue") : "") + " " + fm(x.amt)).join(" · ") }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
            </template>
            <template v-if="avail.otherRows.length">
              <div class="lbl avh">{{ t("jars.av.planned") }} · {{ fm(avail.limits) }}</div>
              <div class="sm avn">{{ t("jars.av.plannedNote") }}</div>
              <div class="inf"><div v-for="r in avail.otherRows" :key="r.k" class="chn top"><span><span>{{ r.k }}</span><div class="sm">{{ r.kind == "budget" ? t("jars.av.budget", { spent: fm(r.spent), base: fm(r.base) }) : t("jars.av.typical", { spent: fm(r.spent), base: fm(r.base) }) }}</div><div v-if="r.bl > 0" class="sm">{{ t("jars.av.includes", { amount: fm(r.bl), names: r.bills.map((x) => x.n).join(", ") }) }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
            </template>
            <template v-if="avail.covered.length">
              <div class="lbl avh">{{ t("jars.av.covered") }}</div>
              <div class="inf"><div v-for="c in avail.covered" :key="c.jar" class="chn top"><span><b>{{ c.jar }}</b><div class="sm">{{ c.bills.map((b) => b.n + " " + t("jars.av.mo", { amount: fm(b.mo) })).join(" · ") }}</div></span><b class="num">{{ t("jars.av.mo", { amount: fm(c.bills.reduce((x, b) => x + b.mo, 0)) }) }}</b></div></div>
            </template>
            <div v-if="!avail.billRows.length && !avail.otherRows.length" class="inf"><div>{{ t("jars.av.nothing") }}</div></div>
            <div class="sm how"><b>{{ t("jars.av.howTitle") }}</b><ul><li>{{ t("jars.av.how1") }}</li><li>{{ t("jars.av.how2") }}</li><li>{{ t("jars.av.how3") }}</li><li>{{ t("jars.av.how4") }}</li></ul></div>
          </div>
          <template #actions><BaseButton @click="emit('update:open', false)">{{ t("jars.av.done") }}</BaseButton></template>
        </BaseDialog>
</template>

<style scoped>
.av { color: var(--tx); }
.avi { margin-bottom: 12px; }
.inf { background: var(--s1); border: 1px solid var(--ol); border-radius: 14px; padding: 12px 14px; margin: 0 0 12px; font-size: 13px; line-height: 1.45; color: var(--tx2); }
.chn { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 14px; border-top: 1px solid var(--ol); color: var(--tx); }
.chn:first-child { border-top: 0; }
.chn.top { align-items: flex-start; }
.chn .sm { margin-top: 2px; }
.chn.tot { font-weight: 700; border-top: 2px solid var(--ol); }
.avs { padding: 8px 2px 0; color: var(--neg); }
.avh { margin: 0 0 4px; }
.avn { margin: 0 0 6px; }
.how { line-height: 1.5; }
.how ul { margin: 6px 0 0; padding-inline-start: 18px; }
</style>
