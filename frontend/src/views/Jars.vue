<script setup>
// Jars: money put aside for something. A copy of the current app's Jars page (web/js/04-transactions.js, renderJars):
// what is safe to put in jars, what went in this month, the amount kept untouched, each jar, goals and completed jars.
// Saves like the old page (PUT /api/state, POST /api/jars/fill). Making, editing, emptying and closing jars and their history
// still open the current app's Jars page.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import BaseCard from "../components/BaseCard.vue";
import BaseButton from "../components/BaseButton.vue";
import BaseTooltip from "../components/BaseTooltip.vue";
import EmptyState from "../components/EmptyState.vue";
import { jarsModel } from "./jars.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const n0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
const fm = (v) => (v < 0 ? "−" : "") + "₪" + n0(v);
const OLD = "/jars";

const fx = ref({});
onMounted(async () => {
  data.start();
  try { const r = await fetch("/api/fx", { cache: "no-store" }); if (r.ok) fx.value = (await r.json()).fx || {}; } catch { /* no rates: foreign money counts at 1 */ }
});

const S = computed(() => data.state.value);
const M = computed(() => jarsModel(S.value, new Date(), fx.value));
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const mlab = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
const dstr = (d) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString(loc.value, { day: "numeric", month: "short", year: "numeric" });

// Saving: change a copy, send the whole state like the old page, then load the fresh copy. 409 means a sync changed the data first.
const saveError = ref("");
async function save(edit, action, detail) {
  const next = structuredClone(S.value);
  if (edit(next) === false) return;
  next.audit = [{ t: new Date().toISOString(), who: "You", action, detail, undo: null }, ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  try {
    const r = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    saveError.value = r.ok ? "" : r.status === 409 ? t("jars.stale") : t("jars.saveFailed");
  } catch { saveError.value = t("jars.saveFailed"); }
  await data.load();
}
const toast = ref("");
let toastTimer = null;
const say = (m) => { toast.value = m; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = ""; }, 4000); };

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
  } catch { saveError.value = t("jars.saveFailed"); }
  filling.value = false;
}

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
  <div class="jars">
    <h1>{{ t("nav.jars") }}</h1>

    <p v-if="data.error.value && !S" class="muted">{{ t("jars.loadError") }}</p>
    <p v-else-if="!S" class="muted">{{ t("jars.loading") }}</p>

    <template v-else>
      <div class="jhero">
        <div class="jh1">
          <div class="lbl">{{ t("jars.safe") }}</div>
          <div class="val num" dir="ltr"><small>₪</small>{{ n0(M.F.free) }}</div>
          <div class="sm">{{ t("jars.safeSub") }}</div>
          <div v-if="M.F.over > 0" class="jover">
            <b dir="auto">{{ t("jars.tooMuch", { amount: fm(M.F.over) }) }}</b> {{ t("jars.tooMuchText") }}
            <div v-if="M.F.inJars > 0" class="acts"><a :href="OLD"><BaseButton size="small">{{ t("jars.takeBack", { amount: fm(Math.min(M.F.over, M.F.inJars)) }) }}</BaseButton></a></div>
          </div>
          <BaseTooltip class="why" :text="t('jars.availTip', { cash: fm(M.F.cash), jars: fm(M.F.inJars), kept: fm(M.F.buffer), reserve: fm(M.F.reserve), free: fm(M.F.free) })"><BaseButton size="small" variant="outline">{{ t("jars.howWorked") }}</BaseButton></BaseTooltip>
        </div>
        <div class="jh2">
          <div class="lbl">{{ t("jars.thisMonth") }}</div>
          <div class="val num"><span dir="ltr"><small>₪</small>{{ n0(M.month.got) }}</span><span v-if="M.month.planned > 0" class="of">{{ t("jars.of", { amount: fm(M.month.planned) }) }}</span></div>
          <div class="jbar"><i :class="{ w: M.month.waiting, d: M.month.done }" :style="{ width: M.month.pct + '%' }" /></div>
          <div class="sm">{{ M.month.done ? t("jars.allDone") : M.month.waiting ? (M.F.buffer > 0 ? t("jars.waitingKept", { amount: fm(M.month.still), kept: fm(M.F.buffer) }) : t("jars.waiting", { amount: fm(M.month.still) })) : t("jars.filling") }}</div>
          <div class="jstats">
            <BaseTooltip :text="t('jars.putInTip', { amount: fm(M.month.got) })"><div><span class="lab">{{ t("jars.putIn") }}</span><b class="num">{{ fm(M.month.got) }}</b></div></BaseTooltip>
            <BaseTooltip :text="t('jars.stillTip', { amount: fm(M.month.still) })"><div><span class="lab">{{ t("jars.still") }}</span><b class="num">{{ fm(M.month.still) }}</b></div></BaseTooltip>
            <BaseTooltip :text="t('jars.availTip', { cash: fm(M.F.cash), jars: fm(M.F.inJars), kept: fm(M.F.buffer), reserve: fm(M.F.reserve), free: fm(M.F.free) })"><div><span class="lab">{{ t("jars.avail") }}</span><b class="num" :class="{ neg: M.month.waiting }">{{ fm(M.F.free) }}</b></div></BaseTooltip>
          </div>
        </div>
      </div>

      <BaseCard class="jbufc">
        <div class="kt"><b>{{ t("jars.keep") }}</b><div class="sm">{{ t("jars.keepSub") }}</div></div>
        <div class="kctl">
          <div class="kchips"><button v-for="v in [0, 1000, 2000, 5000, 10000]" :key="v" type="button" :class="{ on: M.F.buffer == v }" :aria-pressed="M.F.buffer == v" @click="setBuffer(v)"><span dir="ltr">{{ v ? fm(v) : "" }}</span>{{ v ? "" : t("jars.none") }}</button></div>
          <div class="kin"><span class="kc">₪</span><input type="number" inputmode="numeric" min="0" :placeholder="t('jars.other')" :aria-label="t('jars.keepLabel')" :value="bufShown" @input="bufText = $event.target.value" @change="setBuffer($event.target.value)" @keydown.enter="$event.target.blur()"></div>
        </div>
      </BaseCard>

      <p v-if="saveError" class="err" role="alert">{{ saveError }}</p>

      <h2><span>{{ t("jars.jars") }}</span><span class="h2r"><BaseButton v-if="M.has.any" size="small" variant="outline" :busy="filling" @click="fill">{{ t("jars.fill") }}</BaseButton><a :href="OLD"><BaseButton size="small" variant="outline">{{ t("jars.newJar") }}</BaseButton></a></span></h2>
      <BaseCard v-if="!M.has.any"><EmptyState :title="t('jars.emptyTitle')" :text="t('jars.emptyText')" /></BaseCard>
      <div v-else class="grid g2">
        <BaseCard v-for="j in M.jars" :key="j.id" class="jin">
          <div class="jhead">
            <div class="jhl">
              <div class="jname">{{ j.n }}</div>
              <div class="sm jk"><svg class="kic" viewBox="0 0 24 24" aria-hidden="true" v-html="KI[j.type]" />{{ kindOf(j) }}</div>
            </div>
            <div class="jtools">
              <BaseTooltip :text="stTip(j) + ' ' + t('jars.history')"><a class="bd jst jbtn" :class="j.state.cls" :href="OLD">{{ stLabel(j.state) }}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></a></BaseTooltip>
              <div class="jpill">
                <button type="button" :disabled="j.ix == 0" :aria-label="t('jars.up')" @click="moveTo(j.id, j.ix)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
                <BaseTooltip :text="t('jars.priority', { n: j.ix + 1, total: M.jars.length }) + '. ' + t('jars.priorityTip')"><span class="jpm"><svg class="pri" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h12l-3 4 3 4H5" /></svg><span class="num">{{ j.ix + 1 }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  <select :aria-label="t('jars.pick')" :value="j.ix + 1" @change="moveTo(j.id, +$event.target.value)"><option v-for="(x, k) in M.jars" :key="x.id" :value="k + 1">{{ k + 1 }} · {{ x.n }}</option></select></span></BaseTooltip>
                <button type="button" :disabled="j.ix == M.jars.length - 1" :aria-label="t('jars.down')" @click="moveTo(j.id, j.ix + 2)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
              </div>
              <a class="jmore" :href="OLD" :aria-label="t('jars.options')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></a>
            </div>
          </div>
          <div v-if="j.desc" class="jdesc">{{ j.desc }}</div>
          <BaseTooltip v-if="(j.cats || []).length" :text="t('jars.paysForTip')"><div class="jcats"><span>{{ t("jars.paysFor") }}</span><i v-for="x in j.cats" :key="x.c">{{ x.c }}</i></div></BaseTooltip>
          <div class="jbody">
            <svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--s2)" stroke-width="9" /><circle cx="42" cy="42" r="34" fill="none" :stroke="col(j.p)" stroke-width="9" stroke-linecap="round" :stroke-dasharray="RC * Math.min(1, j.pc / 100) + ' ' + RC" transform="rotate(-90 42 42)" /><text x="42" y="46" text-anchor="middle" :style="{ fontSize: (j.open ? 12 : 15) + 'px', fontWeight: 600, fill: 'var(--tx)' }">{{ ringText(j) }}</text></svg>
            <div class="jstat3" :class="{ c3: !j.state.eta }">
              <div><span class="lab">{{ payoff(j) ? t("jars.paidBack") : t("jars.saved") }}</span><b class="num">{{ fm(j.bal) }}</b></div>
              <div><span class="lab">{{ payoff(j) ? t("jars.owed") : t("jars.goal") }}</span><b class="num">{{ j.open ? t("jars.none") : fm(j.need) }}</b></div>
              <div><span class="lab">{{ t("jars.monthly") }}</span><b class="num">{{ j.cap == null ? t("jars.topUp") : fm(j.capE) }}</b></div>
              <div v-if="j.state.eta"><BaseTooltip :text="etaTip(j.state.eta)"><span class="lab">{{ t("jars.fullBy") }}</span><b class="num">{{ etaWhen(j.state.eta) }}</b></BaseTooltip></div>
            </div>
          </div>
          <div v-if="j.state.late" class="jwarn">{{ lateText(j.state.late) }}</div>
        </BaseCard>
      </div>

      <h2><span>{{ t("jars.goals") }}</span><a :href="OLD"><BaseButton size="small" variant="outline">{{ t("jars.newGoal") }}</BaseButton></a></h2>
      <div class="sm gnote">{{ t("jars.goalsNote") }}</div>
      <BaseCard>
        <div v-for="g in M.goals" :key="g.id" class="grow2">
          <div class="gh">
            <div><b>{{ g.n }}</b><div class="sm num">{{ t("jars.goalOf", { bal: fm(g.bal), need: fm(g.need), pc: Math.round(g.pc) }) }}</div></div>
            <div class="gr"><span class="bd" :class="GCLS[g.st]">{{ tk("jars.g." + g.st) }}</span>
              <a v-if="g.st === 'reached'" :href="OLD"><BaseButton size="small">{{ t("jars.markDone") }}</BaseButton></a>
              <BaseButton v-else-if="g.fix" size="small" @click="raiseCap(g)">{{ t("jars.raise", { amount: fm(g.fix) }) }}</BaseButton>
            </div>
          </div>
          <div class="bar"><i :style="{ width: g.pc + '%', background: col(g.p) }" /></div>
          <div class="sm">{{ goalLine(g) }}</div>
        </div>
        <div v-if="!M.goals.length" class="sm nogoal">{{ t("jars.noGoals") }}</div>
      </BaseCard>

      <template v-if="M.done.length">
        <h2><span>{{ t("jars.completed") }}</span><span class="sm cnt">{{ M.done.length }}</span></h2>
        <BaseCard>
          <div v-for="d in M.done" :key="d.id" class="grow2">
            <div class="gh">
              <div><b>{{ d.n }}</b><div class="sm">{{ doneLine(d) }}</div><div v-if="d.desc" class="sm dsc">{{ d.desc }}</div></div>
              <div class="gr"><a :href="OLD"><BaseButton size="small" variant="outline">{{ t("jars.historyBtn") }}</BaseButton></a><BaseButton size="small" variant="outline" @click="reopen(d)">{{ t("jars.reopen") }}</BaseButton></div>
            </div>
          </div>
        </BaseCard>
      </template>
    </template>
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>
  </div>
</template>

<style scoped>
/* Copied from the current app's Jars page (web/css/app.css: .jhero, .jbufc, .jin, .jstat3, .grow2). */
.jars { display: flex; flex-direction: column; overflow-x: clip; }
h1 { margin-bottom: var(--sp5); }
h2 { display: flex; justify-content: space-between; align-items: center; gap: var(--sp3); font-size: 12px; font-weight: 600; margin: 28px 0 12px; color: var(--tx2); letter-spacing: 1.1px; text-transform: uppercase; }
.h2r { display: flex; gap: 8px; align-items: center; }
h2 a, .gr a, .acts a { text-decoration: none; }
.cnt { font-weight: 500; letter-spacing: 0; text-transform: none; }
.grid { display: grid; gap: 16px; }
.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 860px) { .g2 { grid-template-columns: 1fr; } }
.lbl { font-size: 13px; color: var(--tx2); font-weight: 500; }
.sm { font-size: var(--fs-sm); color: var(--tx2); }
.val { font-weight: 600; letter-spacing: -1px; text-align: start; }
.val small { font-size: .55em; font-weight: 500; opacity: .6; margin-inline-end: 2px; }
.val .of { margin-inline-start: 4px; font-size: 16px; font-weight: 500; color: var(--tx2); letter-spacing: 0; }

.jhero { display: grid; grid-template-columns: 1fr 1fr; border-radius: 26px; overflow: visible; background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 16%, var(--s1)), color-mix(in srgb, var(--acc2) 10%, var(--s1))); border: 1px solid color-mix(in srgb, var(--acc) 22%, var(--ol)); }
.jhero > div { padding: 24px 28px; min-width: 0; }
.jhero .jh2 { border-inline-start: 1px solid color-mix(in srgb, var(--acc) 20%, var(--ol)); }
.jh1 .val { font-size: 46px; margin: 10px 0 6px; }
.jh2 .val { font-size: 34px; margin: 10px 0 0; }
.why { margin-top: 10px; }
.jover { margin-top: 12px; padding: 11px 13px; border-radius: 14px; background: color-mix(in srgb, var(--neg) 10%, transparent); color: var(--tx); font-size: 13px; line-height: 1.5; }
.jover b { color: var(--neg); }
.acts { display: flex; gap: 8px; margin-top: 8px; }
.jbar { height: 10px; border-radius: 99px; overflow: hidden; margin: 14px 0 10px; background: color-mix(in srgb, var(--tx) 10%, transparent); }
.jbar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--acc), var(--acc2)); transition: width .5s; }
html.he .jbar i { background: linear-gradient(-90deg, var(--acc), var(--acc2)); }
.jbar i.w { background: #e6a100; } .jbar i.d { background: var(--pos); }
.jstats { display: flex; margin-top: 16px; }
.jstats > :deep(.tw) { flex: 1; min-width: 0; padding: 0 14px; border-inline-start: 1px solid color-mix(in srgb, var(--acc) 20%, var(--ol)); }
.jstats > :deep(.tw:first-child) { padding-inline-start: 0; border: 0; }
.jstats .lab { display: block; font-size: 11px; color: var(--tx2); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.jstats b { display: block; font-size: 15px; margin-top: 2px; }

.jbufc { display: flex !important; align-items: center; justify-content: space-between; gap: 18px 28px; flex-wrap: wrap; padding: 16px 24px !important; margin-top: 16px; overflow: visible !important; }
.jbufc .kt { flex: 1 1 280px; }
.kctl { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.kchips { display: flex; flex-wrap: wrap; gap: 6px; }
.kchips button { border: 1px solid var(--ol); background: var(--s1); color: var(--tx); font: inherit; font-size: 13px; padding: 7px 13px; border-radius: 99px; cursor: pointer; transition: .15s; }
.kchips button:hover { border-color: var(--acc); }
.kchips button.on { background: var(--accc); color: var(--onc); border-color: var(--acc); font-weight: 600; }
.kin { display: flex; align-items: center; width: 150px; background: var(--s1); border: 1px solid var(--ol); border-radius: 14px; overflow: hidden; }
.kin:focus-within { border-color: var(--acc); }
.kc { padding-inline: 14px 4px; color: var(--tx2); }
.kin input { border: 0; background: transparent; min-height: 40px; flex: 1; min-width: 0; padding-block: 8px; padding-inline: 4px 14px; border-radius: 0; color: var(--tx); font: inherit; }
.kin input:focus { outline: 0; }

.jin { overflow: visible !important; container-type: inline-size; }
.jhead { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.jhl { flex: 1 1 140px; min-width: 0; }
.jname { font-size: 18px; font-weight: 600; margin: 8px 0 2px; overflow-wrap: anywhere; }
.jk { line-height: 1.7; }
.kic { width: 14px; height: 14px; vertical-align: -2px; margin-inline-end: 5px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: .75; }
.jtools { display: flex; align-items: center; gap: 4px; flex: none; margin-inline-start: auto; align-self: flex-start; }
.bd { font-size: 12px; padding: 2px 9px; border-radius: 99px; font-weight: 600; display: inline-flex; gap: 3px; align-items: center; white-space: nowrap; background: var(--s2); color: var(--tx2); }
.bd.up { background: color-mix(in srgb, var(--neg) 16%, transparent); color: var(--neg); }
.bd.dn { background: color-mix(in srgb, var(--pos) 16%, transparent); color: var(--pos); }
.bd.fl { background: var(--s2); color: var(--tx2); }
.bd.am2 { background: color-mix(in srgb, #e68a00 20%, transparent); color: #b36b00; }
:global([data-mode="dark"]) .bd.am2 { color: #ffcc80; }
.jst { height: 30px; box-sizing: border-box; padding: 0 9px 0 11px; font-size: 11px; text-decoration: none; cursor: pointer; transition: filter .15s; }
.jst:hover { filter: brightness(.94); }
.jst svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.jpill { display: inline-flex; align-items: center; border: 1px solid var(--ol); border-radius: 99px; background: var(--s1); height: 30px; box-sizing: border-box; }
.jpill > button { border: 0; background: none; color: var(--tx2); height: 100%; display: grid; place-items: center; padding: 6px 7px; cursor: pointer; border-radius: 99px; }
.jpill > button:hover:not(:disabled) { background: var(--accc); color: var(--onc); }
.jpill > button:disabled { opacity: .35; cursor: default; }
.jpill svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.jpm { position: relative; display: inline-flex; align-items: center; gap: 4px; padding: 5px 4px; font-size: 13px; font-weight: 600; color: var(--tx); cursor: pointer; }
.jpm > svg { opacity: .65; }
.jpm .pri { width: 14px; height: 14px; opacity: .8; }
.jpm select { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.jmore { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: var(--tx2); }
.jmore:hover { background: var(--s2); }
.jmore svg { width: 18px; height: 18px; fill: currentColor; }
.jdesc { margin: 12px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--tx2); overflow-wrap: anywhere; }
.jcats { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 12.5px; color: var(--tx2); }
.jcats i { font-style: normal; padding: 3px 10px; border-radius: 99px; background: var(--s2); color: var(--tx); font-weight: 500; }
.jbody { display: flex; gap: 16px; align-items: stretch; margin-top: 14px; }
.ring { width: 142px; height: 142px; flex: none; align-self: center; }
.jstat3 { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: center; }
.jstat3.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.jstat3 > div { position: relative; padding: 2px 12px; min-width: 0; }
.jstat3 .lab { display: block; font-size: 10.5px; color: var(--tx2); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
.jstat3 b { font-size: 16px; white-space: nowrap; }
.jstat3.c3 b { font-size: 15px; }
.jstat3:not(.c3) > div:nth-child(2n + 1) { padding-inline-start: 0; }
.jstat3:not(.c3) > div:nth-child(2n)::before, .jstat3.c3 > div:nth-child(n + 2)::before { content: ""; position: absolute; inset-inline-start: 0; top: 0; bottom: 0; width: 1px; background: var(--ol); }
.jstat3.c3 > div { padding: 2px 8px; } .jstat3.c3 > div:first-child { padding-inline-start: 0; }
.jstat3:not(.c3) > div:nth-child(n + 3) { border-top: 1px solid var(--ol); margin-top: 10px; padding-top: 12px; }
.jstat3:not(.c3) > div:nth-child(n + 3)::before { top: 10px; }
@container (max-width: 349px) {
  .ring { width: 118px; height: 118px; }
  .jstat3.c3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .jstat3.c3 > div:nth-child(3) { padding-inline-start: 0; border-top: 1px solid var(--ol); margin-top: 10px; padding-top: 12px; }
  .jstat3.c3 > div:nth-child(3)::before { display: none; }
}
.jwarn { margin-top: 10px; padding: 9px 12px; border-radius: 12px; background: color-mix(in srgb, var(--neg) 10%, transparent); color: var(--neg); font-size: 12.5px; line-height: 1.45; }

.gnote { line-height: 1.5; margin: -4px 2px 12px; }
.grow2 { padding: 14px 0; border-top: 1px solid var(--ol); }
.grow2:first-child { border-top: 0; padding-top: 4px; }
.grow2:last-child { padding-bottom: 4px; }
.gh { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.gh b { font-size: 15.5px; }
.gr { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.bar { position: relative; height: 12px; margin: 10px 0 6px; border-radius: 99px; background: color-mix(in srgb, var(--tx) 10%, transparent); }
.bar i { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 99px; }
.nogoal { padding: 14px 0; }
.dsc { margin-top: 2px; }
.err { color: var(--neg); margin: 12px 0 0; }
.toast { position: fixed; inset-inline: 0; bottom: calc(90px + var(--sb, 0px)); margin: 0 auto; width: fit-content; max-width: 90vw; padding: 10px 18px; border-radius: var(--pill); background: var(--tx); color: var(--bg); z-index: 30; }

@media (max-width: 760px) {
  .jhero { grid-template-columns: 1fr; }
  .jhero > div { padding: 20px; }
  .jhero .jh2 { border-inline-start: 0; border-top: 1px solid color-mix(in srgb, var(--acc) 20%, var(--ol)); }
  .jh1 .val { font-size: 40px; }
  .jbufc { padding: 16px 18px !important; }
  .kin { width: 100%; }
  .jpill > button { padding: 6px 4px; }
  .jpm { padding: 5px 2px; }
}
</style>
