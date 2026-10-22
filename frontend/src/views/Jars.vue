<script setup>
// Jars: money put aside for something:
// what is safe to put in jars, what went in this month, the amount kept untouched, each jar, goals and completed jars.
// The jar changes (lib/jars.js) write history lines and undo entries; "How is this worked out?" is the
// shared AvailWhy window, the ⋯ and history menus the shared PopMenu, a payment in a jar's history opens its entry window.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { jars as M, home } from "../core/derived.js";
import { openForm } from "../core/forms.js";
import { openTx } from "../core/txwin.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { catLabel } from "../core/cats.js";
import { vTip, TP } from "../core/tooltip.js";
import { fm, f0 } from "../format.js";
import { dstr } from "../dates.js";
import { isolateNumbers } from "../core/polish.js";
import BaseCard from "../components/BaseCard.vue";
import BaseSheet from "../components/BaseSheet.vue";
import BaseTabs from "../components/BaseTabs.vue";
import MoneyInput from "../components/MoneyInput.vue";
import PageHeader from "../components/PageHeader.vue";
import PopMenu from "../components/PopMenu.vue";
import AvailWhy from "./AvailWhy.vue";
import { jarCtx, releaseJars, markDone, deleteJar, jarHistory, jarFormOf, goalFix, moveJar, moveJarTo, reopenJar } from "../lib/jars.js";
import { displayName } from "../lib/activity.js";
import "../styles/pages/jars.css"; // this page's own styles

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
onMounted(() => { data.start(); });

const S = computed(() => data.state.value);
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const mlab = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });

// Every change goes through the data store: edit(copy) gives back its history lines [[action, detail, undo?], ...] or false.
const save = (edit) => data.change((next) => { const r = edit(next); return r && r.length ? r : r === false ? false : []; });
const ctx = () => jarCtx(M.value, fm); // what the changes need to write their history lines

// Keep untouched (#jbuf): changing it writes no history line.
const bufText = ref(null);
const setBuffer = (v) => { v = Math.max(0, +v || 0); bufText.value = null; save((s) => { if ((+s.jarsBuffer || 0) === v) return false; s.jarsBuffer = v; return []; }); };
const bufShown = computed(() => (bufText.value != null ? bufText.value : M.value.F.buffer || ""));

const filling = ref(false);
async function fill() {
  filling.value = true;
  try {
    const j = await data.api("/api/jars/fill", { method: "POST" });
    toast(j.applied ? t("jars.filled", { n: j.applied, amount: fm(j.total || 0) }, j.applied) : t("jarp.nothing"), { title: t("nav.jars") });
    await data.load();
  } catch (e) { toast(tx(e.message || t("jars.saveFailed")), { kind: "err" }); }
  filling.value = false;
}

// The ⋯ menu and the history menu: { id, kind: "more" | "hist", btn }.
const menu = ref(null);
const toggleMenu = (id, kind, ev) => { menu.value = menu.value && menu.value.id == id && menu.value.kind == kind ? null : { id, kind, btn: ev.currentTarget }; };
const hist = computed(() => (menu.value && menu.value.kind == "hist" ? jarHistory(S.value, menu.value.id, (x) => displayName(S.value, x)) : []));
const histName = computed(() => (menu.value ? (S.value.jars || []).find((j) => j.id == menu.value.id)?.n || "" : ""));
// names and notes come from the data (names are shown through tx() too);
// notes (the app's and the server's English, "Auto-fill 2026-10"): shown in Hebrew through tx() (core/heSaved.js)
const noteText = (h) => (h.earlier ? t(h.note == "start" ? "jars.hist.start" : "jars.hist.untracked") : h.pay ? t(h.payoff ? "jars.hist.paidBack" : "jars.hist.paid", { name: "\u2068" + h.name + "\u2069" }) : tx(h.note));
const amtText = (h) => (h.pay && h.payoff ? "" : h.amt < 0 ? "−" : "+") + "₪" + f0(h.amt);
const histOpen = (h) => { menu.value = null; allOf.value = null; openTx(h.id); };
// The menu shows the latest lines; "See all" opens the whole history in a window, where it can be narrowed down.
const HIST_N = 8;
const allOf = ref(null), allKind = ref("all");
const openAll = () => { allOf.value = menu.value.id; allKind.value = "all"; menu.value = null; };
const allName = computed(() => (S.value.jars || []).find((j) => j.id == allOf.value)?.n || "");
const allHist = computed(() => (allOf.value == null ? [] : jarHistory(S.value, allOf.value, (x) => displayName(S.value, x))).filter((h) => allKind.value == "all" || (allKind.value == "pay" ? h.pay : !h.pay && (allKind.value == "in" ? h.amt > 0 : h.amt < 0))));
const allKinds = computed(() => ["all", "in", "out", "pay"].map((value) => ({ value, label: t("jars.hist.k." + value) })));

// New jar, new goal and edit: the shared window (components/forms/JarFormHost.vue).
const openNew = () => openForm("jar", { start: { kind: "goal" } });
const openEdit = (id) => { const j = S.value.jars.find((x) => x.id == id); menu.value = null; if (j) openForm("jar", { id, start: jarFormOf(j) }); };
// Mark as done, delete, take back from the jars: each asks first.
const doneAsk = ref(null), delAsk = ref(null), relAsk = ref(false);
const askDone = (id) => { menu.value = null; doneAsk.value = S.value.jars.find((x) => x.id == id) || null; };
const doDone = () => { const id = doneAsk.value.id; doneAsk.value = null; save((next) => markDone(next, id, M.value.today, ctx())); };
const askDel = (id) => { menu.value = null; delAsk.value = S.value.jars.find((x) => x.id == id) || null; };
const doDel = () => { const id = delAsk.value.id; delAsk.value = null; save((next) => deleteJar(next, id)); };
const relAmt = computed(() => Math.min(M.value.F.over, M.value.F.inJars));
const doRelease = () => { relAsk.value = false; const over = M.value.F.over; if (!(over > 0)) return; save((next) => { const l = releaseJars(next, over, ctx()); return l.length ? l : false; }); toast(t("jars.rel.done")); };
const why = ref(false);

// One jar's texts.
const ALLB = { "*": "all", "*i": "allIrregular", "*a": "allAny" };
const payoff = (j) => j.kind === "payoff";
const kindOf = (j) => (payoff(j) ? t("jars.kind.payoff") : j.type !== "bill" ? (j.type === "month" ? t("jars.kind.month") : t("jars.kind.goal")) : ALLB[j.bill] ? tk("jars.kind." + ALLB[j.bill]) : j.billName || t("jars.kind.bill"));
const stLabel = (s) => (s.key === "needs" ? t("jars.st.needs", { amount: fm(s.want) }) : tk("jars.st." + s.key));
// The tooltips' layout: a title, rows, a line, a note.
const T = (k, v) => tk("jarp.tip." + k, v);
function stTip(j) {
  const s = j.state;
  const tip = s.key === "noAuto" ? TP(T("noAutoT"), [], T("noAutoN"))
    : s.key === "full" || s.key === "paidOff" ? TP(T("fullT"), [[T("nowIn"), fm(j.bal)], ...(j.need > 0 ? [[t("jars.goal"), fm(j.need)]] : [])], T(s.bill ? "fullBillN" : "fullN"))
    : s.key === "funded" ? TP(T("fundedT"), [[T("putIn"), fm(s.got)], ...(s.bill ? [] : [[T("monthly"), fm(s.share)]])], T("fundedN"))
    : s.key === "partly" ? TP(T("partlyT"), [[T("putIn"), fm(s.got)], [T("monthly"), fm(s.share)], [T("stillDue"), fm(s.want)]], T("partlyN"))
    : TP(T("needsT"), [...(s.share > 0 ? [[T("monthly"), fm(s.share)]] : []), [T("putInMonth"), fm(0)], [T("stillDue"), fm(s.want)]], t(s.soon ? "jars.stTip.needsSoon" : "jars.stTip.needsNo"));
  return tip + "\n" + t("jars.history");
}
const priTip = (j) => TP(t("jars.priority", { n: j.ix + 1, total: M.value.jars.length }), [], T("priorityN"));
const catTip = (j) => TP(T("catsT"), [...j.cats.map((x) => [catLabel(x.c), T("spent", { amount: fm(M.value.spend[x.c] || 0) })]), "---", [T("paidMonth"), fm(j.autoPaid)], [T("stillIn"), fm(j.bal)]], t("jars.paysForTip"));
const etaWhen = (e) => (e.k ? mlab(e.when) : t("jars.over5"));
// on the card, in Hebrew the year stays left to right (יוני ⁦2028⁩)
const etaShow = (e) => (locale.value === "he" ? isolateNumbers(etaWhen(e)) : etaWhen(e));
const etaTip = (e) => TP(T("fullByT", { when: etaWhen(e) }), [[T("toSave"), fm(e.left)], [T("perMonth"), fm(e.cap)], [T("monthsTo"), e.k ? String(e.k) : "60+"], ...(e.due ? [[T("deadline"), mlab(e.due)]] : [])]);
const statTips = computed(() => { const m = M.value.month, F = M.value.F; return {
  putIn: TP(t("jars.putIn"), [[T("thisMonth"), fm(m.got)]], T("putInNote")),
  still: TP(t("jars.still"), [[T("needed"), fm(m.still)]], T("stillNote")),
  avail: TP(t("jars.avail"), [[t("jars.av.cash"), fm(F.cash)], [T("inJars"), fm(F.inJars)], ...(F.buffer ? [[t("jarp.kept"), fm(F.buffer)]] : []), [T("reserve"), fm(F.reserve)], "---", [T("freeIn"), fm(F.free)]], T("availNote")),
}; });
const lateText = (l) => (l.kind === "after" ? t("jars.lateAfter", { when: mlab(l.when), due: mlab(l.due), amount: fm(l.need) }) : t("jars.lateNever", { due: mlab(l.due) }));
const ringText = (j) => (j.open ? "₪" + (j.bal >= 1e4 ? Math.round(j.bal / 1e3) + "k" : f0(j.bal)) : j.pc + "%");
const RC = 2 * Math.PI * 34;
const KI = { goal: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', month: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>', bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>' };
const col = (p) => `var(--c${(p - 1) % 7})`;

// One goal's line.
function goalLine(g) {
  if (g.st === "reached") return t("jars.reachedLine");
  if (g.due) return t("jars.dueLine", { due: mlab(g.due), m: g.m, req: fm(g.req), c: fm(g.c) }, g.m) + (g.short ? " · " + t("jars.dueShort") : "");
  if (g.st === "saving") return g.k ? t("jars.savingLine", { c: fm(g.c), k: g.k, when: mlab(g.when) }, g.k) : t("jars.savingNever", { c: fm(g.c) });
  return t("jars.noneLine");
}
const GCLS = { reached: "dn", ontrack: "dn", behind: "up", saving: "am2", none: "fl" };
const doneLine = (d) => [t("jars.doneOn", { date: dstr(d.done) }), d.need > 0 ? t("jars.goalAmt", { amount: fm(d.need) }) : "", d.count ? t("jars.paidOut", { amount: fm(d.paid), n: d.count }, d.count) : ""].filter(Boolean).join(" · ");
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
          <div class="lbl">{{ t("jars.safe") }}</div>
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
            <div v-tip="statTips.avail"><span>{{ t("jars.avail") }}</span><b class="num" :class="{ neg: M.month.waiting }">{{ fm(M.F.free) }}</b></div>
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
      <div class="grid g2" id="jarg">
        <BaseCard v-for="j in M.jars" :key="j.id" class="jin">
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
      </div>

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
