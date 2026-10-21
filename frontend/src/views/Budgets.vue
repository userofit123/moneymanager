<script setup>
// Budgets: a monthly limit for a category. A copy of the current app's Budgets page (web/js/04-transactions.js renderBudg,
// web/js/08-jars.js budget actions): the three numbers on top, suggested budgets, each budget with its pace, bills and jar,
// spending with no budget, and "Add a budget". The numbers come from lib/budgets.js. Changes are saved like the old page:
// change a copy, PUT /api/state, load the fresh copy.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { openForm } from "../core/forms.js";
import { dstr } from "../dates.js";
import { toast } from "../core/toast.js";
import { go } from "../router.js";
import PageHeader from "../components/PageHeader.vue";
import { vRich } from "../lib/richtip.js";
import { f0, fm } from "../lib/bills.js";
import { budgetsModel, acceptBudget, acceptAll, dismissSuggestion, laterReview, resetDismissed, applyBudget, removeBudget, changeBudget } from "../lib/budgets.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

const cc = (n) => (n == "Income" || S.value?.cats?.[n] === 99 ? "var(--pos)" : `var(--c${(S.value?.cats?.[n] == null ? 6 : S.value.cats[n]) % 7})`);
const M = computed(() => (S.value ? budgetsModel(S.value, now.value) : null));
const mlab = computed(() => M.value.budMonths.map((m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "short" })).join(", "));

const kpis = computed(() => {
  const m = M.value, tl = m.totL, ts = m.totS;
  return [
    { c: "hero", l: t("budgets.k.budgeted"), v: tl, s: t("budgets.k.across", { n: m.info.length }) },
    { c: "", l: t("budgets.k.spent"), v: ts, s: t("budgets.k.spentSub", { pct: tl ? Math.round((ts / tl) * 100) : 0, month: Math.round((m.DAYN / m.DIM) * 100) }) },
    { c: "", l: t("budgets.k.left"), v: tl - ts, s: t("budgets.k.leftSub", { amount: fm(Math.max(0, tl - ts) / Math.max(1, m.DIM - m.DAYN)) }) },
  ];
});
const stClass = (b) => (b.st == "over" ? "up" : b.st == "warn" || b.st == "pace" ? "am2" : "dn");
const stTip = (b) => [tk("budgets.st." + b.st), t("budgets.tip.budget") + "\t" + fm(b.lim), t("budgets.tip.spent") + "\t" + fm(b.s), t("budgets.tip.left") + "\t" + fm(Math.max(0, b.left)), t("budgets.tip.pace") + "\t" + fm(b.pace), "---", b.st == "warn" ? t("budgets.note.warn", { pct: Math.round(b.pc) }) : tk("budgets.note." + b.st)].join("\n");
const fillColor = (b) => (b.st == "over" ? "var(--neg)" : b.st == "warn" || b.st == "pace" ? "#e68a00" : "");
const billSt = (b) => (b.irregular ? t("budgets.billIrr") : b.lp && b.lp.startsWith(M.value.MK) ? t("budgets.billPaid", { date: dstr(b.lp) }) : b.status == "overdue" ? t("budgets.billOver") : t("budgets.billDue", { date: dstr(b.nx) }));
const rvOf = computed(() => Object.fromEntries(M.value.review.map((r) => [r.k, r])));
const lastVals = (b) => M.value.budMonths.map((m) => (M.value.M[b.k] || {})[m] || 0);

// ---- saving (like Jars: change a copy, send the whole state, then load the fresh copy) ----
const say = (m, kind = "ok") => toast(m, { kind }); // the toasts at the bottom of the page (core/toast.js)
// Saving goes through the data store (stores/data.js).
function change(edit) { data.change(edit); }

// ---- suggestions ----
const props = ref({}); // what is typed in each suggestion's amount box
const propOf = (x) => (x.k in props.value ? props.value[x.k] : x.prop);
const accept = (x) => { const v = Math.round(+propOf(x)); if (!(v > 0)) { say(t("budgets.enter"), "err"); return; } change((n) => acceptBudget(n, x.k, v)); };
const acceptEvery = () => change((n) => acceptAll(n, M.value.fresh.slice(0, 8).map((x) => [x.k, propOf(x)])));
const dismiss = (k) => change((n) => dismissSuggestion(n, k));
const later = (k) => change((n) => laterReview(n, k, M.value.MK));
const resetNo = () => change((n) => resetDismissed(n));
const apply = (r) => change((n) => applyBudget(n, r.k, r.prop));
const edit = (k, ev) => change((n) => changeBudget(n, k, ev.target.value));
const remove = (k) => change((n) => removeBudget(n, k));

// ---- Add a budget ----
// Add a budget: the shared window (components/forms/BudgetForm.vue).
const openAdd = (k) => openForm("budget", { k: k || "" });
const goCat = () => go("/activity");
const goBill = () => go("/bills");
</script>

<template>
  <PageHeader :title="t('nav.budgets')" />
  <section class="view on" id="budg">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("budgets.loadError") }}</p>
      <p v-else class="sm">{{ t("budgets.loading") }}</p>
    </template>

    <template v-else>
      <div class="grid g3" id="budK">
        <div v-for="(c, i) in kpis" :key="i" class="card" :class="c.c"><div class="lbl">{{ c.l }}</div><div class="val"><small>₪</small>{{ c.v < 0 ? "−" : "" }}{{ f0(c.v) }}</div><div class="sm">{{ c.s }}</div></div>
      </div>

      <div id="budS">
        <template v-if="M.fresh.length">
          <h2>{{ t("budgets.sugTitle") }}<span class="flex" style="gap:8px"><button class="btn o s" data-a="budAcceptAll" @click="acceptEvery">{{ t("budgets.acceptAll") }}</button></span></h2>
          <div class="card"><div class="sm" style="margin-bottom:10px;line-height:1.5">{{ t("budgets.sugText", { months: mlab }) }}</div>
            <div v-for="x in M.fresh.slice(0, 8)" :key="x.k" class="row" style="flex-wrap:wrap"><span class="dot" :style="{ background: cc(x.k) }"></span><div class="grow" style="min-width:150px"><b class="click" style="cursor:pointer" data-a="goCat" :data-cat="x.k" @click="goCat">{{ x.k }}</b><div class="sm">{{ t("budgets.typically", { amount: fm(x.avg), list: x.vals.map((v) => fm(v)).join(" · ") }) }}</div></div><input type="number" inputmode="numeric" :value="propOf(x)" :data-bp="x.k" style="width:110px" :aria-label="t('budgets.budgetFor', { name: x.k })" @input="props[x.k] = $event.target.value"><button class="btn s" data-a="budAccept" :data-k="x.k" @click="accept(x)">{{ t("budgets.accept") }}</button><button v-rich="t('budgets.notThisTip')" class="btn o s" data-a="budNo" :data-k="x.k" @click="dismiss(x.k)">{{ t("budgets.notThis") }}</button></div>
            <div v-if="M.fresh.length > 8" class="sm" style="padding-top:8px">{{ t("budgets.more", { n: M.fresh.length - 8 }) }}</div>
          </div>
        </template>
        <template v-else>
          <template v-if="!Object.keys(M.budgets).length && M.budMonths.length < 2"><h2>{{ t("budgets.sugTitle") }}</h2><div class="card sm">{{ t("budgets.needTwo") }}</div></template>
          <div v-if="M.budgetNo.length" class="sm" style="margin:10px 2px"><a style="cursor:pointer;color:var(--acc);font-weight:600" data-a="budReset" @click="resetNo">{{ t("budgets.showAgain") }}</a></div>
        </template>
      </div>

      <h2>{{ t("budgets.byCat") }}<button class="btn o s" data-a="budNew" @click="openAdd('')">{{ t("budgets.addBudget") }}</button></h2>
      <div class="grid g2" id="budL">
        <div v-for="b in M.info" :key="b.k" class="card" :class="b.st == 'over' ? 'warn' : ''"><div class="flex" style="justify-content:space-between;gap:8px"><div class="lbl"><span class="dot" :style="{ background: cc(b.k) }"></span><b style="color:var(--tx)"><span class="catl" data-a="goCat" :data-cat="b.k" @click="goCat">{{ b.k }}</span></b></div><span v-rich="stTip(b)" class="bd" :class="stClass(b)">{{ b.st == "over" ? t("budgets.st.overBy", { amount: fm(-b.left) }) : tk("budgets.st." + b.st) }}</span></div>
          <div class="val" style="font-size:26px"><small>₪</small>{{ f0(b.s) }} <span class="sm" style="font-weight:400">{{ t("budgets.of", { amount: fm(b.lim) }) }}</span></div>
          <div class="bar"><i :style="{ width: Math.min(100, b.pc) + '%', background: fillColor(b) }"></i><u v-rich="t('budgets.markTip', { day: M.DAYN, days: M.DIM })" :style="{ insetInlineStart: (M.DAYN / M.DIM) * 100 + '%' }"></u></div>
          <div class="sm">{{ b.left >= 0 ? t("budgets.leftLine", { rest: fm(b.left), perDay: fm(b.perDay) }) : t("budgets.overLine") }} · {{ t("budgets.paceLine", { amount: fm(b.pace) }) }}</div>
          <div v-if="M.billsIn(b.k).length" class="bbin"><span class="lbl">{{ t("budgets.inc", { n: M.billsIn(b.k).length }, M.billsIn(b.k).length) }}</span><div v-for="x in M.billsIn(b.k)" :key="x.idx" class="chn" data-a="billOpen" :data-i="x.idx" @click="goBill"><span>{{ x.n }} <small class="sm">{{ billSt(x) }}</small></span><b class="num">{{ x.irregular ? "≈ " : "" }}{{ fm(x.pred) }}</b></div></div>
          <div v-if="M.catJars[b.k]" class="bbin"><span class="lbl">{{ t("budgets.jarT") }}</span><div class="sm" style="margin-top:4px"><b>{{ M.catJars[b.k].j.n }}</b>{{ t("budgets.jarPays", { amount: fm(M.catJars[b.k].j.bal) }) }}</div></div>
          <div class="sm" style="margin-top:8px">{{ t("budgets.lastMonths") }} <template v-if="M.budMonths.length"><template v-for="(v, i) in lastVals(b)" :key="i"><template v-if="i"> · </template><span :style="{ color: v > b.lim ? 'var(--neg)' : 'inherit', fontWeight: 600 }">{{ fm(v) }}</span></template></template><template v-else>{{ t("budgets.noHist") }}</template></div>
          <div v-if="rvOf[b.k]" class="sugg"><div class="sm" style="color:var(--tx);line-height:1.45" v-html="rvOf[b.k].kind == 'lower' ? t('budgets.low', { avg: fm(rvOf[b.k].avg), prop: fm(rvOf[b.k].prop) }) : t('budgets.raise', { over: rvOf[b.k].over, n: M.budMonths.length, avg: fm(rvOf[b.k].avg), prop: fm(rvOf[b.k].prop) })"></div><div class="flex" style="gap:8px;margin-top:8px"><button class="btn s" data-a="budApply" :data-k="b.k" :data-v="rvOf[b.k].prop" @click="apply(rvOf[b.k])">{{ t("budgets.use", { amount: fm(rvOf[b.k].prop) }) }}</button><button class="btn o s" data-a="budLater" :data-k="b.k" @click="later(b.k)">{{ t("budgets.notNow") }}</button></div></div>
          <div class="flex" style="margin-top:12px;gap:8px"><input type="number" inputmode="numeric" :value="b.lim" data-c="budget" :data-k="b.k" style="width:120px" @change="edit(b.k, $event)"><button class="btn r s" data-a="budDel" :data-k="b.k" @click="remove(b.k)">{{ t("budgets.remove") }}</button></div></div>
      </div>

      <div id="budU">
        <template v-if="M.un.length">
          <h2>{{ t("budgets.unTitle") }}</h2>
          <div class="card"><div v-for="[k, v] in M.un" :key="k" class="row"><span class="dot" :style="{ background: cc(k) }"></span><div class="grow click" style="cursor:pointer" data-a="goCat" :data-cat="k" @click="goCat">{{ k }}</div><b class="num">{{ fm(v) }}</b><button class="btn o s" data-a="budNew" :data-k="k" @click="openAdd(k)">{{ t("budgets.setBudget") }}</button></div></div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="S">

  </template>
</template>
