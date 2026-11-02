<script setup>
// Bills (tab): payments that repeat. It opens with one sentence (what the bills come to in a month), then what is due in the
// next 14 days and the price changes (two tiles), the bills by kind (regular, irregular, instalments, one-off) and the canceled ones.
// Every number comes from pagelogic/bills.js, the same as the computer's Bills page. A bill opens its own screen
// (/bills?bill=<billKey>: a bill is found by what it is, not by its place in the list). + adds a bill.
import { ref, computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
import { dstr, dshort } from "../../dates.js";
import { pages } from "../../routes.js";
import { billKey, fm } from "../../lib/bills.js";
import { useBills } from "../../pagelogic/bills.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import StatTile from "../components/StatTile.vue";
import Segmented from "../components/Segmented.vue";
import ListRow from "../components/ListRow.vue";
import ProgressBar from "../components/ProgressBar.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const { t, tk, S, M, kpis, groups, freq, avStyle, cc, monYr, priceChange, openAdd, makeRegular, keepIrregular } = useBills();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.bills." + k, o || {}, n);
const dayMonth = (d) => { const x = new Date(d); return dshort(x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0")); }; // "12/11": the next and the missed charge are within weeks of today, so the year is left out
const iso = (s) => "⁦" + s + "⁩"; // a date keeps its order inside a Hebrew sentence
const BILL_ICON = pages.find((p) => p.name === "bills").icon;

// the sentence at the top: the monthly total (the same number as "Monthly total" on the computer)
const hero = computed(() => {
  const [a, b = ""] = P("hero", { amount: "\u0000" }).split("\u0000");
  return [{ text: a }, { amount: fm(M.value.mo) }, { text: b }];
});

// the kinds of bills, one at a time
const kind = ref("rec");
const kindOpts = computed(() => groups.value.map((g) => ({ value: g.k, label: tk("bills.g." + g.k + ".title") + " " + g.L.length })));
watch(groups, (G) => { if (G.length && !G.some((g) => g.k === kind.value)) kind.value = G[0].k; }, { immediate: true });
const shown = computed(() => groups.value.find((g) => g.k === kind.value) || groups.value[0]);

const open = (b) => nav.push("bill", billKey(b));
const name = (b) => tx(b.n);
const dueText = (b) => (b.status == "overdue" ? t("bills.overdue", { date: iso(dayMonth(b.pd)) }) : b.status == "pending" ? t("bills.dueNow") : b.days <= 7 ? t("bills.dueIn", { n: b.days }, b.days) : P("dueOn", { date: iso(dayMonth(b.nx)) }));
const dueCls = (b) => (b.status == "overdue" ? "late" : b.status == "pending" ? "now" : b.days <= 7 ? "soon" : "");

// the small windows: how the total is worked out, what is due soon, the price changes
const sheet = ref(""); // "how" | "soon" | "changes"
const sheetOpen = computed({ get: () => !!sheet.value, set: (v) => { if (!v) sheet.value = ""; } });
const fromSheet = (b) => { sheet.value = ""; open(b); };
const showCanceled = ref(false);
// due soon, the nearest first (as in the Regular list)
const soonSorted = computed(() => M.value.rec.filter((b) => M.value.soon.includes(b)));
</script>

<template>
  <PhoneScreen class="ph-bills">
    <template #actions>
      <IconButton :label="P('add')" icon-name="add" @tap="openAdd" />
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('bills.loadError')" />
    <SkeletonRows v-else-if="!S || !M" :rows="5" />

    <template v-else>
      <EmptyState v-if="!groups.length" :icon="BILL_ICON" :title="P('emptyTitle')" :text="t('bills.emptyA') + '“' + t('bills.emptyB') + '”' + t('bills.emptyC')" :action="P('add')" @action="openAdd" />

      <template v-else>
        <HeroSentence :parts="hero" :link="P('how')" @link="sheet = 'how'" />

        <!-- two numbers, each opening its list: short names and one short line each, so both tiles are the same height -->
        <div class="ph-stats">
          <StatTile :label="P('soonLabel')" :value="fm(kpis[1].v)" :note="M.soon.length ? P('soonN', { n: M.soon.length }, M.soon.length) : P('nothingSoon')" @tap="sheet = 'soon'" />
          <StatTile :label="P('changesLabel')" :value="fm(kpis[2].v)" :note="M.ch.length ? P('billsN', { n: M.ch.length }, M.ch.length) : P('noChanges')" @tap="sheet = 'changes'" />
        </div>

        <section class="ph-group ph-bills-kinds">
          <Segmented v-if="groups.length > 1" v-model="kind" :options="kindOpts" :label="P('kinds')" />
          <div class="ph-group-h"><h3>{{ tk("bills.g." + shown.k + ".title") }}</h3><span class="ph-bills-tot"><b>{{ fm(shown.total) }}</b> {{ tk("bills.g." + shown.k + ".unit") }}</span></div>
          <div class="ph-group-b">
            <!-- regular: how often and when it is next charged -->
            <template v-if="shown.k == 'rec'">
              <ListRow v-for="b in shown.L" :key="b.idx" :title="name(b)" link @tap="open(b)">
                <template #lead><span class="ph-bills-av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span></template>
                <template #title><span v-if="b.flag" class="ph-bills-flag">{{ t("bills.markedCancel") }}</span></template>
                <template #sub><span :class="dueCls(b)">{{ dueText(b) }}</span><span v-if="b.every != 1">{{ freq(b.every) }}</span></template>
                <template #end>
                  <span class="ph-bills-end"><span class="ph-amt" dir="ltr">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</span><small v-if="priceChange(b)" dir="ltr" :class="priceChange(b) > 0 ? 'up' : 'dn'">{{ (priceChange(b) > 0 ? "+" : "−") + fm(Math.abs(priceChange(b))) }}</small></span>
                </template>
              </ListRow>
            </template>
            <!-- irregular: the usual payment and the monthly average; a suggestion when it now looks regular -->
            <template v-else-if="shown.k == 'irr'">
              <template v-for="b in shown.L" :key="b.idx">
                <ListRow :title="name(b)" :sub="t('bills.perMonthAvg', { amount: fm(b.mo) })" link @tap="open(b)">
                  <template #lead><span class="ph-bills-av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span></template>
                  <template #title><span v-if="b.flag" class="ph-bills-flag">{{ t("bills.markedCancel") }}</span></template>
                  <template #end><span class="ph-amt" dir="ltr">≈ {{ fm(b.pred) }}</span></template>
                </ListRow>
                <div v-if="b.sug" class="ph-bills-sug">
                  <p>{{ t("bills.sug", { freq: freq(b.sug) }) }}</p>
                  <div class="ph-bills-btns"><button type="button" class="ph-btn plain" @click="makeRegular(b)">{{ t("bills.makeReg") }}</button><button type="button" class="ph-btn plain" @click="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
                </div>
              </template>
            </template>
            <!-- instalments: how many are paid and left; opens the last payment -->
            <template v-else-if="shown.k == 'ins'">
              <button v-for="x in shown.L" :key="x.last.id" type="button" class="ph-row ph-bills-ins" @click="nav.push('transaction', String(x.last.id))">
                <span class="ph-row-lead"><span class="ph-bills-av" :style="{ background: `color-mix(in srgb,${cc(x.last.c || 'Uncategorized')} 22%,transparent)`, color: cc(x.last.c || 'Uncategorized') }">{{ (x.name || "?")[0] }}</span></span>
                <span class="ph-row-main">
                  <span class="ph-bills-insh"><span class="ph-row-t">{{ x.name }}</span><span class="ph-amt" dir="ltr">{{ fm(x.amt) }}</span></span>
                  <span class="ph-row-s"><span>{{ t("bills.instA", { paid: x.paid, total: x.total }) }}</span><b>{{ t("bills.instLeft", { n: x.left }) }}</b></span>
                  <ProgressBar :value="x.paid" :max="x.total" :label="x.name" />
                  <span class="ph-row-s"><span>{{ t("bills.instRemain", { amount: fm(x.remain) }) }}</span><span>{{ t("bills.instLast", { when: monYr(x.last.d, x.left) }) }}</span></span>
                </span>
                <PIcon class="ph-chev" name="chevron" dir />
              </button>
            </template>
            <!-- one-off: when it was paid -->
            <template v-else>
              <ListRow v-for="b in shown.L" :key="b.idx" :title="name(b)" :sub="b.lp ? t('bills.paidOn', { date: iso(dstr(b.lp)) }) : t('bills.noPayFound')" link @tap="open(b)">
                <template #lead><span class="ph-bills-av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span></template>
                <template #end><span class="ph-amt" dir="ltr">{{ fm(b.amt) }}</span></template>
              </ListRow>
            </template>
          </div>
          <p class="ph-group-n">{{ tk("bills.g." + shown.k + ".desc") }}</p>
        </section>

        <section v-if="M.canceled.length" class="ph-group">
          <button type="button" class="ph-bills-fold" :aria-expanded="String(showCanceled)" @click="showCanceled = !showCanceled">
            <h3>{{ P("canceled", { n: M.canceled.length }) }}</h3><PIcon name="chevron" class="ph-bills-chev" :class="{ on: showCanceled }" />
          </button>
          <div v-if="showCanceled" class="ph-group-b">
            <ListRow v-for="b in M.canceled" :key="b.idx" class="ph-bills-off" :title="name(b)" :sub="b.canceledAt ? P('canceledNote', { date: iso(dstr(b.canceledAt)) }) : t('bills.canceled')" link @tap="open(b)">
              <template #lead><span class="ph-bills-av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span></template>
              <template #end><span class="ph-amt" dir="ltr">{{ fm(b.amt) }}</span></template>
            </ListRow>
          </div>
          <p v-if="showCanceled" class="ph-group-n">{{ t("bills.notCounted") }}</p>
        </section>
      </template>
    </template>

    <PhoneSheet v-if="M" v-model:open="sheetOpen" :title="sheet === 'how' ? P('howTitle') : sheet === 'soon' ? kpis[1].l : kpis[2].l">
      <div v-if="sheet === 'how'" class="ph-bills-how">
        <p class="ph-bills-big">{{ fm(M.mo) }}</p>
        <p>{{ kpis[0].s }}</p>
      </div>
      <template v-else>
        <p class="ph-bills-how">{{ sheet === "soon" ? (M.soon.length ? kpis[1].s : P("soonNone")) : M.ch.length ? kpis[2].s : P("changesNone") }}</p>
        <div v-if="(sheet === 'soon' ? soonSorted : M.ch).length" class="ph-group-b">
          <ListRow v-for="b in sheet === 'soon' ? soonSorted : M.ch" :key="b.idx" class="ph-bills-srow" :title="name(b)" :sub="sheet === 'soon' ? dueText(b) : priceChange(b) > 0 ? P('priceUp', { amount: fm(priceChange(b)) }) : P('priceDown', { amount: fm(-priceChange(b)) })" link @tap="fromSheet(b)">
            <template #lead><span class="ph-bills-av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span></template>
            <template #end><span class="ph-amt" dir="ltr">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</span></template>
          </ListRow>
        </div>
      </template>
    </PhoneSheet>
  </PhoneScreen>
</template>
