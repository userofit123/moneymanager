<script setup>
// One report or payment (pushed on Taxes and reports, /taxes?report=<item id>~<date>): the computer's report for a phone.
// The top: the paper tile, the name, the months of money it counts and the last day (Moved explains on a tap), then
// "Which report" when the item has more than one date (picked from a list), Download everything, the three
// amount cards (money in, money out, the amount, highlighted), the zero-report note, the missing papers with Attach a
// file, Sent or paid, and the transactions. The ⋯ in the top bar is the computer's ⋯ menu (change, move this one date,
// delete). Everything it knows and does comes from pagelogic/taxes.js, the same as the computer.
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { openForm } from "../../core/forms.js";
import { explain } from "../../core/tooltip.js";
import { catLabel } from "../../core/cats.js";
import { displayName } from "../../lib/activity.js";
import { f0 } from "../../lib/bills.js";
import { useTaxes } from "../../pagelogic/taxes.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import AmountCard from "../components/AmountCard.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import MoneyInput from "../../components/MoneyInput.vue";
import "../../styles/pages/taxes.css"; // the computer's done tick and date dots

const props = defineProps({ id: { type: String, default: null } });
const {
  t, S, nameOf, span, lastText, isLate, whyQuiet, fm, fmAbs, dstr, dd,
  menu, menuItems, MI, pick, moveFor, saveMove, open, cur, curAmt, needsPapers, pickPeriod, stateOf, doneF, markDone, unmarkDone, txRows, attach, zipping, downloadZip, ICON,
} = useTaxes();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.taxes." + k, o || {}, n);

// the item and date this screen shows, from its address
watch(() => props.id, (v) => { const s = String(v || ""), i = s.indexOf("~"); open.value = s ? { id: i < 0 ? s : s.slice(0, i), key: i < 0 ? "" : s.slice(i + 1) } : null; }, { immediate: true });
// deleted while open: back to the list
watch(cur, (x, was) => { if (!x && was) nav.back(); });
const edit = () => openForm("tax", { id: cur.value.item.id });

// "Which report": every date of the item, the chosen one checked; late and done said in the second line
const periodOpen = ref(false);
const stText = (p) => (stateOf(p) == "done" ? t("taxes.page.stDone") : stateOf(p) == "late" ? t("taxes.page.stLate") : "");
const periodOpts = computed(() => (cur.value?.periods || []).map((p) => ({ value: p.key, label: dstr(p.last), sub: [span(p), stText(p)].filter(Boolean).join(" · ") })));

// the ⋯ menu: the computer's menu for this item and date
const moreOpen = ref(false);
const openMore = () => { menu.value = { id: cur.value.item.id, key: cur.value.period?.key || "", btn: null }; moreOpen.value = true; };
const moreActs = computed(() => menuItems.value.map(([a, ic, z]) => ({ label: t("taxes.page.menu." + a), icon: MI[ic], danger: !!z, run: () => pick(a) })));
watch(moreOpen, (v) => { if (!v) setTimeout(() => { if (!moreOpen.value) menu.value = null; }, 0); });
const moveOpen = computed({ get: () => !!moveFor.value, set: (v) => { if (!v) moveFor.value = null; } });

const { locale } = useI18n();
const monShort = (d) => new Date(d + "T12:00:00").toLocaleDateString(locale.value == "he" ? "he-IL" : "en-GB", { month: "short" });
const txName = (x) => displayName(S.value, x) || x.desc || "";
const doneLine = computed(() => { const d = cur.value?.period?.done; return d ? [d.sent ? t("taxes.page.doneSent") : "", d.paid != null ? t("taxes.page.donePaid", { amount: fm(d.paid) }) : ""].filter(Boolean).join(" · ") : ""; });
</script>

<template>
  <PhoneScreen :large="false" class="ph-taxrep">
    <template #actions>
      <IconButton v-if="cur" :label="P('more')" icon-name="more" @tap="openMore" />
    </template>

    <EmptyState v-if="S && !cur" icon-name="search" :title="P('gone')" :text="P('goneSub')" />
    <template v-else-if="cur">
      <header class="ph-bill-hero ph-tax-hero">
        <span class="ph-bill-av ph-tax-av" :class="{ late: isLate(cur.period) }" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
        <h1 class="ph-bill-name">{{ nameOf(cur.item) }}</h1>
        <template v-if="cur.period">
          <span class="ph-bill-unit">{{ t("taxes.page.moneyFrom", { span: span(cur.period) }) }}</span>
          <div class="ph-bill-chips">
            <span class="ph-bill-chip" :class="{ late: isLate(cur.period), done: cur.period.done }">{{ lastText(cur.period) }}</span>
            <button v-if="cur.period.moved" type="button" class="ph-bq" @click="explain(t('taxes.page.movedTip', { date: dd(cur.period.key) }))">{{ t("taxes.page.moved") }}</button>
          </div>
        </template>
      </header>

      <!-- which report, when there are several dates -->
      <ListGroup v-if="cur.periods.length > 1">
        <ListRow :title="t('taxes.page.periods')" link @tap="periodOpen = true">
          <template #end><span class="ph-row-v">{{ dstr(cur.period.last) }}<i v-if="stateOf(cur.period) != 'next'" class="tax-dot" :class="stateOf(cur.period)" :aria-label="stText(cur.period)" /></span></template>
        </ListRow>
      </ListGroup>

      <template v-if="cur.report">
        <!-- the computer's Download everything; Change is in the ⋯ at the top -->
        <button type="button" class="ph-btn tonal block ph-tax-zip" :disabled="zipping" :aria-busy="zipping" @click="downloadZip"><svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.down" />{{ t("taxes.page.zip.btn") }}</button>
        <p class="ph-meta ph-tax-ziptip">{{ t("taxes.page.zip.tip") }}</p>

        <!-- the money: in, out and the amount (highlighted), as the computer's three cards -->
        <div class="ph-tax-kpis">
          <AmountCard :label="t('taxes.page.kIn')" :value="f0(cur.report.totals.in)" :sub="t('taxes.page.kCount', { n: cur.report.rows.in.length }, cur.report.rows.in.length)" />
          <AmountCard :label="t('taxes.page.kOut')" :value="f0(cur.report.totals.out)" :sub="t('taxes.page.kCount', { n: cur.report.rows.out.length }, cur.report.rows.out.length)" />
          <AmountCard v-if="curAmt" class="k2" hero :label="curAmt.back ? t('taxes.page.kBack') : t('taxes.page.kAmt')" :value="f0(curAmt.n)" :sub="cur.report.vat ? t('taxes.page.kVat', { vin: fm(cur.report.vat.in), vout: fm(cur.report.vat.out) }) : ''" />
          <div v-else class="ph-acard hero k2 ph-tax-noamt">
            <div class="ph-acard-l"><span class="ph-acard-n">{{ t("taxes.page.kAmt") }}</span></div>
            <p class="ph-acard-s">{{ t("taxes.page.kNoAmt") }}</p>
            <button type="button" class="ph-btn tonal" @click="edit">{{ t("taxes.page.kSetAmt") }}</button>
          </div>
        </div>
        <ListGroup v-if="cur.report.empty" pad><p class="ph-tax-zero">{{ t("taxes.page.zero") }}</p></ListGroup>

        <!-- papers still missing: a tap opens the transaction, Attach a file adds the receipt or invoice -->
        <ListGroup v-if="needsPapers" :title="t('taxes.page.papersTitle')">
          <div v-for="m in cur.report.missing" :key="m.t.id" class="ph-brow ph-tax-pap" role="button" tabindex="0" @click="nav.push('transaction', String(m.t.id))" @keydown.enter="nav.push('transaction', String(m.t.id))">
            <span class="ph-bills-av ph-tax-av warn" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="ph-brow-m">
              <div class="ph-brow-l"><span class="ph-brow-t">{{ m.t.desc }}</span><span class="ph-brow-a"><b class="ph-amt" dir="ltr">{{ fmAbs(m.t.a) }}</b></span></div>
              <div class="ph-brow-s">{{ dstr(m.t.d) }} · {{ t("taxes.page.need." + m.need) }}<template v-if="m.note"> · {{ m.note }}</template></div>
              <label class="ph-btn tonal ph-tax-upl" @click.stop><svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.clip" />{{ t("taxes.page.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach(m.t, $event)"></label>
            </div>
          </div>
          <p v-if="!cur.report.missing.length" class="ph-meta ph-tax-none">{{ t("taxes.page.papersNone") }}</p>
        </ListGroup>

        <!-- sent or paid -->
        <ListGroup :title="t('taxes.page.doneTitle')" pad>
          <div v-if="cur.period.done" class="ph-tax-dl">
            <span class="tax-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span>
            <div class="ph-tax-dlt"><b>{{ doneLine }}</b><div v-if="cur.period.done.at" class="ph-meta">{{ t("taxes.page.doneOn", { date: dd(cur.period.done.at) }) }}</div></div>
            <button type="button" class="ph-btn plain" @click="unmarkDone">{{ t("taxes.page.undoDone") }}</button>
          </div>
          <div v-else class="ph-tax-df">
            <p class="ph-meta">{{ t("taxes.page.doneText") }}</p>
            <label class="ph-tax-chk"><input v-model="doneF.sent" type="checkbox" @change="doneF.err = false">{{ t("taxes.page.sent") }}</label>
            <div class="fld"><label for="phTxPaid">{{ t("taxes.page.paid") }}</label><MoneyInput id="phTxPaid" v-model="doneF.paid" :placeholder="t('taxes.page.paidHint')" @input="doneF.err = false" /></div>
            <p v-if="doneF.err" class="ph-meta neg" role="alert">{{ t("taxes.page.doneNeed") }}</p>
            <button type="button" class="ph-btn block" @click="markDone">{{ t("taxes.page.markDone") }}</button>
          </div>
        </ListGroup>

        <!-- the transactions in this report, newest first (as the bill screen's payments) -->
        <ListGroup :title="t('taxes.page.txTitle')" bare>
          <p v-if="!txRows.length" class="ph-meta ph-tax-none">{{ t("taxes.page.txNone") }}</p>
          <div v-else class="ph-bill-hist ph-tax-tx">
            <div class="phl">
              <div v-for="x in txRows" :key="x.id" class="phi" role="button" tabindex="0" @click="nav.push('transaction', String(x.id))" @keydown.enter="nav.push('transaction', String(x.id))">
                <div class="phd"><span>{{ monShort(x.d) }}</span><b>{{ +x.d.slice(8, 10) }}</b></div>
                <div class="phm"><div class="pht">{{ txName(x) }}</div><div class="sm">{{ x.from || "" }}{{ x.c ? (x.from ? " · " : "") + catLabel(x.c) : "" }}</div></div>
                <div class="pha"><b class="ph-amt" :class="{ pos: x.a > 0 }" dir="ltr">{{ x.a < 0 ? "" : "+" }}{{ fmAbs(x.a) }}</b></div>
              </div>
            </div>
          </div>
        </ListGroup>
      </template>
      <template v-else>
        <ListGroup pad><p class="ph-tax-zero">{{ whyQuiet({ item: cur.item }) }}</p></ListGroup>
        <div class="ph-bill-btns ph-tax-btns"><button type="button" class="ph-btn plain" @click="edit">{{ t("taxes.page.menu.edit") }}</button></div>
      </template>
    </template>

    <ActionSheet v-model:open="moreOpen" :title="cur ? nameOf(cur.item) : ''" :actions="moreActs" />
    <PickerSheet v-if="cur" v-model:open="periodOpen" required :title="t('taxes.page.periods')" :options="periodOpts" :model-value="cur.period?.key" @update:model-value="pickPeriod" />

    <!-- move this one date -->
    <PhoneSheet v-model:open="moveOpen" :title="t('taxes.page.move.title')">
      <template v-if="moveFor">
        <p class="ph-meta ph-tax-mvt">{{ t("taxes.page.move.text") }}</p>
        <p class="ph-meta ph-tax-mvt">{{ t("taxes.page.move.usual", { date: dd(moveFor.key) }) }}</p>
        <div class="fld ph-tax-mv"><label for="phTxMove">{{ t("taxes.page.move.to") }}</label><input id="phTxMove" v-model="moveFor.to" type="date"></div>
      </template>
      <template #foot>
        <div class="ph-tax-mvf">
          <button v-if="moveFor && moveFor.to != moveFor.key" type="button" class="ph-btn plain" @click="saveMove(true)">{{ t("taxes.page.move.back") }}</button>
          <button type="button" class="ph-btn" :disabled="!moveFor?.to" @click="saveMove(false)">{{ t("taxes.page.move.save") }}</button>
        </div>
      </template>
    </PhoneSheet>
  </PhoneScreen>
</template>
