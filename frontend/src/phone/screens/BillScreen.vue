<script setup>
// One bill (pushed on Bills, /bills?bill=<billKey>): what it costs and how often, when it is next charged, a price change,
// why it is a bill, its past payments (each opens its transaction), "Change bill type", and the ⋯ menu
// (show in Activity, mark to cancel or as canceled, keep, remove). A canceled bill offers Restore and Remove.
// The bill is found by what it is (billKey from lib/bills.js), so its address stays the same while the list changes.
import { ref, computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
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
const { t, tk, S, M, cad, freq, avStyle, srcOf, priceChange, menu, menuItems, MI, pick, showInActivity, typeFor, openType, saveType, makeRegular, keepIrregular, restore, remove } = useBills();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.bills." + k, o || {}, n);
const iso = (s) => "⁦" + s + "⁩"; // a date keeps its order inside a Hebrew sentence

// the bill this screen shows, and its payments (newest first)
const b = computed(() => (M.value && props.id ? M.value.all.find((x) => billKey(x) === props.id) || null : null));
const pays = computed(() => (b.value ? payHistory(M.value.billTx(M.value.bills[b.value.idx])) : null));
// removed while open: back to Bills
watch(b, (x, was) => { if (!x && was) nav.back(); });

const kindKey = computed(() => (b.value.once ? "once" : b.value.irregular ? "irr" : "rec"));
const canceled = computed(() => b.value.flag == "canceled");
const amount = computed(() => (b.value.once ? "" : b.value.irregular || b.value.vari ? "≈ " : "") + fm(b.value.once ? b.value.amt : b.value.pred));
const under = computed(() => (b.value.once ? t("bills.oneOff") : b.value.irregular ? t("bills.typical") : cad(b.value.every)));
const src = computed(() => { const s = srcOf(b.value.src || ""); return s.name ? tx(s.name) + (s.tail ? " ⁦·· " + s.tail + "⁩" : "") : ""; });
const due = computed(() => {
  const x = b.value;
  if (x.status == "overdue") return { text: t("bills.overdue", { date: iso(dstr(x.pd)) }), cls: "late" };
  if (x.status == "pending") return { text: t("bills.dueNow"), cls: "now" };
  return { text: x.days <= 7 ? t("bills.dueIn", { n: x.days }, x.days) + ", " + iso(dstr(x.nx)) : t("bills.nextCharge", { date: iso(dstr(x.nx)) }), cls: x.days <= 7 ? "soon" : "" };
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

const histName = (y) => displayName(S.value, y) || b.value.n;
const diffOf = (r) => (Math.abs(r.diff) > 0.5 ? r.diff : 0);
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
          <span v-if="canceled" class="ph-bill-chip off">{{ t("bills.canceled") }}</span>
          <span v-else-if="b.flag" class="ph-bill-chip warn">{{ t("bills.markedCancel") }}</span>
          <span class="ph-bill-chip">{{ b.manual ? t("bills.byYou") : t("bills.auto") }}</span>
        </div>
      </header>

      <!-- canceled: what that means, and the way back -->
      <ListGroup v-if="canceled">
        <div class="ph-bill-box">
          <p><b v-if="b.canceledAt">{{ P("canceledNote", { date: iso(dstr(b.canceledAt)) }) }}</b> {{ t("bills.notCounted") }}</p>
          <div class="ph-bill-btns"><button type="button" class="ph-btn" @click="restore(b)">{{ t("bills.restore") }}</button><button type="button" class="ph-btn tonal ph-bill-del" @click="remove(b)">{{ t("bills.remove") }}</button></div>
        </div>
      </ListGroup>

      <!-- irregular that now looks regular -->
      <ListGroup v-if="b.sug">
        <div class="ph-bill-box">
          <p>{{ t("bills.sug", { freq: freq(b.sug) }) }}</p>
          <div class="ph-bill-btns"><button type="button" class="ph-btn" @click="makeRegular(b)">{{ t("bills.makeReg") }}</button><button type="button" class="ph-btn tonal" @click="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
        </div>
      </ListGroup>

      <!-- regular: when it is next charged -->
      <ListGroup v-if="kindKey == 'rec' && !canceled" :title="P('next')">
        <ListRow :title="P('when')"><template #end><span class="ph-bill-v" :class="due.cls">{{ due.text }}</span></template></ListRow>
        <ListRow :title="t('bills.tip.how')" :value="cad(b.every)" />
        <ListRow :title="t('bills.tip.typical')" :sub="b.vari ? t('bills.avg3') : t('bills.sameLast')"><template #end><span class="ph-amt" dir="ltr">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</span></template></ListRow>
      </ListGroup>

      <ListGroup :title="P('details')" :note="whyText(b, t)">
        <ListRow v-if="src" :title="t('bills.add.from')" :value="src" />
        <ListRow v-if="b.n_tx" :title="P('last')" :sub="iso(dstr(b.lp))">
          <template #end><span class="ph-bill-endcol"><span class="ph-amt" dir="ltr">{{ fm(b.amt) }}</span><small v-if="change" dir="ltr" :class="change > 0 ? 'up' : 'dn'">{{ (change > 0 ? "+" : "−") + fm(Math.abs(change)) }}</small></span></template>
        </ListRow>
        <ListRow v-else :title="P('last')" :value="P('noneYet')" />
        <ListRow v-if="!b.once && b.n_tx > 1 && b.hi > b.lo" :title="P('range')" :value="P('rangeVal', { lo: fm(b.lo), hi: fm(b.hi) })" />
        <ListRow v-if="b.irregular" :title="P('perMonth')" :value="fm(b.mo)" />
        <ListRow v-if="!b.once" :title="t('bills.tip.so')" :value="String(b.n_tx || 0)" />
        <ListRow v-if="canType" :title="P('changeType')" link @tap="openType(b.idx)" />
      </ListGroup>

      <p v-if="change" class="ph-bill-note" :class="change > 0 ? 'up' : 'dn'">{{ change > 0 ? P("priceUp", { amount: fm(change) }) : P("priceDown", { amount: fm(-change) }) }}</p>

      <!-- past payments: the totals, a bar per payment, and the list -->
      <ListGroup :title="P('history')" :more="pays ? t('bills.h.show') : ''" @more="showInActivity(b.idx)">
        <p v-if="!pays" class="ph-bill-none">{{ t("bills.h.none") }}</p>
        <template v-else>
          <div class="ph-bill-stats">
            <span><small>{{ t("bills.h.payments") }}</small><b>{{ pays.L.length }}</b></span>
            <span><small>{{ t("bills.h.total") }}</small><b>{{ fm(pays.tot) }}</b></span>
            <span><small>{{ t("bills.h.average") }}</small><b>{{ fm(pays.avg) }}</b></span>
          </div>
          <div v-if="pays.bars.length" class="ph-bill-bars" aria-hidden="true"><i v-for="y in pays.bars" :key="y.id" :style="{ blockSize: Math.max(8, (Math.abs(y.a) / pays.mx) * 100) + '%' }" /></div>
          <p v-if="pays.mx - pays.mn > 0.5" class="ph-bill-range"><span>{{ t("bills.h.lowest") }} <b>{{ fm(pays.mn) }}</b></span><span>{{ t("bills.h.highest") }} <b>{{ fm(pays.mx) }}</b></span></p>
          <ListRow v-for="r in pays.rows" :key="r.t.id" :title="iso(dstr(r.t.d))" :sub="[r.t.from, r.t.c ? catLabel(r.t.c) : ''].filter(Boolean).join(', ') || histName(r.t)" link @tap="nav.push('transaction', String(r.t.id))">
            <template #end><span class="ph-bill-endcol"><span class="ph-amt" :class="{ pos: r.t.a > 0 }" dir="ltr">{{ r.t.a < 0 ? "" : "+" }}{{ fm(Math.abs(r.t.a)) }}</span><small v-if="diffOf(r)" dir="ltr" :class="diffOf(r) > 0 ? 'up' : 'dn'">{{ (diffOf(r) > 0 ? "+" : "−") + fm(Math.abs(diffOf(r))) }}</small></span></template>
          </ListRow>
        </template>
        <template v-if="pays" #note>{{ P("historyNote") }}</template>
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
