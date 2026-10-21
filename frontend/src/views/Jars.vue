<script setup>
// Jars: money put aside for something. A copy of the current app's Jars page (web/js/04-transactions.js, renderJars):
// what is safe to put in jars, what went in this month, the amount kept untouched, each jar, goals and completed jars.
// Saves like the old page (PUT /api/state, POST /api/jars/fill). New jar, editing, history, mark as done, delete,
// "Take back from the jars" and "How is this worked out?" work the same way as there (web/js/08-jars.js, 04-transactions.js openAvail).
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import BaseCard from "../components/BaseCard.vue";
import BaseButton from "../components/BaseButton.vue";
import PageHeader from "../components/PageHeader.vue";
import BaseDialog from "../components/BaseDialog.vue";
import JarForm from "./JarForm.vue";
import { jarsModel, releaseJars, markDone, deleteJar, jarHistory, saveJar, jarFormOf } from "./jars.js";
import { displayName } from "./activity.js";
import { vTip, placeMenu } from "./jars-ui.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const n0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
const fm = (v) => (v < 0 ? "−" : "") + "₪" + n0(v);

const fx = ref({});
onMounted(async () => {
  data.start();
  try { const r = await fetch("/api/fx", { cache: "no-store" }); if (r.ok) fx.value = (await r.json()).fx || {}; } catch { /* no rates: foreign money counts at 1 */ }
});

const S = computed(() => data.state.value);
// The Forecast page's choices, saved by the current app in this browser; the "Full by" dates use the same guess.
const fcOpt = (() => { try { return JSON.parse(localStorage.getItem("moneyFc") || "null") || {}; } catch { return {}; } })();
const M = computed(() => jarsModel(S.value, new Date(), fx.value, fcOpt));
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const mlab = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
const dstr = (d) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString(loc.value, { day: "numeric", month: "short", year: "numeric" });

// Saving: change a copy, send the whole state like the old page, then load the fresh copy. 409 means a sync changed the data first.
async function save(edit, action, detail) {
  const next = structuredClone(S.value);
  const r = edit(next); if (r === false) return;
  // edit can give back its own history lines as [[action, detail], ...] (one per change, like the current app).
  const lines = Array.isArray(r) ? r : [[action, detail]], at = new Date().toISOString();
  next.audit = [...lines.map(([a, d]) => ({ t: at, who: "You", action: a, detail: d, undo: null })).reverse(), ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  try {
    const r = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    if (!r.ok) say(r.status === 409 ? t("jars.stale") : t("jars.saveFailed"), "err");
  } catch { say(t("jars.saveFailed"), "err"); }
  await data.load();
}
const toast = ref(null); // { m, kind }: the old app's toast box
let toastTimer = null;
const say = (m, kind = "ok") => { toast.value = { m, kind }; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null; }, kind === "err" ? 3800 : 3800); };

// Keep untouched.
const bufText = ref(null);
const setBuffer = (v) => { v = Math.max(0, Math.round(+v || 0)); bufText.value = null; save((s) => { if ((+s.jarsBuffer || 0) === v) return false; s.jarsBuffer = v; }, "Changed amount kept untouched", fm(v)); };
const bufShown = computed(() => (bufText.value != null ? bufText.value : M.value.F.buffer || ""));

// Priority: jar 1 fills first.
const order = (s) => s.jars.filter((j) => !j.done).sort((a, b) => a.p - b.p);
function moveTo(id, pos) {
  save((s) => { const L = order(s), i = L.findIndex((j) => j.id == id); if (i < 0 || pos < 1 || pos > L.length || pos - 1 == i) return false; const [j] = L.splice(i, 1); L.splice(pos - 1, 0, j); L.forEach((x, k) => { x.p = k + 1; }); }, "Reordered jars", (S.value.jars.find((j) => j.id == id) || {}).n + " is now priority " + pos);
}
const raiseCap = (g) => save((s) => { const j = s.jars.find((x) => x.id == g.id); if (!j) return false; j.auto = false; j.cap = g.fix; }, "Edited jar", g.n + ": monthly amount → " + fm(g.fix));
const reopen = (d) => save((s) => { const j = s.jars.find((x) => x.id == d.id); if (!j) return false; j.done = ""; j.p = Math.max(0, ...s.jars.filter((x) => !x.done).map((x) => x.p)) + 1; }, "Reopened jar", d.n);

const filling = ref(false);
async function fill() {
  filling.value = true;
  try {
    const r = await fetch("/api/jars/fill", { method: "POST" }); if (!r.ok) throw 0; const j = await r.json();
    say(j.applied ? t("jars.filled", { n: j.applied, amount: fm(j.total || 0) }, j.applied) : t("jars.nothingToFill"));
    await data.load();
  } catch { say(t("jars.saveFailed"), "err"); }
  filling.value = false;
}

// The jar actions. ctx: what the change needs to write its history lines.
const ctx = () => ({ fm, dstr: (d) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), BC: M.value.bills.BC, bills: M.value.bills, today: M.value.today, MK: M.value.MK });
const menu = ref(null); // { id, kind: "more" | "hist", btn }
const menuEl = ref(null);
const toggleMenu = (id, kind, ev) => {
  if (menu.value && menu.value.id == id && menu.value.kind == kind) { menu.value = null; return; }
  menu.value = { id, kind, btn: ev.currentTarget };
  nextTick(() => menuEl.value && placeMenu(menuEl.value, menu.value.btn));
};
const closeMenus = (e) => { if (menu.value && !e.target.closest("[data-a=jarMenu],[data-a=jarHist],.cmenu.hist")) menu.value = null; };
const onKey = (e) => { if (e.key === "Escape") menu.value = null; };
const onScroll = (e) => { if (menu.value && !(e.target.closest && e.target.closest(".cmenu"))) menu.value = null; };
onMounted(() => { document.addEventListener("click", closeMenus); document.addEventListener("keydown", onKey); addEventListener("scroll", onScroll, { passive: true, capture: true }); });
onBeforeUnmount(() => { document.removeEventListener("click", closeMenus); document.removeEventListener("keydown", onKey); removeEventListener("scroll", onScroll, { capture: true }); });
const hist = computed(() => (menu.value && menu.value.kind == "hist" ? jarHistory(S.value, menu.value.id, (x) => displayName(S.value, x)) : []));
const histName = computed(() => (menu.value ? (S.value.jars || []).find((j) => j.id == menu.value.id)?.n || "" : ""));
const NOTES = { "Edited by you": "edited", "Marked as done": "markedDone", "Released back to free money": "released", "Payment taken back": "taken" };
const noteText = (h) => (h.earlier ? t(h.note == "start" ? "jars.hist.start" : "jars.hist.untracked") : h.pay ? t(h.payoff ? "jars.hist.paidBack" : "jars.hist.paid", { name: h.name }) : NOTES[h.note] ? tk("jars.hist." + NOTES[h.note]) : h.note);
const amtText = (h) => (h.pay && h.payoff ? "" : h.amt < 0 ? "−" : "+") + "₪" + n0(h.amt);

// New jar, new goal and edit.
const form = ref({ open: false, id: 0, start: null });
const openNew = () => { form.value = { open: true, id: 0, start: { kind: "goal" } }; };
const openEdit = (id) => { const j = S.value.jars.find((x) => x.id == id); if (!j) return; menu.value = null; form.value = { open: true, id, start: jarFormOf(j) }; };
function saveForm(f) {
  let res = null;
  const probe = structuredClone(S.value); res = saveJar(probe, form.value.id, f, ctx());
  if (res.err) { say(tk("jars.form.e." + res.err), "err"); const el = res.field && document.getElementById("nj" + res.field.toUpperCase()); if (el) el.focus(); return; }
  form.value.open = false;
  save((next) => { const r = saveJar(next, form.value.id, f, ctx()); return r.logs.length ? r.logs : false; });
}
// Mark as done.
const doneAsk = ref(null);
const askDone = (id) => { menu.value = null; doneAsk.value = S.value.jars.find((x) => x.id == id) || null; };
const doDone = () => { const id = doneAsk.value.id; doneAsk.value = null; save((next) => markDone(next, id, M.value.today, ctx())); };
// Delete.
const delAsk = ref(null);
const askDel = (id) => { menu.value = null; delAsk.value = S.value.jars.find((x) => x.id == id) || null; };
const doDel = () => { const id = delAsk.value.id; delAsk.value = null; save((next) => deleteJar(next, id)); };
// Take back from the jars.
const relAsk = ref(false);
const doRelease = () => { relAsk.value = false; const over = M.value.F.over; if (!(over > 0)) return; save((next) => { const l = releaseJars(next, over, ctx()); return l.length ? l : false; }); say(t("jars.rel.done")); };
// How is this worked out?
const why = ref(false);

// One jar's texts.
const ALLB = { "*": "all", "*i": "allIrregular", "*a": "allAny" };
const payoff = (j) => j.kind === "payoff";
const kindOf = (j) => (payoff(j) ? t("jars.kind.payoff") : j.type !== "bill" ? (j.type === "month" ? t("jars.kind.month") : t("jars.kind.goal")) : ALLB[j.bill] ? tk("jars.kind." + ALLB[j.bill]) : j.billName || t("jars.kind.bill"));
const stLabel = (s) => (s.key === "needs" ? t("jars.st.needs", { amount: fm(s.want) }) : tk("jars.st." + s.key));
function stTip(j) {
  const s = j.state, v = { bal: fm(j.bal), got: fm(s.got || 0), share: fm(s.share || 0), want: fm(s.want || 0) };
  if (s.key === "full" || s.key === "paidOff") return t(s.bill ? "jars.stTip.fullBill" : "jars.stTip.full", v);
  if (s.key === "needs") return t("jars.stTip.needs", v) + " " + t(s.soon ? "jars.stTip.needsSoon" : "jars.stTip.needsNo");
  return tk("jars.stTip." + s.key, v);
}
const etaWhen = (e) => (e.k ? mlab(e.when) : t("jars.over5"));
const etaTip = (e) => t(e.due ? "jars.fullByTipDue" : "jars.fullByTip", { when: etaWhen(e), remain: fm(e.left), cap: fm(e.cap), months: e.k ? String(e.k) : "60+", due: e.due ? mlab(e.due) : "" });
const lateText = (l) => (l.kind === "after" ? t("jars.lateAfter", { when: mlab(l.when), due: mlab(l.due), amount: fm(l.need) }) : t("jars.lateNever", { due: mlab(l.due) }));
const ringText = (j) => (j.open ? "₪" + (j.bal >= 1e4 ? Math.round(j.bal / 1e3) + "k" : n0(j.bal)) : j.pc + "%");
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
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("jars.loadError") }}</p>
      <p v-else class="sm">{{ t("jars.loading") }}</p>
    </template>

    <template v-else>
      <div class="jhero">
        <div class="jh1">
          <div class="lbl">{{ t("jars.safe") }}</div>
          <div class="val"><small>₪</small><span>{{ n0(M.F.free) }}</span></div>
          <div class="sm">{{ t("jars.safeSub") }}</div>
          <div v-if="M.F.over > 0" class="jover"><b>{{ t("jars.tooMuch", { amount: fm(M.F.over) }) }}</b> {{ t("jars.tooMuchText") }}<div v-if="M.F.inJars > 0" class="flex" style="gap:8px;margin-top:8px"><BaseButton size="small" @click="relAsk = true">{{ t("jars.takeBack", { amount: fm(Math.min(M.F.over, M.F.inJars)) }) }}</BaseButton></div></div>
          <BaseButton size="small" variant="outline" style="margin-top:10px" @click="why = true">{{ t("jars.howWorked") }}</BaseButton>
        </div>
        <div class="jh2">
          <div class="lbl">{{ t("jars.thisMonth") }}</div>
          <div class="val"><small>₪</small>{{ n0(M.month.got) }}<span v-if="M.month.planned > 0" class="of">{{ " " + t("jars.of", { amount: fm(M.month.planned) }) }}</span></div>
          <div class="jbar"><i :class="M.month.waiting ? 'w' : M.month.done ? 'd' : ''" :style="{ width: M.month.pct + '%' }" /></div>
          <div class="sm">{{ M.month.done ? t("jars.allDone") : M.month.waiting ? (M.F.buffer > 0 ? t("jars.waitingKept", { amount: fm(M.month.still), kept: fm(M.F.buffer) }) : t("jars.waiting", { amount: fm(M.month.still) })) : t("jars.filling") }}</div>
          <div class="jstats">
            <div v-tip="t('jars.putInTip', { amount: fm(M.month.got) })"><span>{{ t("jars.putIn") }}</span><b class="num">{{ fm(M.month.got) }}</b></div>
            <div v-tip="t('jars.stillTip', { amount: fm(M.month.still) })"><span>{{ t("jars.still") }}</span><b class="num">{{ fm(M.month.still) }}</b></div>
            <div v-tip="t('jars.availTip', { cash: fm(M.F.cash), jars: fm(M.F.inJars), kept: fm(M.F.buffer), reserve: fm(M.F.reserve), free: fm(M.F.free) })"><span>{{ t("jars.avail") }}</span><b class="num" :class="{ neg: M.month.waiting }">{{ fm(M.F.free) }}</b></div>
          </div>
        </div>
      </div>

      <div class="card jbufc">
        <div class="kt"><div class="kh"><div><b>{{ t("jars.keep") }}</b><div class="sm">{{ t("jars.keepSub") }}</div></div></div></div>
        <div class="kctl">
          <div class="kchips"><button v-for="v in [0, 1000, 2000, 5000, 10000]" :key="v" :class="{ on: M.F.buffer == v }" @click="setBuffer(v)">{{ v ? fm(v) : t("jars.none") }}</button></div>
          <div class="kin"><span class="kc">₪</span><input type="number" inputmode="numeric" min="0" :placeholder="t('jars.other')" :aria-label="t('jars.keepLabel')" :value="bufShown" @input="bufText = $event.target.value" @change="setBuffer($event.target.value)" @keydown.enter="$event.target.blur()"></div>
        </div>
      </div>

      <h2>{{ t("jars.jars") }}<span class="flex" style="gap:8px"><BaseButton v-if="M.has.any" size="small" variant="outline" :busy="filling" @click="fill">{{ t("jars.fill") }}</BaseButton><BaseButton size="small" variant="outline" @click="openNew">{{ t("jars.newJar") }}</BaseButton></span></h2>
      <div class="grid g2">
        <BaseCard v-for="j in M.jars" :key="j.id" class="jin">
          <div class="jhead">
            <div class="jhl">
              <div class="jname">{{ j.n }}</div>
              <div class="sm jk"><svg class="kic" viewBox="0 0 24 24" v-html="KI[j.type]" />{{ kindOf(j) }}</div>
            </div>
            <div class="jtools" data-menuanchor>
              <button type="button" class="bd jst jbtn" :class="j.state.cls" data-a="jarHist" :data-open="menu?.id == j.id && menu.kind == 'hist' ? 1 : undefined" v-tip="stTip(j) + ' ' + t('jars.history')" aria-haspopup="menu" @click="toggleMenu(j.id, 'hist', $event)">{{ stLabel(j.state) }}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>
              <div class="jpill">
                <button :disabled="j.ix == 0" :aria-label="t('jars.up')" @click="moveTo(j.id, j.ix)"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg></button>
                <span class="jpm" v-tip="t('jars.priority', { n: j.ix + 1, total: M.jars.length }) + '. ' + t('jars.priorityTip')"><svg class="pri" viewBox="0 0 24 24"><path d="M5 21V4M5 4h12l-3 4 3 4H5" /></svg>{{ j.ix + 1 }}<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg><select :aria-label="t('jars.pick')" :value="j.ix + 1" @change="moveTo(j.id, +$event.target.value)"><option v-for="(x, k) in M.jars" :key="x.id" :value="k + 1">{{ k + 1 }} · {{ x.n }}</option></select></span>
                <button :disabled="j.ix == M.jars.length - 1" :aria-label="t('jars.down')" @click="moveTo(j.id, j.ix + 2)"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>
              </div>
              <button class="ib jmore" data-a="jarMenu" :data-open="menu?.id == j.id && menu.kind == 'more' ? 1 : undefined" :aria-label="t('jars.options')" aria-haspopup="menu" @click="toggleMenu(j.id, 'more', $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
            </div>
          </div>
          <div v-if="j.desc" class="jdesc">{{ j.desc }}</div>
          <div v-if="(j.cats || []).length" v-tip="t('jars.paysForTip')" class="jcats"><span>{{ t("jars.paysFor") }}</span><i v-for="x in j.cats" :key="x.c">{{ x.c }}</i></div>
          <div class="jbody">
            <svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--s2)" stroke-width="9" /><circle cx="42" cy="42" r="34" fill="none" :stroke="col(j.p)" stroke-width="9" stroke-linecap="round" :stroke-dasharray="RC * Math.min(1, j.pc / 100) + ' ' + RC" transform="rotate(-90 42 42)" /><text x="42" y="46" text-anchor="middle" :style="{ fontSize: (j.open ? 12 : 15) + 'px', fontWeight: 600, fill: 'var(--tx)' }">{{ ringText(j) }}</text></svg>
            <div class="jstat3" :class="{ c3: !j.state.eta }">
              <div><span>{{ payoff(j) ? t("jars.paidBack") : t("jars.saved") }}</span><b class="num">{{ fm(j.bal) }}</b></div>
              <div><span>{{ payoff(j) ? t("jars.owed") : t("jars.goal") }}</span><b class="num">{{ j.open ? t("jars.none") : fm(j.need) }}</b></div>
              <div><span>{{ t("jars.monthly") }}</span><b class="num">{{ j.cap == null ? t("jars.topUp") : fm(j.capE) }}</b></div>
              <div v-if="j.state.eta" v-tip="etaTip(j.state.eta)"><span>{{ t("jars.fullBy") }}</span><b class="num">{{ etaWhen(j.state.eta) }}</b></div>
            </div>
          </div>
          <div v-if="j.state.late" class="jwarn">{{ lateText(j.state.late) }}</div>
        </BaseCard>
      </div>

      <h2>{{ t("jars.goals") }}<BaseButton size="small" variant="outline" @click="openNew">{{ t("jars.newGoal") }}</BaseButton></h2>
      <div class="sm gnote" style="line-height:1.5">{{ t("jars.goalsNote") }}</div>
      <div class="card" id="goals">
        <div v-for="g in M.goals" :key="g.id" class="grow2">
          <div class="gh">
            <div><b>{{ g.n }}</b><div class="sm num">{{ t("jars.goalOf", { bal: fm(g.bal), need: fm(g.need), pc: Math.round(g.pc) }) }}</div></div>
            <div class="gr"><span class="bd" :class="GCLS[g.st]">{{ tk("jars.g." + g.st) }}</span>
              <BaseButton v-if="g.st === 'reached'" size="small" @click="askDone(g.id)">{{ t("jars.markDone") }}</BaseButton>
              <BaseButton v-else-if="g.fix" size="small" @click="raiseCap(g)">{{ t("jars.raise", { amount: fm(g.fix) }) }}</BaseButton>
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
                <div><b>{{ d.n }}</b><div class="sm">{{ doneLine(d) }}</div><div v-if="d.desc" class="sm" style="margin-top:2px">{{ d.desc }}</div></div>
                <div class="gr"><BaseButton size="small" variant="outline" data-a="jarHist" :data-open="menu?.id == d.id && menu.kind == 'hist' ? 1 : undefined" @click="toggleMenu(d.id, 'hist', $event)">{{ t("jars.historyBtn") }}</BaseButton><BaseButton size="small" variant="outline" @click="reopen(d)">{{ t("jars.reopen") }}</BaseButton></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="S">
    <Teleport to="body">
      <div v-if="menu" ref="menuEl" class="cmenu" :class="{ hist: menu.kind == 'hist' }" role="menu">
        <template v-if="menu.kind == 'more'">
          <button role="menuitem" data-a="jarEdit" @click="openEdit(menu.id)"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>{{ t("jars.menu.edit") }}</button>
          <button role="menuitem" data-a="jarDone" @click="askDone(menu.id)"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>{{ t("jars.markDone") }}</button>
          <button role="menuitem" class="dz" data-a="jarDel" @click="askDel(menu.id)"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>{{ t("jars.menu.del") }}</button>
        </template>
        <template v-else>
          <div class="hh">{{ t("jars.hist.title", { name: histName }) }}</div>
          <div v-for="(h, i) in hist" :key="i" class="hr"><span class="hd">{{ h.earlier ? t("jars.hist.earlier") : dstr(h.d) }}</span><span class="hn">{{ noteText(h) }}</span><b class="num" :class="h.pay && h.payoff ? '' : h.amt < 0 ? 'neg' : 'pos'">{{ amtText(h) }}</b></div>
          <div v-if="!hist.length" class="he2">{{ t("jars.hist.none") }}</div>
        </template>
      </div>
    </Teleport>

    <div v-if="toast" id="toasts" role="status"><div class="toast" :class="toast.kind"><span class="ti"><svg viewBox="0 0 24 24"><path v-if="toast.kind === 'err'" d="M12 7.5v5.5M12 16.5h.01M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" /><path v-else d="M5 12.5l4.5 4.5L19 7.5" /></svg></span><div class="tm"><div>{{ toast.m }}</div></div><button type="button" class="tx" aria-label="Dismiss" @click="toast = null">×</button></div></div>

    <JarForm v-model:open="form.open" :S="S" :M="M" :id="form.id" :start="form.start" @save="saveForm" />

    <BaseDialog :open="!!doneAsk" :title="t('jars.done.title', { name: doneAsk?.n || '' })" @update:open="doneAsk = null">
      <div class="sm" style="line-height:1.5">{{ t("jars.done.text") }}<template v-if="doneAsk?.bal > 0"> {{ t("jars.done.back", { amount: fm(doneAsk.bal) }) }}</template></div>
      <template #actions><BaseButton variant="outline" @click="doneAsk = null">{{ t("jars.cancel") }}</BaseButton><BaseButton @click="doDone">{{ t("jars.markDone") }}</BaseButton></template>
    </BaseDialog>

    <BaseDialog :open="!!delAsk" :title="t('jars.del.title', { name: delAsk?.n || '' })" @update:open="delAsk = null">
      <div class="sm" style="line-height:1.5">{{ t("jars.del.text") }}</div>
      <template #actions><BaseButton variant="outline" @click="delAsk = null">{{ t("jars.cancel") }}</BaseButton><BaseButton variant="danger" @click="doDel">{{ t("jars.menu.del") }}</BaseButton></template>
    </BaseDialog>

    <BaseDialog :open="relAsk" :title="t('jars.takeBack', { amount: fm(Math.min(M.F.over, M.F.inJars)) })" @update:open="relAsk = false">
      <div class="sm" style="line-height:1.5">{{ t("jars.rel.text", { amount: fm(Math.min(M.F.over, M.F.inJars)) }) }}</div>
      <template #actions><BaseButton variant="outline" @click="relAsk = false">{{ t("jars.cancel") }}</BaseButton><BaseButton @click="doRelease">{{ t("jars.rel.yes") }}</BaseButton></template>
    </BaseDialog>

    <BaseDialog v-model:open="why" :title="t('jars.safe')">
      <div class="sm" style="margin-bottom:12px">{{ t("jars.av.intro") }}</div>
      <div class="inf" style="margin-bottom:14px"><div class="chl" style="margin:0">
        <div class="chn"><span>{{ t("jars.av.cash") }}</span><b class="num">{{ fm(M.F.cash) }}</b></div>
        <div class="chn"><span>{{ t("jars.av.inJars") }}</span><b class="num">{{ fm(-M.F.inJars) }}</b></div>
        <div v-if="M.F.buffer" class="chn"><span>{{ t("jars.keep") }}</span><b class="num">{{ fm(-M.F.buffer) }}</b></div>
        <div v-if="M.avail.bills" class="chn"><span>{{ t("jars.av.bills") }}</span><b class="num">{{ fm(-M.avail.bills) }}</b></div>
        <div v-if="M.avail.limits" class="chn"><span>{{ t("jars.av.planned") }}</span><b class="num">{{ fm(-M.avail.limits) }}</b></div>
        <div class="chn tot"><span>{{ t("jars.av.free") }}</span><b class="num">{{ fm(M.F.free) }}</b></div>
        <div v-if="M.F.over > 0" class="sm" style="padding:8px 2px 0;color:var(--neg)">{{ t("jars.av.short", { amount: fm(M.F.over) }) }}</div>
      </div></div>
      <template v-if="M.avail.billRows.length">
        <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.bills") }} · {{ fm(M.avail.bills) }}</div>
        <div class="inf" style="margin-bottom:12px"><div v-for="r in M.avail.billRows" :key="r.k" class="chn" style="align-items:flex-start"><span><span class="catl">{{ r.k }}</span><div class="sm" style="margin-top:2px">{{ r.bills.length > 1 ? t("jars.av.nBills", { n: r.bills.length }) : t("jars.av.bill") }}</div><div v-if="r.bills.length" class="sm" style="margin-top:2px">{{ r.bills.map((x) => x.n + (x.overdue ? " " + t("jars.av.overdue") : "") + " " + fm(x.amt)).join(" · ") }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
      </template>
      <template v-if="M.avail.otherRows.length">
        <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.planned") }} · {{ fm(M.avail.limits) }}</div>
        <div class="sm" style="margin:0 0 6px">{{ t("jars.av.plannedNote") }}</div>
        <div class="inf" style="margin-bottom:12px"><div v-for="r in M.avail.otherRows" :key="r.k" class="chn" style="align-items:flex-start"><span><span class="catl">{{ r.k }}</span><div class="sm" style="margin-top:2px">{{ r.kind == "budget" ? t("jars.av.budget", { spent: fm(r.spent), base: fm(r.base) }) : t("jars.av.typical", { spent: fm(r.spent), base: fm(r.base) }) }}</div><div v-if="r.bl > 0" class="sm" style="margin-top:2px">{{ t("jars.av.includes", { amount: fm(r.bl), names: r.bills.map((x) => x.n).join(", ") }) }}</div></span><b class="num">{{ fm(r.amt) }}</b></div></div>
      </template>
      <template v-if="M.avail.covered.length">
        <div class="lbl" style="margin:0 0 4px">{{ t("jars.av.covered") }}</div>
        <div class="inf" style="margin-bottom:12px"><div v-for="c in M.avail.covered" :key="c.jar" class="chn" style="align-items:flex-start"><span><b>{{ c.jar }}</b><div class="sm" style="margin-top:2px">{{ c.bills.map((b) => b.n + " " + t("jars.av.mo", { amount: fm(b.mo) })).join(" · ") }}</div></span><b class="num">{{ t("jars.av.mo", { amount: fm(c.bills.reduce((x, b) => x + b.mo, 0)) }) }}</b></div></div>
      </template>
      <div v-if="!M.avail.billRows.length && !M.avail.otherRows.length" class="inf" style="margin-bottom:12px"><div class="it">{{ t("jars.av.nothing") }}</div></div>
      <div class="sm" style="line-height:1.5"><b>{{ t("jars.av.howTitle") }}</b><ul class="blist"><li>{{ t("jars.av.how1") }}</li><li>{{ t("jars.av.how2") }}</li><li>{{ t("jars.av.how3") }}</li><li>{{ t("jars.av.how4") }}</li></ul></div>
      <template #actions><BaseButton @click="why = false">{{ t("jars.av.done") }}</BaseButton></template>
    </BaseDialog>
  </template>
</template>
