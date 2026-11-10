<script setup>
// The entry window: one transaction, with its details, sections and actions.
// One for the whole app, opened with openTx(id) (core/txwin.js) from Activity, Home, Alerts, Bills, Accounts...
// What it knows and does is in pagelogic/transaction.js (shared with the phone's transaction screen).
import { tx as heTx } from "../../core/heText.js";
import { catColor, catLabel } from "../../core/cats.js";
import { txOpenId, closeTx, openPop } from "../../core/txwin.js";
import { openDocs } from "../../core/docs.js";
import { amtText, SYM, CHIP_ICON, inWhy } from "../../lib/txrows.js";
import { MARKS } from "../../lib/moneyIn.js";
import { prettyKey } from "../../lib/activity.js";
import { f0 } from "../../format.js";
import { dstr } from "../../dates.js";
import { useTransaction } from "../../pagelogic/transaction.js";
import BaseSheet from "../BaseSheet.vue";
import TagEditor from "../TagEditor.vue";

const { t, tk, S, cur, name, nohtml, avStyle, isXf, isPos, chips, kindText, kindCls, cats, close, goCat, goTag, det, facts, rawFields, factText, sec, toggleSec, setName, setCat, setNote, addTags, removeTag, mi, autoMark, markIn, TIC, rels, hasHist, histOf, tiles, attach, changes, when, copyDetails } = useTransaction(txOpenId, { close: closeTx });
</script>

<template>
  <BaseSheet :open="!!cur" cls="txw" @close="close">
    <div class="txp">
      <div class="txgrid2">
        <div class="txmain">
          <div class="txh2"><span class="av" :style="avStyle(cur)">{{ (name(cur) || "?")[0] }}</span>
            <div class="tt"><h3>{{ name(cur) }}</h3><div class="sm">{{ dstr(cur.d) }}{{ cur.from && cur.to ? " · " + nohtml(cur.from) + " → " + nohtml(cur.to) : cur.from || cur.to ? " · " + nohtml(cur.from || cur.to) : "" }}</div></div>
            <div class="txam"><b class="num" :class="{ pos: isPos(cur) }" dir="ltr">{{ amtText(cur) }}</b><div v-if="cur.orig" class="sm" dir="ltr">{{ SYM[cur.orig.cur] || "" }}{{ f0(cur.orig.amt) }} {{ cur.orig.cur }}</div></div>
          </div>
          <div class="txchips"><span class="tb" :class="kindCls(cur)">{{ kindText(cur) }}</span>
            <span v-if="!cur.virtual && !isXf(cur) && cur.c" class="chip catl" @click="goCat(cur.c)"><span class="dot" :style="{ background: catColor(S, cur.c) }"></span>{{ catLabel(cur.c) }}</span>
            <template v-for="c in chips(cur)" :key="c.cls"><span class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span> </template>
            <span v-for="g in cur.tags || []" :key="g" class="tag catl" @click="goTag(g)">{{ g }}</span></div>
          <div id="txDet" class="kvc">
            <div class="kv"><div v-for="r in facts" :key="r.k" class="kvr"><span class="k">{{ tk("activity.d." + r.k) }}</span><span class="v" :class="{ mono: r.mono }" :data-tip="String(factText(r.v))">{{ factText(r.v) }}</span></div></div>
            <details v-if="rawFields.length" class="kvd"><summary><span>{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }}</span><em>{{ rawFields.length }}</em></summary><div v-for="[a, b] in rawFields" :key="a" class="kvr"><span class="k">{{ prettyKey(a) }}</span><span class="v" :data-tip="String(b).slice(0, 600)">{{ b }}</span></div></details>
            <div v-if="det === 'load'" class="kvn"><i class="spinner"></i> {{ t("activity.d.loading") }}</div>
            <div v-else-if="!cur.virtual && (!det || (cur.src !== 'manual' && !det.details))" class="kvn">{{ cur.src === "manual" ? t("activity.d.manual") : t("activity.d.old") }}</div>
          </div>
        </div>
        <aside class="txside">
          <details v-if="mi" class="txs2" data-s="mi" :open="!!sec.mi" @toggle="toggleSec('mi', $event)"><summary><span class="sct">{{ t("txw.mi.title") }}</span><em>{{ t("txw.mi.k." + mi.mark) }}</em></summary><div class="sbd">
            <div class="sm">{{ t("txw.mi.tip." + mi.mark) }}</div>
            <div class="sm" style="margin-top:4px"><b>{{ mi.chosen ? t("txw.mi.why.chosen") : inWhy(mi.r) }}</b></div>
            <div class="kchips" role="radiogroup" :aria-label="t('txw.mi.title')"><button v-for="m in MARKS" :key="m" type="button" role="radio" :aria-checked="mi.mark === m" :class="{ on: mi.mark === m }" @click="markIn(cur, m)">{{ t("txw.mi.k." + m) }}</button><button v-if="mi.chosen" type="button" :data-tip="t('txw.mi.autoTip', { k: t('txw.mi.k.' + autoMark) })" @click="markIn(cur, '')">{{ t("txw.mi.auto") }}</button></div>
          </div></details>
          <details v-if="!cur.virtual && !isXf(cur)" class="txs2" data-s="org" :open="!!sec.org" @toggle="toggleSec('org', $event)"><summary><span class="sct">{{ t("activity.d.organise") }}</span></summary><div class="sbd">
            <div class="fld"><label>{{ t("activity.d.displayName") }}</label><div style="display:flex;gap:6px"><input :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="name(cur)" maxlength="80" style="flex:1;min-width:0" @change="setName(cur, $event.target.value)" /><button type="button" class="btn o s" @click="openPop('nameRule', { id: cur.id })">{{ t("activity.w.nrRule") }}</button></div></div>
            <div class="two"><div class="fld"><label>{{ t("activity.category") }}</label><select :value="cur.c && cur.c !== 'Uncategorized' ? cur.c : ''" @change="setCat(cur, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ catLabel(c) }}</option></select></div>
              <div class="fld"><label>{{ t("activity.w.tags") }}</label><TagEditor :tags="cur.tags || []" @add="(L) => addTags(cur, L)" @remove="(i) => removeTag(cur, cur.tags[i])" @go="goTag" /></div></div>
          </div></details>
          <details v-if="!cur.virtual" class="txs2" data-s="note" :open="!!sec.note" @toggle="toggleSec('note', $event)"><summary><span class="sct">{{ t("activity.d.note") }}</span><em v-if="cur.note && !isXf(cur)">{{ t("activity.w.added") }}</em></summary><div class="sbd"><div class="fld"><label>{{ t("activity.d.note") }}</label><textarea rows="2" :placeholder="t('activity.d.notePh')" :value="cur.note || ''" @change="setNote(cur, $event.target.value)" /></div></div></details>
          <details v-if="rels.length" class="txs2" data-s="rel" :open="!!sec.rel" @toggle="toggleSec('rel', $event)"><summary><span class="sct">{{ t("activity.d.whatIs") }}</span><i v-if="rels.some((r) => r.cls === 'amber')" class="tfl" :data-tip="t('activity.w.needsLook')"></i><em>{{ rels.length }}</em></summary><div class="sbd"><div class="rels">
            <div v-for="r in rels" :key="r.title + r.ic" class="rel" :class="r.cls"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[r.ic]"></svg></span><div class="rb"><b>{{ r.title }}</b><div v-if="r.text" class="sm">{{ r.text }}</div><div v-if="r.btns" class="ra"><button v-for="b in r.btns" :key="b.label" type="button" class="btn s" :class="b.cls === 'f' ? '' : b.cls || 'o'" @click="b.run()">{{ b.label }}</button></div></div></div>
          </div></div></details>
          <details v-if="tiles.length" class="txs2" data-s="act" :open="!!sec.act" @toggle="toggleSec('act', $event)"><summary><span class="sct">{{ t("activity.d.actions") }}</span><em>{{ tiles.length }}</em></summary><div class="sbd"><div class="tiles">
            <button v-for="x in tiles" :key="x.title" type="button" class="atile" :class="{ hot: x.hot }" @click="x.run()"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[x.ic]"></svg></span><span class="at"><b>{{ x.title }}</b><small>{{ x.sub }}</small></span></button>
          </div></div></details>
          <details v-if="!cur.virtual && cur.docs && cur.docs.length" class="txs2" data-s="doc" :open="!!sec.doc" @toggle="toggleSec('doc', $event)"><summary><span class="sct">{{ t("activity.w.docs") }}</span><em>{{ cur.docs.length }}</em></summary><div class="sbd"><div class="docrow"><button v-for="(d, i) in cur.docs" :key="i" type="button" class="chip dchip" @click="openDocs(cur.id, i)"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg>{{ d }}</button></div></div></details>
          <details v-if="changes.length" class="txs2" data-s="hist" :open="!!sec.hist" @toggle="toggleSec('hist', $event)"><summary><span class="sct">{{ t("activity.d.history") }}</span><em>{{ changes.length }}</em></summary><div class="sbd"><div class="hlist"><div v-for="a in changes" :key="a.t + a.action + a.detail" class="hrow"><div class="hh"><b>{{ heTx(a.action) }}</b><span class="hw">{{ when(a.t) }}</span></div><div class="hdt">{{ heTx(nohtml(a.detail || "")) }}</div></div></div></div></details>
        </aside>
      </div>
      <div class="txfoot"><button v-if="hasHist" type="button" class="btn o" @click="histOf(cur)"><svg viewBox="0 0 24 24" v-html="TIC.hist"></svg> {{ t("txw.w.payHist") }}</button>
        <button type="button" class="btn o" @click="copyDetails">{{ t("activity.d.copy") }}</button>
        <label v-if="!cur.virtual" class="btn o upl" style="margin-inline-end:auto"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg> {{ t("activity.w.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach($event)" /></label><span v-else style="margin-inline-end:auto"></span>
        <button type="button" class="btn" @click="close">{{ t("activity.d.done") }}</button></div>
    </div>
  </BaseSheet>
</template>
