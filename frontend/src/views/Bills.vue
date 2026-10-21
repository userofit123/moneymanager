<script setup>
// Bills: the same business or person charging you again and again. A copy of the current app's Bills page
// (web/js/04-transactions.js renderBills, web/js/08-jars.js bill actions): the three numbers on top, regular, irregular,
// instalment and one-off bills, canceled bills, the ⋯ menu, "Add a bill", "Change bill type" and the payment history.
// The numbers come from lib/bills.js. Changes go through the data store; a bill is found by what it is (billKey), not its place in the list.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { openTx, openPop } from "../core/txwin.js";
import { now } from "../core/clock.js";
import { tx } from "../core/heText.js"; // names from the data are shown through the old dictionary, like the current app
import { openForm } from "../core/forms.js";
import { dstr } from "../dates.js";
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import PopMenu from "../components/PopMenu.vue";
import { displayName } from "../lib/activity.js";
import { vRich } from "../lib/richtip.js";
import { billsModel, billState, flagBill, cancelBill, restoreBill, deleteBill, setBillType, sugYes, sugNo, typeOf, billKey, billIndex, cadText, freqText, evTipText, f0, fm } from "../lib/bills.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// ---- how things are written (the current app's dstr, cc and accLbl) ----
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monYr = (d, k) => { const x = new Date(d); x.setMonth(x.getMonth() + k); return x.toLocaleDateString(loc.value, { month: "short", year: "numeric" }); };
const monShort = (d) => new Date(d + "T12:00:00").toLocaleDateString(loc.value, { month: "short" });
const cc = (n) => (n == "Income" || S.value?.cats?.[n] === 99 ? "var(--pos)" : `var(--c${((S.value?.cats?.[n] == null ? 6 : S.value.cats[n])) % 7})`);
const avStyle = (b) => { const c = cc(b.cat || "Other"); return { background: `color-mix(in srgb,${c} 22%,transparent)`, color: c }; };
// "Max ·· 1234": the name with the last digits of a card, like accLbl.
const srcOf = (n) => {
  n = n || ""; const A = S.value?.accounts || [], a = A.find((x) => x.n == n), m = /^(.*?)\s*··\s*(\S+)$/.exec(n);
  const tail = (x) => { const mm = /··\s*(\S+)$/.exec(x); if (mm) return mm[1]; const q = A.find((y) => y.n == x && y.tail); return q ? q.tail : ""; };
  if (!((a && a.kind == "card") || /··/.test(n))) return { name: n, tail: "" };
  return m ? { name: m[1], tail: m[2] } : { name: n, tail: tail(n) };
};

// ---- the page ----
const M = computed(() => (S.value ? billsModel(S.value, now.value) : null));
const cad = (every) => cadText(t, every);
const freq = (every, plain) => freqText(t, every, plain);
const kpis = computed(() => {
  const m = M.value; if (!m) return [];
  const irr = m.irr.length > 0;
  return [
    { c: "hero", l: t("bills.k.monthly"), v: m.mo, s: t(irr ? "bills.k.monthlySubIrr" : "bills.k.monthlySub", { amount: fm(m.mo * 12) }) },
    { c: "", l: t("bills.k.due"), v: m.soonT, s: t("bills.k.dueSub", { n: m.soon.length }, m.soon.length) },
    { c: "", l: t("bills.k.changes"), v: m.chT, s: t("bills.k.changesSub", { n: m.ch.length }, m.ch.length), neg: m.chT < 0 },
  ];
});
const ICON = {
  ins: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
  rec: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
  irr: '<path d="M3 17c3 0 3-10 6-10s3 10 6 10 3-10 6-10"/>',
  one: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/>',
};
const groups = computed(() => {
  const m = M.value; if (!m) return [];
  return [["rec", m.rec], ["irr", m.irr], ["ins", m.inst], ["one", m.one]].filter(([, L]) => L.length).map(([k, L]) => ({ k, L, total: m.tot[k] }));
});
const dueText = (b) => b.status == "overdue" ? "" : b.days <= 7 ? t("bills.dueIn", { n: b.days }, b.days) : t("bills.nextCharge", { date: dstr(b.nx) });
const priceChange = (b) => { const d = b.amt - b.was; return b.fresh && !b.vari && Math.abs(d) > b.was * 0.001 ? d : 0; };
const lastLine = (b) => (b.n_tx ? t("bills.lastCharge", { amount: fm(b.amt), date: dstr(b.lp) }) : t("bills.noCharge"));

const evTip = (b) => evTipText(b, t, dstr);

// ---- saving: through the data store (stores/data.js). Bills the app finds are saved by the upkeep after every load (core/settle.js). ----
// edit(copy, i) gets the bill's place in the copy being changed (looked up by its key, so a sync in between cannot shift it).
function change(key, edit) {
  data.change((next) => { const i = billIndex(next, key); if (i < 0) return false; const r = edit(next, i); if (r === false) return false; return r.map(([a, d, who]) => [a, d, null, who]); });
}
// The payments of bill number i, worked out on the same state the change is made on.
const txOf = (next, i) => { const st = billState(next, now.value); return st.billTx(next.bills[i]); };

// ---- the ⋯ menu ----
const menu = ref(null); // { i, key, btn }
const toggleMenu = (b, ev) => { menu.value = menu.value && menu.value.i == b.idx ? null : { i: b.idx, key: billKey(b), btn: ev.currentTarget }; };
const MI = { h: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', t: '<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>', f: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', c: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>', k: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
const menuItems = computed(() => {
  if (!menu.value || !M.value) return [];
  const bi = M.value.all.find((x) => x.idx == menu.value.i) || {}, rec = !bi.once && !bi.irregular, it = [["billHist", "h", "menu.hist"]];
  if (rec || bi.irregular) it.push(["billType", "t", "menu.type"]);
  if (rec) { if (bi.flag) it.push(["billCanceled", "c", "menu.cancelNow"], ["billFlag", "k", "menu.keep"]); else it.push(["billFlag", "f", "menu.cancel"]); }
  it.push(["billDel", "x", "menu.remove", 1]);
  return it;
});
function pick(a) {
  const { i, key } = menu.value; menu.value = null;
  if (a == "billHist") openHist(i);
  else if (a == "billType") openType(i);
  else if (a == "billFlag") change(key, flagBill);
  else if (a == "billCanceled") change(key, (n, j) => cancelBill(n, j, billState(n, now.value).TODAY));
  else if (a == "billDel") change(key, deleteBill);
}

// ---- opening a bill: its last payment's entry window, or its payment history (billOpen, billHist) ----
function openHist(i) {
  const st = billState(S.value, now.value), b = st.bills[i]; if (!b) return;
  openPop("hist", { title: b.n, rows: st.billTx(b), sub: b.mode == "once" ? t("bills.h.once") : t("bills.h.bill"), q: b.mode == "once" ? b.n : b.match });
}
function openBill(bi) {
  const st = billState(S.value, now.value), b = st.bills[bi.idx]; if (!b) return;
  const L = st.billTx(b), last = L[L.length - 1];
  if (last) openTx(last.id); else openPop("hist", { title: b.n, rows: L, sub: t("bills.h.bill"), q: b.match });
}

// ---- Add a bill: the shared window (components/forms/BillForm.vue) ----
const openAdd = () => openForm("bill");

// ---- Change bill type ----
const typeFor = ref(null); // { i, name, v }
function openType(i) {
  const b = S.value && billState(S.value, now.value).bills[i]; if (!b) return;
  const info = M.value.all.find((x) => x.idx == i) || {};
  typeFor.value = { key: billKey(b), name: b.n, v: typeOf(b, info) };
}
function saveType() { const { key, v } = typeFor.value; typeFor.value = null; change(key, (n, i) => setBillType(n, i, v, txOf(n, i))); }

const makeRegular = (b) => change(billKey(b), (n, i) => sugYes(n, i, b.sug, txOf(n, i)));
const keepIrregular = (b) => change(billKey(b), (n, i) => sugNo(n, i, txOf(n, i)));
const restore = (b) => change(billKey(b), restoreBill);
const remove = (b) => change(billKey(b), deleteBill);
</script>

<template>
  <PageHeader :title="t('nav.bills')" />
  <section class="view on" id="bills">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("bills.loadError") }}</p>
      <p v-else class="sm">{{ t("bills.loading") }}</p>
    </template>

    <template v-else>
      <div class="grid g3" id="billK">
        <div v-for="(c, i) in kpis" :key="i" class="card" :class="c.c"><div class="lbl">{{ c.l }}</div><div class="val"><small>₪</small>{{ c.neg ? "−" : "" }}{{ f0(c.v) }}</div><div class="sm">{{ c.s }}</div></div>
      </div>
      <div class="billbar"><button class="btn o s" data-a="billNew" @click="openAdd">{{ t("bills.addBill") }}</button></div>

      <div id="billL">
        <section v-for="g in groups" :key="g.k" class="bgrp" :class="g.k">
          <header class="bgh"><span class="bgi"><svg viewBox="0 0 24 24" v-html="ICON[g.k]" /></span><div class="bgt"><b>{{ tk("bills.g." + g.k + ".title") }}</b><span class="cnt">{{ g.L.length }}</span><div class="sm">{{ tk("bills.g." + g.k + ".desc") }}</div></div><div class="bgs"><b class="num">{{ fm(g.total) }}</b><span>{{ tk("bills.g." + g.k + ".unit") }}</span></div></header>
          <div class="bgr">
            <!-- regular -->
            <template v-if="g.k == 'rec'">
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b><template v-if="b.flag">{{ " " }}<span class="bd am2">{{ t("bills.markedCancel") }}</span></template></div>
                  <div class="bsub">{{ cad(b.every) }} <span class="dsep">·</span> {{ tx(srcOf(b.src).name) }} <span v-if="srcOf(b.src).tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src).tail }}</span> <span v-rich="evTip(b)" class="bq">{{ b.manual ? t("bills.byYou") : t("bills.auto") }}</span></div>
                  <div class="bsub bs2">{{ lastLine(b) }}<template v-if="b.vari">{{ " " }}<span class="dsep">·</span>{{ " " + t("bills.varies", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div>
                  <span v-if="priceChange(b)" class="bd" :class="priceChange(b) > 0 ? 'up' : 'dn'" style="margin-top:6px">{{ priceChange(b) > 0 ? t("bills.more", { amount: fm(priceChange(b)) }) : t("bills.less", { amount: fm(-priceChange(b)) }) }}</span></div>
                <div class="ba"><b class="num">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b>
                  <div class="sm"><span v-if="b.status == 'overdue'" class="neg">{{ t("bills.overdue", { date: dstr(b.pd) }) }}</span><span v-else-if="b.status == 'pending'" class="am">{{ t("bills.dueNow") }}</span><b v-else-if="b.days <= 7">{{ dueText(b) }}</b><template v-else>{{ dueText(b) }}</template></div>
                  <div class="sm bfaint">{{ b.vari ? t("bills.avg3") : t("bills.sameLast") }}</div></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
              </div>
            </template>
            <!-- irregular -->
            <template v-else-if="g.k == 'irr'">
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b><template v-if="b.flag">{{ " " }}<span class="bd am2">{{ t("bills.markedCancel") }}</span></template></div>
                  <div class="bsub">{{ t("bills.irregular") }} <span class="dsep">·</span> {{ tx(srcOf(b.src || "").name) }} <span v-if="srcOf(b.src || '').tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src || "").tail }}</span> <span v-rich="evTip(b)" class="bq">{{ t("bills.whyQ") }}</span></div>
                  <div class="bsub bs2"><template v-if="b.n_tx">{{ t("bills.irrSo", { n: b.n_tx, c: b.cnt12 }, b.n_tx) }} <span class="dsep">·</span> {{ t("bills.lastPay", { amount: fm(b.amt), date: dstr(b.lp) }) }}</template><template v-else>{{ t("bills.noPay") }}</template><template v-if="b.hi > b.lo">{{ " " }}<span class="dsep">·</span>{{ " " + t("bills.ranges", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div></div>
                <div class="ba"><b class="num">≈ {{ fm(b.pred) }}</b><div class="sm">{{ t("bills.typical") }}</div><div v-if="b.n_tx" class="sm" style="font-weight:600">{{ t("bills.lastPayment", { amount: fm(b.amt) }) }}</div><div class="sm bfaint">{{ t("bills.perMonthAvg", { amount: fm(b.mo) }) }}</div></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
                <div v-if="b.sug" class="bsug"><span>{{ t("bills.sug", { freq: freq(b.sug) }) }}</span><button class="btn s" data-a="billSugYes" :data-i="b.idx" @click.stop="makeRegular(b)">{{ t("bills.makeReg") }}</button><button class="btn o s" data-a="billSugNo" :data-i="b.idx" @click.stop="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
              </div>
            </template>
            <!-- instalments -->
            <template v-else-if="g.k == 'ins'">
              <div v-for="x in g.L" :key="x.last.id" class="row" data-a="openTx" :data-id="x.last.id" style="cursor:pointer" @click="openTx(x.last.id)">
                <span class="av" :style="{ background: `color-mix(in srgb,${cc(x.last.c || 'Uncategorized')} 22%,transparent)`, color: cc(x.last.c || 'Uncategorized') }">{{ (displayName(S, x.last) || "?")[0] }}</span>
                <div class="grow"><b>{{ x.name }}</b><div class="sm">{{ t("bills.instA", { paid: x.paid, total: x.total }) }} · <b style="color:var(--tx)">{{ t("bills.instLeft", { n: x.left }) }}</b> · {{ t("bills.instLast", { when: monYr(x.last.d, x.left) }) }}</div><div class="bar" style="margin:8px 0 0;height:6px;max-width:260px"><i :style="{ width: (x.paid / x.total) * 100 + '%' }" /></div></div>
                <div style="text-align:end"><b class="num">{{ fm(x.amt) }}</b><div class="sm">{{ t("bills.instUnit") }}</div><div class="sm num">{{ t("bills.instRemain", { amount: fm(x.remain) }) }}</div></div>
              </div>
            </template>
            <!-- one-off -->
            <template v-else>
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b></div><div class="bsub">{{ t("bills.oneOff") }} <span class="dsep">·</span> {{ tx(srcOf(b.src || "").name) }} <span v-if="srcOf(b.src || '').tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src || "").tail }}</span> <span class="dsep">·</span> {{ b.lp ? t("bills.paidOn", { date: dstr(b.lp) }) : t("bills.noPayFound") }}</div></div>
                <div class="ba"><b class="num">{{ fm(b.amt) }}</b></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
              </div>
            </template>
          </div>
        </section>
        <div v-if="!groups.length" class="sm" style="padding:22px;text-align:center">{{ t("bills.emptyA") }}<i>{{ t("bills.emptyB") }}</i>{{ t("bills.emptyC") }}</div>
      </div>

      <div id="billCw">
        <template v-if="M.canceled.length">
          <h2>{{ t("bills.canceledTitle", { n: M.canceled.length }) }}</h2>
          <div class="card" style="padding:6px 18px">
            <div v-for="b in M.canceled" :key="b.idx" class="row" style="flex-wrap:wrap;opacity:.8">
              <div class="grow"><b>{{ b.n }}</b> <span class="bd fl">{{ t("bills.canceled") }}</span><div class="sm"><template v-if="b.canceledAt"><span>{{ t("bills.canceledOn", { date: dstr(b.canceledAt) }) }}</span> · </template><span>{{ b.n_tx ? t("bills.lastCharge", { amount: fm(b.amt), date: dstr(b.lp) }) : t("bills.noCharges") }}</span><br><span>{{ t("bills.notCounted") }}</span></div></div>
              <div class="flex" style="gap:6px"><button class="btn o s" data-a="billRestore" :data-i="b.idx" @click="restore(b)">{{ t("bills.restore") }}</button><button class="btn r s" data-a="billDel" :data-i="b.idx" :aria-label="t('bills.remove')" @click="remove(b)">✕</button></div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="S">
    <PopMenu :at="menu?.btn" @close="menu = null">
      <button v-for="[a, ic, label, z] in menuItems" :key="a" role="menuitem" :class="z ? 'dz' : undefined" :data-a="a" :data-i="menu.i" @click="pick(a)"><svg viewBox="0 0 24 24" v-html="MI[ic]" />{{ tk("bills." + label) }}</button>
    </PopMenu>


    <BaseSheet :open="!!typeFor" @close="typeFor = null">
      <h3>{{ t("bills.type.title") }}</h3>
      <div class="sm" style="margin-bottom:12px">{{ typeFor.name }}</div>
      <div class="inf"><div class="it"><b>{{ t("bills.type.recT") }}</b>{{ t("bills.type.rec") }}</div></div>
      <div class="inf"><div class="it"><b>{{ t("bills.type.irrT") }}</b>{{ t("bills.type.irr") }}</div></div>
      <div class="fld"><label>{{ t("bills.type.label") }}</label><select v-model="typeFor.v"><option value="1">{{ t("bills.type.o1") }}</option><option value="2">{{ t("bills.type.o2") }}</option><option value="12">{{ t("bills.type.o12") }}</option><option value="irregular">{{ t("bills.type.oirr") }}</option></select></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close" @click="typeFor = null">{{ t("bills.cancel") }}</button><button class="btn" data-a="billTypeSave" @click="saveType">{{ t("bills.save") }}</button></div>
    </BaseSheet>

  </template>
</template>
