<script setup>
// One bill (pushed on Bills, /bills?bill=<billKey>): the computer's bill row and its payment history window together.
// The top: letter tile, amount, name and the bill's pills ("Found automatically" explains on a tap, as the computer's tip).
// Then a canceled bill's Restore / Remove, an irregular bill's "Make it regular", the row's details (how often, paid from,
// next charge, last charge, price change) with "Change bill type", and the payment history as in the computer's window:
// Payments / Total / Average, a bar per payment, lowest and highest, the payments by year (each opens its transaction)
// and "Show in Activity". The ⋯ in the top bar is the computer's ⋯ menu for this bill.
// The bill is found by what it is (billKey from lib/bills.js), so its address stays the same while the list changes.
import { ref, computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
import { explain } from "../../core/tooltip.js";
import { catLabel } from "../../core/cats.js";
import { dstr } from "../../dates.js";
import { displayName } from "../../lib/activity.js";
import { billKey, payHistory, whyText, fm } from "../../lib/bills.js";
import { useBills } from "../../pagelogic/bills.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import PIcon from "../components/PIcon.vue";

const props = defineProps({ id: { type: String, default: null } });
const { t, tk, S, M, loc, cad, freq, avStyle, srcOf, dueText, priceChange, evTip, menu, menuItems, MI, pick, showInActivity, typeFor, openType, saveType, makeRegular, keepIrregular, restore, remove } = useBills();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.bills." + k, o || {}, n);
const iso = (s) => "\u2066" + s + "\u2069"; // a date keeps its order beside another one in a Hebrew sentence

// the bill this screen shows, and its payments (newest first)
const b = computed(() => (M.value && props.id ? M.value.all.find((x) => billKey(x) === props.id) || null : null));
const pays = computed(() => (b.value ? payHistory(M.value.billTx(M.value.bills[b.value.idx])) : null));
// removed while open: back to Bills
watch(b, (x, was) => { if (!x && was) nav.back(); });

const kindKey = computed(() => (b.value.once ? "once" : b.value.irregular ? "irr" : "rec"));
const canceled = computed(() => b.value.flag == "canceled");
const amount = computed(() => (b.value.once ? "" : b.value.irregular || b.value.vari ? "≈ " : "") + fm(b.value.once ? b.value.amt : b.value.pred));
// the line under the amount: what the amount is, as at the end of the computer's row
const under = computed(() => (b.value.once ? t("bills.oneOff") : b.value.irregular ? t("bills.typical") : b.value.vari ? t("bills.avg3") : t("bills.sameLast")));
const src = computed(() => srcOf(b.value.src || ""));
const due = computed(() => {
  const x = b.value; // the row is named "Next payment", so a date further away is shown alone
  if (x.status == "overdue") return { text: t("bills.overdue", { date: dstr(x.pd) }), cls: "late" };
  if (x.status == "pending") return { text: t("bills.dueNow"), cls: "now" };
  return { text: x.days <= 7 ? dueText(x) + " · " + dstr(x.nx) : dstr(x.nx), cls: x.days <= 7 ? "soon" : "" };
});
const change = computed(() => priceChange(b.value));

// the ⋯ menu: the computer's menu for this bill (its payment history is already on this screen)
const moreOpen = ref(false);
const openMore = () => { menu.value = { i: b.value.idx, key: billKey(b.value), btn: null }; moreOpen.value = true; };
const moreActs = computed(() => menuItems.value.filter(([a]) => a !== "billHist").map(([a, ic, label, z]) => ({ label: tk("bills." + label), icon: MI[ic], danger: !!z, run: () => pick(a) })));
watch(moreOpen, (v) => { if (!v) setTimeout(() => { if (!moreOpen.value) menu.value = null; }, 0); });

// "Change bill type": the two kinds explained, then how often it is charged
const TYPES = ["1", "2", "12", "irregular"];
const TYPE_TEXT = { 1: "bills.type.o1", 2: "bills.type.o2", 12: "bills.type.o12", irregular: "bills.type.oirr" };
const typeName = (v) => tk(TYPE_TEXT[v]);
const typeOpen = computed({ get: () => !!typeFor.value, set: (v) => { if (!v) typeFor.value = null; } });
const canType = computed(() => b.value && !b.value.once && !canceled.value);

// the payment history as the computer's window lists it: a year heading when the year changes, a date tile per payment
const items = computed(() => {
  if (!pays.value) return [];
  let lastY = "";
  return pays.value.rows.map((r) => { const yr = r.t.d.slice(0, 4), head = yr !== lastY ? yr : ""; lastY = yr; return { ...r, head, diff: Math.abs(r.diff) > 0.5 ? r.diff : 0 }; });
});
const monShort = (d) => new Date(d + "T12:00:00").toLocaleDateString(loc.value, { month: "short" });
const histName = (y) => displayName(S.value, y) || b.value.n;
</script>

<template>
  <PhoneScreen :large="false" class="ph-bill">
    <template #actions>
      <IconButton v-if="b && !canceled" :label="P('more')" icon-name="more" @tap="openMore" />
    </template>

    <EmptyState v-if="!b" icon-name="search" :title="P('gone')" :text="P('goneSub')" />
    <template v-else>
      <header class="ph-bill-hero">
        <span class="ph-bill-av" :style="avStyle(b)" aria-hidden="true">{{ (b.n || "?")[0] }}</span>
        <b class="ph-bill-amt" dir="ltr">{{ amount }}</b>
        <span class="ph-bill-unit">{{ under }}</span>
        <h1 class="ph-bill-name">{{ tx(b.n) }}</h1>
        <div class="ph-bill-chips">
          <span class="ph-bill-chip">{{ tk("bills.kind." + kindKey) }}</span>
          <span v-if="canceled" class="ph-bpill off">{{ t("bills.canceled") }}</span>
          <span v-else-if="b.flag" class="ph-bpill warn">{{ t("bills.markedCancel") }}</span>
          <button type="button" class="ph-bq" @click="explain(evTip(b))">{{ b.irregular ? t("bills.whyQ") : b.manual ? t("bills.byYou") : t("bills.auto") }}<PIcon name="info" /></button>
        </div>
      </header>

      <!-- canceled: what that means, and the way back -->
      <ListGroup v-if="canceled">
        <div class="ph-bill-box">
          <p><b v-if="b.canceledAt">{{ t("bills.canceledOn", { date: dstr(b.canceledAt) }) }}.</b> {{ t("bills.notCounted") }}</p>
          <div class="ph-bill-btns"><button type="button" class="ph-btn" @click="restore(b)">{{ t("bills.restore") }}</button><button type="button" class="ph-btn plain ph-bill-del" @click="remove(b)">{{ t("bills.remove") }}</button></div>
        </div>
      </ListGroup>

      <!-- irregular that now looks regular -->
      <ListGroup v-if="b.sug">
        <div class="ph-bill-box">
          <p>{{ t("bills.sug", { freq: freq(b.sug) }) }}</p>
          <div class="ph-bill-btns"><button type="button" class="ph-btn" @click="makeRegular(b)">{{ t("bills.makeReg") }}</button><button type="button" class="ph-btn plain" @click="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
        </div>
      </ListGroup>

      <!-- the computer's row: how often, paid from, when next, the last charge and a price change -->
      <ListGroup :title="P('details')" :note="whyText(b, t)">
        <ListRow :title="t('bills.tip.how')" :value="b.once ? t('bills.oneOff') : b.irregular ? t('bills.irregular') : cad(b.every)" />
        <ListRow v-if="src.name" :title="t('bills.add.from')">
          <template #end><span class="ph-row-v">{{ tx(src.name) }}<bdi v-if="src.tail" class="ph-btail" dir="ltr"> ·· {{ src.tail }}</bdi></span></template>
        </ListRow>
        <ListRow v-if="kindKey == 'rec' && !canceled" :title="P('next')"><template #end><span class="ph-bill-v" :class="due.cls">{{ due.text }}</span></template></ListRow>
        <ListRow v-if="b.n_tx" :title="P('last')" :sub="dstr(b.lp)">
          <template #end><span class="ph-bill-endcol"><span class="ph-amt" dir="ltr">{{ fm(b.amt) }}</span><span v-if="change" class="ph-bbd" :class="change > 0 ? 'up' : 'dn'"><PIcon name="chevron" :class="change > 0 ? 'u' : 'd'" /><bdi dir="ltr">{{ fm(Math.abs(change)) }}</bdi></span></span></template>
        </ListRow>
        <ListRow v-else :title="P('last')" :value="b.once ? t('bills.noPayFound') : t('bills.noCharge')" />
        <ListRow v-if="change" :title="P('priceChanged')" :sub="change > 0 ? P('priceUp', { amount: fm(change) }) : P('priceDown', { amount: fm(-change) })" />
        <ListRow v-if="!b.once && b.n_tx > 1 && b.hi > b.lo" :title="P('range')" :value="P('rangeVal', { lo: fm(b.lo), hi: fm(b.hi) })" />
        <ListRow v-if="b.irregular" :title="P('perMonth')" :value="fm(b.mo)" />
        <ListRow v-if="!b.once" :title="t('bills.tip.so')" :sub="b.irregular && b.n_tx ? t('bills.irrSo', { n: b.n_tx, c: b.cnt12 }, b.n_tx) : ''" :value="String(b.n_tx || 0)" />
        <ListRow v-if="canType" :title="P('changeType')" link @tap="openType(b.idx)" />
      </ListGroup>

      <!-- the computer's payment history window -->
      <ListGroup :title="t('bills.menu.hist')" bare>
        <p v-if="!pays" class="ph-meta ph-bill-none">{{ t("bills.h.none") }}</p>
        <div v-else class="ph-bill-hist">
          <p class="ph-meta">{{ b.once ? t("bills.h.once") : t("bills.h.bill") }} · {{ t("activity.w.hTo", { a: iso(dstr(pays.L[pays.L.length - 1].d)), b: iso(dstr(pays.L[0].d)) }) }}</p>
          <div class="phs"><div><span>{{ t("bills.h.payments") }}</span><b>{{ pays.L.length }}</b></div><div><span>{{ t("bills.h.total") }}</span><b dir="ltr">{{ fm(pays.tot) }}</b></div><div><span>{{ t("bills.h.average") }}</span><b dir="ltr">{{ fm(pays.avg) }}</b></div></div>
          <div v-if="pays.bars.length" class="phb" aria-hidden="true"><i v-for="y in pays.bars" :key="y.id" :style="{ height: Math.max(8, (Math.abs(y.a) / pays.mx) * 100) + '%' }" /></div>
          <div v-if="pays.mx - pays.mn > 0.5" class="phr"><span>{{ t("bills.h.lowest") }} <b dir="ltr">{{ fm(pays.mn) }}</b></span><span>{{ t("bills.h.highest") }} <b dir="ltr">{{ fm(pays.mx) }}</b></span></div>
          <div class="phl">
            <template v-for="it in items" :key="it.t.id">
              <div v-if="it.head" class="phy">{{ it.head }}</div>
              <div class="phi" role="button" tabindex="0" @click="nav.push('transaction', String(it.t.id))" @keydown.enter="nav.push('transaction', String(it.t.id))">
                <div class="phd"><span>{{ monShort(it.t.d) }}</span><b>{{ +it.t.d.slice(8, 10) }}</b></div>
                <div class="phm"><div class="pht">{{ histName(it.t) }}</div><div class="sm">{{ it.t.from || "" }}{{ it.t.c ? (it.t.from ? " · " : "") + catLabel(it.t.c) : "" }}</div></div>
                <div class="pha"><b class="ph-amt" :class="{ pos: it.t.a > 0 }" dir="ltr">{{ it.t.a < 0 ? "" : "+" }}{{ fm(Math.abs(it.t.a)) }}</b><span v-if="it.diff" class="ph-bbd" :class="it.diff > 0 ? 'up' : 'dn'"><PIcon name="chevron" :class="it.diff > 0 ? 'u' : 'd'" /><bdi dir="ltr">{{ fm(Math.abs(it.diff)) }}</bdi></span></div>
              </div>
            </template>
          </div>
          <button type="button" class="ph-btn plain block" @click="showInActivity(b.idx)">{{ t("bills.h.show") }}</button>
        </div>
      </ListGroup>
    </template>

    <ActionSheet v-model:open="moreOpen" :title="b ? tx(b.n) : ''" :actions="moreActs" />

    <PhoneSheet v-model:open="typeOpen" :title="t('bills.type.title')">
      <template v-if="typeFor">
        <p class="ph-bill-tname">{{ tx(typeFor.name) }}</p>
        <div class="ph-bill-kinds">
          <div><b>{{ t("bills.type.recT") }}</b><p>{{ t("bills.type.rec") }}</p></div>
          <div><b>{{ t("bills.type.irrT") }}</b><p>{{ t("bills.type.irr") }}</p></div>
        </div>
        <h3 class="ph-bill-th">{{ P("pickType") }}</h3>
        <div class="ph-group-b" role="radiogroup" :aria-label="P('pickType')">
          <button v-for="v in TYPES" :key="v" type="button" class="ph-row" role="radio" :aria-checked="String(typeFor.v === v)" @click="typeFor.v = v">
            <span class="ph-row-main"><span class="ph-row-t">{{ typeName(v) }}</span></span>
            <PIcon v-if="typeFor.v === v" class="ph-bill-ck" name="check" />
          </button>
        </div>
      </template>
      <template #foot><button type="button" class="ph-btn ph-bill-save" @click="saveType">{{ t("bills.save") }}</button></template>
    </PhoneSheet>
  </PhoneScreen>
</template>
