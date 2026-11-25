<script setup>
// Taxes and reports: what a person who works for themselves must report or pay. The list (Coming up, then Not needed
// now) with the ⋯ menu, one item's report (its money, missing papers with Attach a file, the transactions and Done), the
// ready-made examples when there is nothing yet, and the notes on how the amounts are worked out.
// What it knows and does lives in pagelogic/taxes.js; here: the screen. The add/change window is forms/TaxItemForm.vue.
import { ref, watch, nextTick, onMounted } from "vue";
import { isPhone } from "../mobile.js";
import { data } from "../stores/data.js";
import { openTx } from "../core/txwin.js";
import { openForm } from "../core/forms.js";
import PageHeader from "../components/PageHeader.vue";
import PhoneScreen from "../phone/components/PhoneScreen.vue";
import BaseDialog from "../components/BaseDialog.vue";
import BaseButton from "../components/BaseButton.vue";
import PopMenu from "../components/PopMenu.vue";
import MoneyInput from "../components/MoneyInput.vue";
import TxRows from "../components/TxRows.vue";
import { f0 } from "../lib/bills.js";
import { useTaxes } from "../pagelogic/taxes.js";
import "../styles/pages/bills.css"; // the list rows and groups are the Bills page's
import "../styles/pages/taxes.css"; // this page's own styles

const {
  t, S, M, any, nameOf, span, lastText, wantText, isLate, whyQuiet, fm, fmAbs, amountOf, dstr, dd, EXG, addEx, addOwn, exMenu,
  menu, toggleMenu, menuItems, MI, pick, moveFor, saveMove, openItem, closeItem, cur, curAmt, needsPapers, pickPeriod, stateOf, doneF, markDone, unmarkDone, txRows, attach,
} = useTaxes();
onMounted(() => { data.start(); });
// On the phone the page sits in the phone's screen frame (top bar, large title, side margins), as Bills does.
const Plain = (_p, { slots }) => slots.default?.();
// The chosen report among many dates: scrolled into sight, so a late one is never hidden off the edge.
const pseg = ref(null);
watch(() => cur.value?.period?.key, () => nextTick(() => pseg.value?.querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center" })), { immediate: true });
const ICON = {
  up: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3"/>',
  quiet: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
</script>

<template>
  <component :is="isPhone ? PhoneScreen : Plain">
  <PageHeader v-if="!isPhone" :title="t('nav.taxes')" />
  <section class="view on" id="taxes">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("taxes.page.loadError") }}</p>
      <p v-else class="sm">{{ t("taxes.page.loading") }}</p>
    </template>

    <!-- one item's report -->
    <template v-else-if="cur">
      <button type="button" class="tax-back" @click="closeItem"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>{{ t("taxes.page.back") }}</button>
      <div class="tax-ph">
        <b class="tax-name">{{ nameOf(cur.item) }}</b>
        <button type="button" class="btn o s" @click="openForm('tax', { id: cur.item.id })">{{ t("taxes.page.menu.edit") }}</button>
      </div>
      <div v-if="cur.periods.length > 1" ref="pseg" class="seg tax-pseg" role="group" :aria-label="t('taxes.page.periods')">
        <button v-for="p in cur.periods" :key="p.key" type="button" :class="{ on: p.key == cur.period?.key }" :aria-pressed="p.key == cur.period?.key" @click="pickPeriod(p.key)">
          {{ dstr(p.last) }}<i v-if="stateOf(p) != 'next'" class="tax-dot" :class="stateOf(p)" :aria-label="stateOf(p) == 'done' ? t('taxes.page.stDone') : t('taxes.page.stLate')" />
        </button>
      </div>

      <template v-if="cur.report">
        <div class="sm tax-psub">
          {{ t("taxes.page.moneyFrom", { span: span(cur.period) }) }} <span class="dsep">·</span>
          <span :class="{ neg: isLate(cur.period) }">{{ lastText(cur.period) }}</span>
          <template v-if="cur.period.moved">{{ " " }}<span class="bq" :data-tip="t('taxes.page.movedTip', { date: dd(cur.period.key) })">{{ t("taxes.page.moved") }}</span></template>
        </div>
        <div class="grid g3 tax-k">
          <div class="card"><div class="lbl">{{ t("taxes.page.kIn") }}</div><div class="val"><small>₪</small>{{ f0(cur.report.totals.in) }}</div><div class="sm">{{ t("taxes.page.kCount", { n: cur.report.rows.in.length }, cur.report.rows.in.length) }}</div></div>
          <div class="card"><div class="lbl">{{ t("taxes.page.kOut") }}</div><div class="val"><small>₪</small>{{ f0(cur.report.totals.out) }}</div><div class="sm">{{ t("taxes.page.kCount", { n: cur.report.rows.out.length }, cur.report.rows.out.length) }}</div></div>
          <div class="card hero">
            <template v-if="curAmt">
              <div class="lbl">{{ curAmt.back ? t("taxes.page.kBack") : t("taxes.page.kAmt") }}</div>
              <div class="val"><small>₪</small>{{ f0(curAmt.n) }}</div>
              <div v-if="cur.report.vat" class="sm">{{ t("taxes.page.kVat", { vin: fm(cur.report.vat.in), vout: fm(cur.report.vat.out) }) }}</div>
            </template>
            <template v-else>
              <div class="lbl">{{ t("taxes.page.kAmt") }}</div>
              <div class="sm tax-noamt">{{ t("taxes.page.kNoAmt") }}</div>
              <button type="button" class="btn o s" @click="openForm('tax', { id: cur.item.id })">{{ t("taxes.page.kSetAmt") }}</button>
            </template>
          </div>
        </div>
        <div v-if="cur.report.empty" class="inf tax-zero"><div class="it">{{ t("taxes.page.zero") }}</div></div>

        <template v-if="needsPapers">
        <h2>{{ t("taxes.page.papersTitle") }}</h2>
        <div class="card tax-card">
          <div v-for="m in cur.report.missing" :key="m.t.id" class="brow tax-pap" @click="openTx(m.t.id)">
            <span class="av tax-av"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="bm"><div class="bt"><b>{{ m.t.desc }}</b></div><div class="bsub">{{ dstr(m.t.d) }} <span class="dsep">·</span> {{ t("taxes.page.need." + m.need) }}<template v-if="m.note"> <span class="dsep">·</span> {{ m.note }}</template></div></div>
            <b class="num tax-am">{{ fmAbs(m.t.a) }}</b>
            <label class="btn o s upl" @click.stop><svg viewBox="0 0 24 24" v-html="ICON.clip" />{{ t("taxes.page.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach(m.t, $event)"></label>
          </div>
          <div v-if="!cur.report.missing.length" class="sm tax-none">{{ t("taxes.page.papersNone") }}</div>
        </div>
        </template>

        <h2>{{ t("taxes.page.doneTitle") }}</h2>
        <div class="card tax-done">
          <template v-if="cur.period.done">
            <div class="tax-dl"><span class="tax-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span>
              <div class="grow"><b>{{ [cur.period.done.sent ? t("taxes.page.doneSent") : "", cur.period.done.paid != null ? t("taxes.page.donePaid", { amount: fm(cur.period.done.paid) }) : ""].filter(Boolean).join(" · ") }}</b>
                <div v-if="cur.period.done.at" class="sm">{{ t("taxes.page.doneOn", { date: dd(cur.period.done.at) }) }}</div></div>
              <button type="button" class="btn o s" @click="unmarkDone">{{ t("taxes.page.undoDone") }}</button></div>
          </template>
          <template v-else>
            <p class="sm tax-dt">{{ t("taxes.page.doneText") }}</p>
            <div class="tax-df">
              <label class="tax-chk"><input v-model="doneF.sent" type="checkbox" @change="doneF.err = false">{{ t("taxes.page.sent") }}</label>
              <div class="fld"><label for="txPaid">{{ t("taxes.page.paid") }}</label><MoneyInput id="txPaid" v-model="doneF.paid" :placeholder="t('taxes.page.paidHint')" @input="doneF.err = false" /></div>
              <button type="button" class="btn" @click="markDone">{{ t("taxes.page.markDone") }}</button>
            </div>
            <div v-if="doneF.err" class="sm neg" role="alert">{{ t("taxes.page.doneNeed") }}</div>
          </template>
        </div>

        <h2>{{ t("taxes.page.txTitle") }}</h2>
        <div class="tax-tx"><TxRows :rows="txRows" :empty="t('taxes.page.txNone')" @open="(x) => openTx(x.id)" /></div>
      </template>
      <div v-else class="card sm">{{ whyQuiet({ item: cur.item }) }}</div>
    </template>

    <!-- the list -->
    <template v-else-if="any">
      <div class="billbar"><button type="button" class="btn o s" aria-haspopup="menu" :aria-expanded="!!exMenu" @click="exMenu = exMenu ? null : $event.currentTarget">{{ t("taxes.page.add") }}</button></div>

      <section v-if="M.now.length" class="bgrp" id="taxUp">
        <header class="bgh"><span class="bgi"><svg viewBox="0 0 24 24" v-html="ICON.up" /></span><div class="bgt"><b>{{ t("taxes.page.upTitle") }}</b><span class="cnt">{{ M.now.length }}</span><div class="sm">{{ t("taxes.page.upDesc") }}</div></div></header>
        <div class="bgr">
          <div v-for="r in M.now" :key="r.item.id" class="brow" @click="openItem(r)">
            <span class="av tax-av" :class="{ late: r.late.length }"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="bm">
              <div class="bt"><b>{{ nameOf(r.item) }}</b><template v-if="r.late.length">{{ " " }}<span class="bd tax-late">{{ t("taxes.page.lateN", { n: r.late.length }, r.late.length) }}</span></template></div>
              <template v-if="r.period">
                <div class="bsub"><span :class="{ neg: isLate(r.period) }">{{ lastText(r.period) }}</span><template v-if="wantText(r.period)"> <span class="dsep">·</span> {{ wantText(r.period) }}</template></div>
                <div class="bsub bs2">{{ t("taxes.page.moneyFrom", { span: span(r.period) }) }}</div>
              </template>
              <div v-else-if="r.check" class="bsub">{{ t("taxes.page.checkLine", { total: fm(r.check.total), limit: fm(r.check.limit), pct: r.check.pct }) }}</div>
            </div>
            <div class="ba">
              <template v-if="r.report">
                <b class="num">{{ amountOf(r.report) ? fm(amountOf(r.report).n) : "" }}</b>
                <div class="sm">{{ !amountOf(r.report) ? t("taxes.page.noAmount") : amountOf(r.report).back ? t("taxes.page.getBack") : t("taxes.page.toPay") }}</div>
                <div v-if="r.report.missing.length" class="sm tax-miss">{{ t("taxes.page.missing", { n: r.report.missing.length }, r.report.missing.length) }}</div>
              </template>
              <span v-else-if="r.check" class="bd" :class="r.check.over ? 'tax-late' : 'tax-near'">{{ r.check.over ? t("taxes.page.checkOver") : t("taxes.page.checkNear") }}</span>
            </div>
            <button type="button" class="ib jmore bmore" :aria-label="t('taxes.page.options', { name: nameOf(r.item) })" aria-haspopup="menu" @click.stop="toggleMenu(r, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
          </div>
        </div>
      </section>

      <section v-if="M.quiet.length" class="bgrp tax-quiet" id="taxQuiet">
        <header class="bgh"><span class="bgi"><svg viewBox="0 0 24 24" v-html="ICON.quiet" /></span><div class="bgt"><b>{{ t("taxes.page.quietTitle") }}</b><span class="cnt">{{ M.quiet.length }}</span><div class="sm">{{ t("taxes.page.quietDesc") }}</div></div></header>
        <div class="bgr">
          <div v-for="r in M.quiet" :key="r.item.id" class="brow" @click="openItem(r)">
            <span class="av tax-av"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="bm"><div class="bt"><b>{{ nameOf(r.item) }}</b></div><div class="bsub">{{ whyQuiet(r) }}</div>
              <div v-if="r.check" class="bsub bs2">{{ t("taxes.page.checkLine", { total: fm(r.check.total), limit: fm(r.check.limit), pct: r.check.pct }) }}</div></div>
            <button type="button" class="ib jmore bmore" :aria-label="t('taxes.page.options', { name: nameOf(r.item) })" aria-haspopup="menu" @click.stop="toggleMenu(r, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
          </div>
        </div>
      </section>
    </template>

    <!-- nothing yet: the ready-made examples -->
    <div v-else id="taxEmpty" class="card">
      <span class="bgi tax-ei"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
      <b class="tax-et">{{ t("taxes.page.emptyTitle") }}</b>
      <p class="sm">{{ t("taxes.page.emptyText") }}</p>
      <p class="sm">{{ t("taxes.page.emptyPick") }}</p>
      <div v-for="g in EXG" :key="g.c" class="tax-exg">
        <h3>{{ t("taxes.page." + g.c) }}</h3>
        <div class="tax-exl">
          <button v-for="x in g.L" :key="x.ex" type="button" class="tax-ex" @click="addEx(x.ex)">
            <b>{{ t(x.nk) }}</b><span class="sm">{{ t("taxes.page.exd." + x.ex) }}</span>
            <svg class="tax-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>
      <button type="button" class="btn o s" @click="addOwn">{{ t("taxes.page.own") }}</button>
    </div>

    <div v-if="S" id="taxNotes" class="card tax-notes">
      <h3><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.info" />{{ t("taxes.page.notesTitle") }}</h3>
      <ul>
        <li><b>{{ t("taxes.page.noteEstB") }}</b> {{ t("taxes.page.noteEst") }}</li>
        <li><b>{{ t("taxes.page.noteBankB") }}</b> {{ t("taxes.page.noteBank") }}</li>
        <li><b>{{ t("taxes.page.noteYearB") }}</b> {{ t("taxes.page.noteYear") }}</li>
      </ul>
    </div>
  </section>

  <template v-if="S">
    <PopMenu :at="menu?.btn" @close="menu = null">
      <button v-for="[a, ic, z] in menuItems" :key="a" role="menuitem" :class="z ? 'dz' : undefined" @click="pick(a)"><svg viewBox="0 0 24 24" v-html="MI[ic]" />{{ t("taxes.page.menu." + a) }}</button>
    </PopMenu>
    <PopMenu :at="exMenu" cls="tax-exm" @close="exMenu = null">
      <button role="menuitem" @click="addOwn"><svg viewBox="0 0 24 24" v-html="MI.e" />{{ t("taxes.page.own") }}</button>
      <template v-for="g in EXG" :key="g.c">
        <div class="tax-mh">{{ t("taxes.page.menuEx." + g.c) }}</div>
        <button v-for="x in g.L" :key="x.ex" role="menuitem" @click="addEx(x.ex)"><svg viewBox="0 0 24 24" v-html="ICON.doc" />{{ t(x.nk) }}</button>
      </template>
    </PopMenu>

    <BaseDialog :open="!!moveFor" :title="t('taxes.page.move.title')" @update:open="(v) => !v && (moveFor = null)">
      <template v-if="moveFor">
        <p class="sm">{{ t("taxes.page.move.text") }}</p>
        <p class="sm">{{ t("taxes.page.move.usual", { date: dd(moveFor.key) }) }}</p>
        <div class="fld"><label for="txMove">{{ t("taxes.page.move.to") }}</label><input id="txMove" v-model="moveFor.to" type="date"></div>
      </template>
      <template #actions>
        <BaseButton v-if="moveFor && moveFor.to != moveFor.key" variant="outline" style="margin-inline-end:auto" @click="saveMove(true)">{{ t("taxes.page.move.back") }}</BaseButton>
        <BaseButton variant="outline" @click="moveFor = null">{{ t("taxes.page.move.cancel") }}</BaseButton>
        <BaseButton :disabled="!moveFor?.to" @click="saveMove(false)">{{ t("taxes.page.move.save") }}</BaseButton>
      </template>
    </BaseDialog>
  </template>
  </component>
</template>
