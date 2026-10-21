<script setup>
// A list of transactions as the current app draws them (txRowT and txItemT in web/js/04-transactions.js): a table on a computer
// (date, name with its labels, from → to, category, tags, amount, attachments) and a list on a phone. Changing a row's category
// saves at once like the old page (setField). Clicking a row emits "open"; a category or tag opens Activity filtered by it.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now, dayOf } from "../core/clock.js";
import { home } from "../core/derived.js";
import { goActivity } from "../core/shell.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { tx } from "../core/heText.js";
import { dcell } from "../dates.js";
import { f0 } from "../format.js";
import { kinds, displayName, duplicateIds } from "../lib/activity.js";
import { txChips, amtText, SYM, CHIP_ICON } from "../lib/txrows.js";
import { setField } from "../lib/txactions.js";

defineProps({ rows: { type: Array, required: true }, empty: { type: String, default: "" } });
const emit = defineEmits(["open"]);
const { t } = useI18n();
const S = computed(() => data.state.value);
const K = computed(() => kinds(S.value, dayOf(now.value)));
const dup = computed(() => duplicateIds(S.value));
const BC = computed(() => home.value?.billsAll || []);
const cats = computed(() => catNames(S.value).filter((k) => k != "Uncategorized"));
const name = (x) => (x.virtual ? tx(displayName(S.value, x)) : displayName(S.value, x));
const av = (x) => { const c = catColor(S.value, x.c || "Uncategorized"); return { background: `color-mix(in srgb,${c} 22%,transparent)`, color: c }; };
const pos = (x) => x.a > 0 && !K.value.isXf(x);
const canCat = (x) => !x.virtual && !K.value.isXf(x) && x.upBill == null;
// setField(id, "c", value) of the current app: the same history line, with its undo
const setCat = (x, v) => data.change((n) => setField(n, x.id, "c", v).lines || false);
</script>

<template>
  <table class="dtab">
    <thead><tr><th>{{ t("activity.th.date") }}</th><th>{{ t("activity.th.desc") }}</th><th>{{ t("activity.th.fromTo") }}</th><th>{{ t("activity.category") }}</th><th>{{ t("activity.th.tags") }}</th><th style="text-align:end">{{ t("activity.th.amount") }}</th><th>{{ t("activity.th.docs") }}</th></tr></thead>
    <tbody>
      <tr v-for="x in rows" :key="x.id" :class="{ fut: K.isFut(x) }">
        <td class="sm num" style="white-space:nowrap">{{ dcell(x.d) }}</td>
        <td class="mer" style="cursor:pointer" @click="emit('open', x)"><div class="mc"><span class="av" :style="av(x)">{{ (name(x) || "?")[0] }}</span><span class="mt" :title="name(x)">{{ name(x) }}</span><span v-for="c in txChips(S, x, { K, dup, BC })" :key="c.cls" class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]" />{{ c.label }}</span></div></td>
        <td class="sm ft" :title="x.from + ' → ' + x.to">{{ x.from }} → {{ x.to }}</td>
        <td><select v-if="canCat(x)" :value="x.c && x.c !== 'Uncategorized' ? x.c : ''" :aria-label="t('activity.category')" @change="setCat(x, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ catLabel(c) }}</option></select><span v-else class="sm">{{ x.c ? catLabel(x.c) : "—" }}</span></td>
        <td><span v-for="g in x.tags || []" :key="g" class="tag catl" @click="goActivity({ tag: g })">{{ tx(g) }}</span></td>
        <td class="am" :class="{ pos: pos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ amtText(x) }}</span><template v-else>{{ amtText(x) }}</template><div v-if="x.orig" class="sm" style="font-weight:400">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }} {{ x.orig.cur }}</div></td>
        <td><button v-if="x.docs && x.docs.length" type="button" class="chip dchip" :aria-label="t('activity.count', { n: x.docs.length }, x.docs.length)" @click="emit('open', x)">📎 {{ x.docs.length }}</button></td>
      </tr>
    </tbody>
  </table>
  <div class="txl card" style="padding:4px 12px">
    <div v-for="x in rows" :key="x.id" class="txi" :class="{ fut: K.isFut(x) }" @click="emit('open', x)"><span class="av" :style="av(x)">{{ (name(x) || "?")[0] }}</span><div style="flex:1;min-width:0"><div class="mer" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ name(x) }}</div><div class="sm"><span class="num">{{ dcell(x.d) }}</span> · <span class="catl" @click.stop="goActivity({ cat: x.c || 'Uncategorized' })">{{ catLabel(x.c) }}</span><template v-if="x.docs && x.docs.length"> · <span class="dchip">📎 {{ x.docs.length }}</span></template></div><div style="margin-top:3px"><template v-for="c in txChips(S, x, { K, dup, BC })" :key="c.cls"><span class="bd pc" :class="c.cls"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]" />{{ c.label }}</span> </template></div></div><div style="text-align:end"><b class="num" :class="{ pos: pos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ amtText(x) }}</span><template v-else>{{ amtText(x) }}</template></b><div v-if="x.orig" class="sm" dir="ltr">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }}</div></div></div>
    <div v-if="!rows.length" class="sm" style="padding:20px;text-align:center">{{ empty }}</div>
  </div>
</template>
