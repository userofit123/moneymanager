<script setup>
// Jars: money put aside for something:
// what is safe to put in jars, what went in this month, the amount kept untouched, each jar, goals and completed jars.
// What the page knows and does lives in pagelogic/jars.js (shared with the phone's Jars screens); "How is this worked out?"
// is the shared AvailWhy window, the ⋯ and history menus the shared PopMenu, a payment in a jar's history opens its entry window.
import { onMounted } from "vue";
import { vTip } from "../core/tooltip.js";
import BaseCard from "../components/BaseCard.vue";
import CardColumns from "../components/CardColumns.vue";
import BaseSheet from "../components/BaseSheet.vue";
import BaseTabs from "../components/BaseTabs.vue";
import MoneyInput from "../components/MoneyInput.vue";
import PageHeader from "../components/PageHeader.vue";
import PopMenu from "../components/PopMenu.vue";
import AvailWhy from "./AvailWhy.vue";
import { useJars } from "../pagelogic/jars.js";
import "../styles/pages/jars.css"; // this page's own styles

const {
  t, tk, data, M, home, save, ctx, fm, f0, tx, dstr, catLabel, bufText, setBuffer, bufShown, filling, fill,
  menu, toggleMenu, hist, histName, noteText, amtText, histOpen, HIST_N, allOf, allKind, openAll, allName, allHist, allKinds,
  openNew, openEdit, doneAsk, askDone, doDone, delAsk, askDel, doDel, relAmt, relAsk, doRelease, why,
  payoff, kindOf, stLabel, stTip, priTip, catTip, etaShow, etaTip, statTips, lateText, ringText, RC, KI, col,
  goalLine, GCLS, doneLine, goalFix, moveJar, moveJarTo, reopenJar,
} = useJars();
onMounted(() => { data.start(); });
</script>

<template>
  <PageHeader :title="t('nav.jars')" />
  <section class="view on" id="jars">
    <template v-if="!M">
      <p v-if="data.error.value" class="sm">{{ t("jars.loadError") }}</p>
      <p v-else class="sm">{{ t("jars.loading") }}</p>
    </template>

    <template v-else>
      <div class="jhero">
        <div class="jh1">
          <div class="lbl">{{ t("num.free") }}</div>
          <div class="val"><small>₪</small><span>{{ f0(M.F.free) }}</span></div>
          <div id="availSub" class="sm">
            <div class="sm">{{ t("jars.safeSub") }}</div>
            <div v-if="M.F.over > 0" class="jover"><b>{{ t("jars.tooMuch", { amount: fm(M.F.over) }) }}</b> {{ t("jars.tooMuchText") }}<div v-if="M.F.inJars > 0" class="flex" style="gap:8px;margin-top:8px"><button type="button" class="btn s" data-a="jarRelease" @click="relAsk = true">{{ t("jars.takeBack", { amount: fm(relAmt) }) }}</button></div></div>
            <button type="button" class="btn o s" style="margin-top:10px" data-a="availWhy" @click="why = true">{{ t("jars.howWorked") }}</button>
          </div>
        </div>
        <div class="jh2">
          <div class="lbl">{{ t("jars.thisMonth") }}</div>
          <div class="val"><small>₪</small>{{ f0(M.month.got) }}<span v-if="M.month.planned > 0" class="of">{{ " " + t("jars.of", { amount: fm(M.month.planned) }) }}</span></div>
          <div class="jbar"><i :class="M.month.waiting ? 'w' : M.month.done ? 'd' : ''" :style="{ width: M.month.pct + '%' }" /></div>
          <div class="sm">{{ M.month.done ? t("jars.allDone") : M.month.waiting ? (M.F.buffer > 0 ? t("jars.waitingKept", { amount: fm(M.month.still), kept: fm(M.F.buffer) }) : t("jars.waiting", { amount: fm(M.month.still) })) : t("jars.filling") }}</div>
          <div class="jstats">
            <div v-tip="statTips.putIn"><span>{{ t("jars.putIn") }}</span><b class="num">{{ fm(M.month.got) }}</b></div>
            <div v-tip="statTips.still"><span>{{ t("jars.still") }}</span><b class="num">{{ fm(M.month.still) }}</b></div>
            <div v-tip="statTips.avail"><span>{{ t("num.free") }}</span><b class="num" :class="{ neg: M.month.waiting }">{{ fm(M.F.free) }}</b></div>
          </div>
        </div>
      </div>

      <div class="card jbufc">
        <div class="kt"><div class="kh"><div><b>{{ t("jars.keep") }}</b><div class="sm">{{ t("jars.keepSub") }}</div></div></div></div>
        <div class="kctl">
          <div class="kchips"><button v-for="v in [0, 1000, 2000, 5000, 10000]" :key="v" type="button" :class="{ on: M.F.buffer == v }" data-a="bufSet" @click="setBuffer(v)">{{ v ? fm(v) : t("jars.none") }}</button></div>
          <div class="kin"><span class="kc">₪</span><MoneyInput id="jbuf" :model-value="bufShown" :placeholder="t('jars.other')" :aria-label="t('jars.keepLabel')" @update:model-value="bufText = $event" @change="setBuffer(bufText ?? M.F.buffer)" @keydown.enter="$event.target.blur()" /></div>
        </div>
      </div>

      <h2>{{ t("jars.jars") }}<span class="flex" style="gap:8px"><button v-if="M.has.any" type="button" class="btn o s" data-a="jarFill" :disabled="filling" @click="fill">{{ t("jars.fill") }}</button><button type="button" class="btn o s" data-a="jarNew" @click="openNew">{{ t("jars.newJar") }}</button></span></h2>
      <CardColumns id="jarg" :items="M.jars">
        <template #default="{ item: j }">
        <BaseCard class="jin">
          <div class="jhead">
            <div class="jhl">
              <div class="jname">{{ tx(j.n) }}</div>
              <div class="sm jk"><svg class="kic" viewBox="0 0 24 24" v-html="KI[j.type]" />{{ kindOf(j) }}</div>
            </div>
            <div class="jtools" data-menuanchor>
              <button type="button" class="bd jst jbtn" :class="j.state.cls" data-a="jarHist" v-tip="stTip(j)" aria-haspopup="menu" @click="toggleMenu(j.id, 'hist', $event)">{{ stLabel(j.state) }}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>
              <div class="jpill" data-ddanchor>
                <button type="button" data-a="jarUp" :disabled="j.ix == 0" :aria-label="t('jars.up')" @click="save((s) => moveJar(s, j.id, true))"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg></button>
                <span class="jpm" v-tip="priTip(j)"><svg class="pri" viewBox="0 0 24 24"><path d="M5 21V4M5 4h12l-3 4 3 4H5" /></svg>{{ j.ix + 1 }}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg><select :aria-label="t('jars.pick')" :value="j.ix + 1" @change="save((s) => moveJarTo(s, j.id, +$event.target.value))"><option v-for="(x, k) in M.jars" :key="x.id" :value="k + 1">{{ k + 1 }} · {{ tx(x.n) }}</option></select></span>
                <button type="button" data-a="jarDown" :disabled="j.ix == M.jars.length - 1" :aria-label="t('jars.down')" @click="save((s) => moveJar(s, j.id, false))"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>
              </div>
              <button type="button" class="ib jmore" data-a="jarMenu" :aria-label="t('jars.options')" aria-haspopup="menu" @click="toggleMenu(j.id, 'more', $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
            </div>
          </div>
          <div v-if="j.desc" class="jdesc">{{ j.desc }}</div>
          <div v-if="(j.cats || []).length" v-tip="catTip(j)" class="jcats"><span>{{ t("jars.paysFor") }}</span><i v-for="x in j.cats" :key="x.c">{{ catLabel(x.c) }}</i></div>
          <div class="jbody">
            <svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--s2)" stroke-width="9" /><circle cx="42" cy="42" r="34" fill="none" :stroke="col(j.p)" stroke-width="9" stroke-linecap="round" :stroke-dasharray="RC * Math.min(1, j.pc / 100) + ' ' + RC" transform="rotate(-90 42 42)" /><text x="42" y="46" text-anchor="middle" :style="{ fontSize: (j.open ? 12 : 15) + 'px', fontWeight: 600, fill: 'var(--tx)' }">{{ ringText(j) }}</text></svg>
            <div class="jstat3" :class="{ c3: !j.state.eta }">
              <div><span>{{ payoff(j) ? t("jars.paidBack") : t("jars.saved") }}</span><b class="num">₪{{ f0(j.bal) }}</b></div>
              <div><span>{{ payoff(j) ? t("jars.owed") : t("jars.goal") }}</span><b class="num">{{ j.open ? t("jars.none") : "₪" + f0(j.need) }}</b></div>
              <div><span>{{ t("jars.monthly") }}</span><b class="num">{{ j.cap == null ? t("jars.topUp") : "₪" + f0(j.capE) }}</b></div>
              <div v-if="j.state.eta" v-tip="etaTip(j.state.eta)"><span>{{ t("jars.fullBy") }}</span><b class="num">{{ etaShow(j.state.eta) }}</b></div>
            </div>
          </div>
          <div v-if="j.state.late" class="jwarn">{{ lateText(j.state.late) }}</div>
        </BaseCard>
        </template>
      </CardColumns>

      <h2>{{ t("jars.goals") }}<button type="button" class="btn o s" data-a="goalNew" @click="openNew">{{ t("jars.newGoal") }}</button></h2>
      <div class="sm gnote" style="line-height:1.5">{{ t("jars.goalsNote") }}</div>
      <div class="card" id="goals">
        <div v-for="g in M.goals" :key="g.id" class="grow2">
          <div class="gh">
            <div><b>{{ tx(g.n) }}</b><div class="sm num">{{ t("jars.goalOf", { bal: fm(g.bal), need: fm(g.need), pc: Math.round(g.pc) }) }}</div></div>
            <div class="gr"><span class="bd" :class="GCLS[g.st]">{{ tk("jars.g." + g.st) }}</span>
              <button v-if="g.st === 'reached'" type="button" class="btn s" data-a="jarDone" @click="askDone(g.id)">{{ t("jars.markDone") }}</button>
              <button v-else-if="g.fix" type="button" class="btn s" data-a="goalFix" @click="save((s) => goalFix(s, g.id, ctx()))">{{ t("jars.raise", { amount: fm(g.fix) }) }}</button>
            </div>
          </div>
          <div class="bar" style="margin:10px 0 6px"><i :style="{ width: g.pc + '%', background: col(g.p) }" /></div>
          <div class="sm">{{ goalLine(g) }}</div>
        </div>
        <div v-if="!M.goals.length" class="sm" style="padding:14px 0">{{ t("jars.noGoals") }}</div>
      </div>

      <div id="jdoneW">
        <template v-if="M.done.length">
          <h2>{{ t("jars.completed") }}<span class="sm" style="font-weight:500">{{ M.done.length }}</span></h2>
          <div class="card">
            <div v-for="d in M.done" :key="d.id" class="grow2">
              <div class="gh">
                <div><b>{{ tx(d.n) }}</b><div class="sm">{{ doneLine(d) }}</div><div v-if="d.desc" class="sm" style="margin-top:2px">{{ d.desc }}</div></div>
                <div class="gr"><button type="button" class="btn o s" data-a="jarHist" aria-haspopup="menu" @click="toggleMenu(d.id, 'hist', $event)">{{ t("jars.historyBtn") }}</button><button type="button" class="btn o s" data-a="jarReopen" @click="save((s) => reopenJar(s, d.id))">{{ t("jars.reopen") }}</button></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="M">
    <PopMenu :at="menu?.btn" :cls="menu?.kind == 'hist' ? 'hist' : ''" @close="menu = null">
      <template v-if="menu?.kind == 'more'">
        <button role="menuitem" data-a="jarEdit" @click="openEdit(menu.id)"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>{{ t("jars.menu.edit") }}</button>
        <button role="menuitem" data-a="jarDone" @click="askDone(menu.id)"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>{{ t("jars.markDone") }}</button>
        <button role="menuitem" class="dz" data-a="jarDel" @click="askDel(menu.id)"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>{{ t("jars.menu.del") }}</button>
      </template>
      <template v-else-if="menu">
        <div class="hh">{{ t("jars.hist.title", { name: tx(histName) }) }}</div>
        <div v-for="(h, i) in hist.slice(0, HIST_N)" :key="i" class="hr" :class="{ hs: h.pay }" :data-a="h.pay ? 'openTx' : undefined" @click="h.pay && histOpen(h)"><span class="hd">{{ h.earlier ? t("jars.hist.earlier") : dstr(h.d) }}</span><span class="hn">{{ noteText(h) }}</span><b class="num" :class="h.pay ? (h.payoff ? '' : 'neg') : h.amt < 0 ? 'neg' : 'pos'">{{ amtText(h) }}</b></div>
        <div v-if="!hist.length" class="he2">{{ t("jars.hist.none") }}</div>
        <button v-else-if="hist.length > HIST_N" type="button" class="hall" data-a="jarHistAll" @click="openAll">{{ t("jars.hist.all", { n: hist.length }) }}</button>
      </template>
    </PopMenu>

    <BaseSheet :open="allOf != null" :label="t('jars.hist.title', { name: tx(allName) })" @close="allOf = null">
      <h3>{{ t("jars.hist.title", { name: tx(allName) }) }}</h3>
      <BaseTabs v-model="allKind" :options="allKinds" :label="t('jars.hist.show')" />
      <div class="hist hsheet">
        <div v-for="(h, i) in allHist" :key="i" class="hr" :class="{ hs: h.pay }" :data-a="h.pay ? 'openTx' : undefined" @click="h.pay && histOpen(h)"><span class="hd">{{ h.earlier ? t("jars.hist.earlier") : dstr(h.d) }}</span><span class="hn">{{ noteText(h) }}</span><b class="num" :class="h.pay ? (h.payoff ? '' : 'neg') : h.amt < 0 ? 'neg' : 'pos'">{{ amtText(h) }}</b></div>
        <div v-if="!allHist.length" class="he2">{{ t("jars.hist.noneHere") }}</div>
      </div>
    </BaseSheet>

    <BaseSheet :open="!!doneAsk" @close="doneAsk = null">
      <h3>{{ t("jars.done.title", { name: tx(doneAsk?.n || "") }) }}</h3>
      <div class="sm" style="margin-bottom:14px;line-height:1.5">{{ t("jars.done.text") }}<template v-if="doneAsk?.bal > 0">{{ " " }}{{ t("jars.done.back", { amount: fm(doneAsk.bal) }) }}</template></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" data-a="close" @click="doneAsk = null">{{ t("jars.cancel") }}</button><button type="button" class="btn" data-a="jdYes" @click="doDone">{{ t("jars.markDone") }}</button></div>
    </BaseSheet>

    <BaseSheet :open="!!delAsk" @close="delAsk = null">
      <h3>{{ t("jars.del.title", { name: tx(delAsk?.n || "") }) }}</h3>
      <div class="sm" style="margin-bottom:14px;line-height:1.5">{{ t("jars.del.text") }}</div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" data-a="close" @click="delAsk = null">{{ t("jars.cancel") }}</button><button type="button" class="btn r" data-a="jarDelYes" @click="doDel">{{ t("jars.menu.del") }}</button></div>
    </BaseSheet>

    <BaseSheet :open="relAsk" @close="relAsk = false">
      <h3>{{ t("jars.takeBack", { amount: fm(relAmt) }) }}</h3>
      <div class="sm" style="margin-bottom:14px;line-height:1.5">{{ t("jars.rel.text", { amount: fm(relAmt) }) }}</div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" data-a="close" @click="relAsk = false">{{ t("jars.cancel") }}</button><button type="button" class="btn" data-a="jarReleaseYes" @click="doRelease">{{ t("jars.rel.yes") }}</button></div>
    </BaseSheet>

    <AvailWhy v-if="home" v-model:open="why" :M="home" />
  </template>
</template>

<style>
/* "See all" at the end of a jar's history menu, and the whole history in a window */
.hist .hall { display: block; width: 100%; padding: 9px 10px; border: 0; border-top: 1px solid var(--ol); background: none; color: var(--acc); font: inherit; font-size: 13px; font-weight: 600; text-align: start; cursor: pointer; border-radius: 0; }
.hist .hall:hover { background: var(--s2); }
.hsheet { display: block; margin-top: 12px; }
/* a payment line (.hs) also matches the help guide's section style (.hs, margin under it), which would spread the lines apart */
.hist .hr.hs { margin: 0; }
.hsheet .hr:first-child { border-top: 0; }
</style>
