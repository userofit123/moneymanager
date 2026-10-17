<script setup>
// Home: the overview. A copy of the current app's Home page (web/js/03-bills-home.js, renderHome): the four totals at the top,
// accounts, cards, the money flow, spending by category, budgets, upcoming bills, recent activity, jars and exchange rates.
// It only reads: the shared data store and GET /api/fx, the same as the old page. A block with nothing to show is hidden.
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { pages } from "../routes.js";
import { hrefOf, onLink } from "../router.js";
import { formatMoney, currencySymbol } from "../format.js";
import BaseCard from "../components/BaseCard.vue";
import PageHeader from "../components/PageHeader.vue";
import { brandIcon, glyphIcon } from "../brands.js";
import BaseTabs from "../components/BaseTabs.vue";
import BaseTooltip from "../components/BaseTooltip.vue";
import BaseButton from "../components/BaseButton.vue";
import EmptyState from "../components/EmptyState.vue";
import MoneyAmount from "../components/MoneyAmount.vue";
import { homeModel, flowSteps, addM } from "./home.js";
import { displayName } from "./activity.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const fm = (v) => formatMoney(Math.round(v));
const n0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
const link = (name) => hrefOf(pages.find((p) => p.name === name));

const fx = ref({ fx: {}, series: {}, asOf: null, stale: false, live: false });
onMounted(async () => {
  data.start();
  try { const r = await fetch("/api/fx", { cache: "no-store" }); if (!r.ok) throw 0; const j = await r.json(); fx.value = { fx: j.fx || {}, series: j.series || {}, asOf: j.asOf, stale: !!j.stale, live: Object.values(j.series || {}).some((x) => x.length >= 2) }; } catch { /* no rates: the block says so */ }
});

const S = computed(() => data.state.value);
const M = computed(() => homeModel(S.value, new Date(), fx.value.fx));
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthName = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const dstr = (d) => new Date(typeof d === "string" ? d.slice(0, 10) + "T12:00:00" : d).toLocaleDateString(loc.value, { day: "numeric", month: "short" });
const catName = (c) => (!c || c === "Uncategorized" ? t("activity.uncategorized") : c);
const catColor = (c) => (c == "Income" || S.value?.cats?.[c] === 99 ? "var(--pos)" : `var(--c${(S.value?.cats?.[c] == null ? 6 : S.value.cats[c]) % 7})`);

// The four totals at the top.
const kpis = computed(() => {
  const K = M.value.kpi, pm = M.value.pm;
  const sub0 = (K.pen > 0 ? t("home.withPension", { amount: fm(K.withPension) }) : K.missing.length ? "" : t("home.worthSub")) + (K.missing.length ? (K.pen > 0 ? " · " : "") + t("home.notRead", { names: K.missing.join(", ") }) : "");
  return [
    { key: "worth", hero: true, label: t("home.worth"), v: K.cash, sub: sub0, spark: K.nwSpark, col: "var(--onc)", tip: t("home.worthTip") + (K.pen > 0 ? " " + t("home.worthTipPension") : "") + (K.missing.length ? " " + t("home.worthTipMissing") : "") },
    { key: "income", label: t("home.income"), v: K.inc, sub: t("home.vsLast", { amount: fm(K.incLast), month: monthName(pm) }), spark: K.incSpark, col: "var(--pos)", tip: t("home.incomeTip") },
    { key: "expense", label: t("home.expenses"), v: K.ex, sub: t("home.lastMonthAmount", { amount: fm(K.exLast) }), spark: K.exSpark, col: "var(--neg)", tip: t("home.expensesTip") },
    { key: "net", label: t("home.net"), v: K.net, sub: t("home.netSub"), spark: null, tip: t("home.netTip") },
  ];
});
const sparkPath = (a) => {
  const w = 200, h = 46, mn = Math.min(...a), mx = Math.max(...a);
  const p = a.map((v, i) => [(i * w) / Math.max(1, a.length - 1), h - 6 - ((v - mn) / (mx - mn || 1)) * (h - 14)]);
  const l = p.map((x) => x.join(",")).join(" ");
  return { line: l, area: `0,${h} ${l} ${w},${h}` };
};

// Accounts: one card per bank or wallet, listing each currency when there is more than one.
const money2 = (x) => currencySymbol(x.cur) + Number(x.v).toLocaleString("en-US", { minimumFractionDigits: 2 });
const accSub = (g) => {
  if (!g.multi) return { lines: null, text: g.L[0].s || "", chips: g.manual ? t("home.manual") : "" };
  const L = [...g.L]; if (g.wallet && !L.some((x) => x.cur == "ILS")) L.push({ cur: "ILS", v: 0, none: 1 });
  return { lines: L, chips: L.filter((x) => !x.none || g.wallet).map((x) => x.cur).join(" + "), stale: L.some((x) => x.cur != "ILS") && (!fx.value.live || fx.value.stale) };
};

// Money flow.
const FLOWKEY = "moneyFlow";
const flowMode = ref((() => { try { return localStorage.getItem(FLOWKEY) === "actual" ? "actual" : "left"; } catch { return "left"; } })());
watch(flowMode, (v) => { try { localStorage.setItem(FLOWKEY, v); } catch { /* not remembered */ } });
const flowOpts = computed(() => [{ value: "left", label: t("home.planned") }, { value: "actual", label: t("home.actual") }]);
const W = computed(() => flowSteps(M.value.flow, flowMode.value));
const PAL = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c5)", "var(--c6)", "var(--c0)", "var(--c4)"];
const colName = (c) => c.kind === "start" ? t("home.beforeSpending") : c.kind === "end" ? (W.value.eOver > 0 ? t("home.short") : W.value.ACT ? t("home.availableNow") : t("home.freeToUse"))
  : c.k === "jars" ? t("home.inNJars", { n: c.n }, c.n) : c.k === "cushion" ? t("home.cushion") : c.k === "other" ? t("home.otherN", { n: c.rest.length }) : c.unplanned ? t("home.unplanned") : catName(c.k);
const cols = computed(() => { let i = 0; return W.value.cols.map((c) => ({ ...c, name: colName(c), color: c.kind === "set" ? (c.k === "jars" ? "var(--c4)" : "var(--c5)") : c.over ? "var(--neg)" : c.kind === "item" ? PAL[i++ % PAL.length] : "" })); });
const colTip = (c) => {
  const F = M.value.flow;
  if (c.kind === "start") return t("home.startTip", { cash: fm(F.cash), spent: fm(W.value.spentAll) }) + " " + (W.value.ACT ? t("home.startTipActual") : t("home.startTipPlanned"));
  if (c.kind === "end") return W.value.ACT ? t("home.availTip", { cash: fm(F.cash), saved: fm(F.saved) }) : W.value.eOver > 0 ? t("home.shortTip") : t("home.freeTip");
  if (c.k === "jars") return t("home.jarsTip", { amount: fm(F.inJars) });
  if (c.k === "cushion") return t("home.cushionTip", { amount: fm(F.buffer) });
  if (c.k === "other") return t("home.otherTip") + " " + c.rest.map((x) => colName(x) + " " + fm(x.a)).join(", ");
  if (c.unplanned) return t("home.unplannedTip", { amount: fm(c.spent) });
  const kind = c.kind === "budget" ? "budget" : c.kind === "bill" ? "bill" : "typical";
  return tk("home.itemTip." + kind, { base: fm(c.base || 0), spent: fm(c.spent || 0), remain: fm(c.left || 0) }) + (c.over ? " " + t("home.overBy", { amount: fm(c.spent - c.base) }) : "");
};
const topOf = (c) => (c.kind === "start" ? fm(c.a) : c.kind === "end" ? "–" : fm(c.a));
const leftOf = (c) => (c.kind === "end" ? (W.value.eOver > 0 ? "−" + fm(W.value.eOver) : fm(W.value.eFree)) : fm(c.lo));

// Spending by category (ring chart).
const donut = computed(() => {
  const data0 = M.value.spend, tot = data0.reduce((s, x) => s + x[1], 0) || 1, R = 84, r = 58, gap = 0.03; let a = -Math.PI / 2;
  const p = (x, y) => [100 + x * Math.cos(y), 100 + x * Math.sin(y)];
  return { tot, parts: data0.map(([n, v]) => { const b = a + (v / tot) * 2 * Math.PI, l = b - a - gap > Math.PI ? 1 : 0, a2 = a + gap / 2, b2 = b - gap / 2;
    const [x1, y1] = p(R, a2), [x2, y2] = p(R, b2), [x3, y3] = p(r, b2), [x4, y4] = p(r, a2); a = b;
    return { n, v, pc: Math.round((v / tot) * 100), color: catColor(n), d: `M${x1} ${y1}A${R} ${R} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${l} 0 ${x4} ${y4}Z` }; }) };
});
const hover = ref(null);

// Exchange rates.
const fxCur = ref("USD");
const fxKeys = computed(() => Object.keys(fx.value.series).filter((k) => (fx.value.series[k] || []).length > 1));
watch(fxKeys, (ks) => { if (ks.length && !ks.includes(fxCur.value)) fxCur.value = ks[0]; }, { immediate: true });
const fxView = computed(() => {
  const ser = fx.value.series[fxCur.value] || []; if (ser.length < 2) return null;
  const v = ser.map((x) => x[1]), last = v[v.length - 1], ch = (last / v[0] - 1) * 100, mn = Math.min(...v), mx = Math.max(...v), av = v.reduce((a, b) => a + b) / v.length;
  const Wd = 460, H = 170, P = 40, sp = mx - mn || Math.max(mn * 0.01, 0.01), lo = mn - sp * 0.2, hi = mx + sp * 0.2, x = (i) => P + (i * (Wd - P - 12)) / (v.length - 1), y = (q) => H - 22 - ((q - lo) / (hi - lo)) * (H - 36);
  const grid = [0, 1, 2, 3].map((k) => { const q = lo + ((hi - lo) * k) / 3; return { y: y(q), label: q.toFixed(2) }; });
  const pts = v.map((q, i) => x(i) + "," + y(q)).join(" ");
  return { Wd, H, P, grid, pts, area: `${x(0)},${H - 22} ${pts} ${x(v.length - 1)},${H - 22}`, lastX: x(v.length - 1), lastY: y(last), first: ser[0][0].slice(5), end: ser[ser.length - 1][0].slice(5), last, ch, mn, mx, av, pos: mx > mn ? Math.min(100, Math.max(0, ((last - mn) / (mx - mn)) * 100)) : 50 };
});
const fxOpts = computed(() => fxKeys.value.map((k) => ({ value: k, label: k + " → ILS" })));

const H2 = { recent: "activity", budg: "budgets", bills: "bills", jars: "jars", donut: "reports", accts: "accounts", fx: "settings" };
const amtText = (x) => (x.a > 0 ? "+" : "−") + "₪" + n0(x.a);
const nm = (x) => displayName(S.value, x);
</script>

<template>
  <div class="home">
    <PageHeader :title="t('nav.home')" />

    <p v-if="data.error.value && !S" class="muted">{{ t("home.loadError") }}</p>
    <p v-else-if="!S" class="muted">{{ t("home.loading") }}</p>

    <template v-else>
      <BaseCard v-if="!M.any">
        <EmptyState :title="t('home.emptyTitle')" :text="t('home.emptyText')">
          <template #action>
            <div class="acts"><a href="/settings"><BaseButton size="small">{{ t("home.connect") }}</BaseButton></a><a :href="link('activity')" @click="onLink"><BaseButton size="small" variant="outline">{{ t("home.addTx") }}</BaseButton></a></div>
          </template>
        </EmptyState>
      </BaseCard>

      <template v-else>
        <div class="grid g4 kpis">
          <div v-for="c in kpis" :key="c.key" class="kt" :class="{ hero: c.hero }"><BaseTooltip :text="c.tip">
            <BaseCard :hero="c.hero" class="kpi">
              <div class="lbl"><span class="gi" v-html="glyphIcon(c.key, { worth: 'var(--acc)', income: 'var(--pos)', expense: 'var(--neg)', net: 'var(--acc)' }[c.key])" /><span>{{ c.label }}</span></div>
              <div class="val num" dir="ltr"><small>₪</small>{{ c.key === "net" && c.v < 0 ? "−" : "" }}{{ n0(c.v) }}</div>
              <div class="sm">{{ c.sub }}</div>
              <svg v-if="c.spark" class="spark" viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient :id="'sg' + c.key" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.col" stop-opacity="0" /></linearGradient></defs>
                <polygon :points="sparkPath(c.spark).area" :fill="'url(#sg' + c.key + ')'" /><polyline :points="sparkPath(c.spark).line" fill="none" :stroke="c.col" stroke-width="2" vector-effect="non-scaling-stroke" />
              </svg>
            </BaseCard>
          </BaseTooltip></div>
        </div>

        <section v-if="M.has.accts">
          <h2>{{ t("home.accounts") }}<a class="hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div class="grid g3">
            <BaseCard v-for="g in M.groups" :key="g.n" class="acc" :style="g.manual ? 'opacity:.85' : ''">
              <div class="lbl"><span class="gi" v-html="brandIcon(g.n, g.L[0].src, g.L[0].kind, g.L[0].ck)" /><span>{{ g.n }}</span><span v-if="accSub(g).chips" class="chip">{{ accSub(g).chips }}</span></div>
              <div class="val num" dir="ltr"><small>₪</small>{{ n0(g.total) }}</div>
              <div class="sm">
                <template v-if="accSub(g).lines">
                  <div v-for="x in accSub(g).lines" :key="x.cur" class="cur"><span>{{ x.cur }} · <i v-if="x.none">{{ t("home.noShekel") }}</i><template v-else><span dir="ltr">{{ money2(x) }}</span><span v-if="x.cur != 'ILS'" class="dim" dir="ltr"> × {{ (fx.fx[x.cur] || 1).toFixed(4) }}</span></template></span><b class="num" dir="ltr">₪{{ n0(x.none ? 0 : x.v * M.rate(x.cur)) }}</b></div>
                  <div v-if="accSub(g).stale" class="dim">{{ fx.live ? t("home.fxStale") : t("home.fxNone") }}</div>
                </template>
                <template v-else>{{ accSub(g).text }}</template>
              </div>
            </BaseCard>
          </div>
        </section>

        <section v-if="M.has.cards">
          <h2>{{ t("home.cards") }}<a class="hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div class="grid g3">
            <div v-for="c in M.cards" :key="c.n" class="kt"><BaseTooltip :text="c.wise ? t('home.wiseCardTip') : t('home.cardTip')">
              <BaseCard>
                <div class="lbl"><span class="gi" v-html="brandIcon(c.n, c.acc?.src, c.acc?.kind || 'card', c.acc?.ck)" /><span>{{ c.n }} · {{ c.wise ? t("home.paidNow") : t("home.upcomingCharge") }}</span></div>
                <div class="val num" dir="ltr"><small>₪</small>{{ n0(c.now) }}</div>
                <div class="sm">{{ t("home.lastMonthAmount", { amount: fm(c.last) }) }} <span v-if="c.last" class="bd" :class="c.now - c.last > 0 ? 'up' : 'dn'" dir="ltr">{{ c.now - c.last > 0 ? "▲" : "▼" }} {{ Math.round(Math.abs(c.now - c.last) / c.last * 100) }}%</span></div>
                <div class="pbar"><i :style="{ inlineSize: Math.min(100, c.now / Math.max(c.now, c.last, 1) * 100) + '%', background: c.now - c.last > 0 ? 'var(--neg)' : 'var(--pos)' }" /></div>
              </BaseCard>
            </BaseTooltip></div>
          </div>
        </section>

        <section v-if="M.has.flow">
          <h2><span>{{ flowMode === "actual" ? t("home.flowSoFar") : t("home.flowAhead") }}</span><span class="h2r"><BaseTabs v-model="flowMode" :options="flowOpts" :label="t('home.flowMode')" /><a class="hl" href="/" >{{ t("home.fullBreakdown") }}</a></span></h2>
          <BaseCard class="flow">
            <div class="fsr">
              <div class="fst" :title="colTip(cols[0])"><span>{{ t("home.beforeSpending") }}</span><b class="num" dir="ltr">{{ fm(W.start) }}</b><small>{{ t("home.inAccounts") }} <span dir="ltr">{{ fm(M.flow.cash) }}</span><br>{{ t("home.spentSoFar") }} <span dir="ltr">{{ fm(W.spentAll) }}</span></small></div>
              <i>−</i>
              <div class="fst" :title="t('home.putAsideTip')"><span>{{ t("home.putAside") }}</span><b class="num" dir="ltr">{{ fm(M.flow.saved) }}</b><small>{{ t("home.inJars") }} <span dir="ltr">{{ fm(M.flow.inJars) }}</span><br>{{ t("home.cushion") }} <span dir="ltr">{{ fm(M.flow.buffer) }}</span></small></div>
              <i>−</i>
              <div v-if="W.ACT" class="fst" :title="t('home.spentMonthTip')"><span>{{ t("home.spentMonth") }}</span><b class="num" dir="ltr">{{ fm(W.spentAll) }}</b><small>{{ t("home.whatYouSpent") }}</small></div>
              <div v-else class="fst" :title="t('home.plannedTip')"><span>{{ t("home.budgetsBills") }}</span><b class="num" dir="ltr">{{ fm(W.spentAll + W.leftTot) }}</b><small>{{ t("home.spentSoFar") }} <span dir="ltr">{{ fm(W.spentAll) }}</span><br>{{ t("home.stillToCome") }} <span dir="ltr">{{ fm(W.leftTot) }}</span></small></div>
              <i>=</i>
              <div class="fst key end" :class="{ neg: W.eOver > 0 }" :title="colTip(cols[cols.length - 1])"><span>{{ W.eOver > 0 ? t("home.shortBy") : W.ACT ? t("home.availableNow") : t("home.freeToUse") }}</span><b class="num" :class="{ neg: W.eOver > 0 }" dir="ltr">{{ W.eOver > 0 ? "−" + fm(W.eOver) : fm(W.eFree) }}</b><small>{{ W.ACT ? t("home.notPutAside") : W.eOver > 0 ? t("home.morePlanned") : t("home.afterPlanned") }}</small></div>
            </div>
            <div class="wf2" :style="{ '--n': cols.length }">
              <div class="wrl w1" style="grid-row: 1">{{ W.ACT ? t("home.spentSoFar") : t("home.budgetOrUsual") }}</div>
              <div class="wrl wnb" style="grid-row: 3">{{ t("home.whatsLeft") }}</div>
              <div v-for="(c, i) in cols" :key="i" class="wc" :class="[c.kind, c.tone]" :style="{ '--c': i + 2 }" :title="colTip(c)">
                <div class="wca num" :data-l="W.ACT ? t('home.spentSoFar') : t('home.budgetOrUsual')" dir="ltr">{{ topOf(c) }}</div>
                <div class="wcp"><i class="wcg" :style="{ '--b': c.b, '--h': c.h }" /><i class="wcs" :class="[c.kind, c.tone, { jn: c.kind === 'item' || c.kind === 'set' }]" :style="{ '--h': c.s, background: c.color || undefined }" /></div>
                <div class="wct num" :data-l="t('home.whatsLeft')"><span dir="ltr" :class="{ neg: c.kind === 'end' && W.eOver > 0 }">{{ leftOf(c) }}</span></div>
                <div class="wcn"><b>{{ c.name }}</b></div>
              </div>
            </div>
          </BaseCard>
        </section>

        <div class="grid g2">
          <section v-if="M.has.donut">
            <h2><span>{{ t("home.byCategory") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="hl" :href="link(H2.donut)" @click="onLink">{{ t("home.all") }}</a></h2>
            <BaseCard>
              <div class="dnt" :class="{ hv: hover }">
                <svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" role="img" :aria-label="t('home.byCategory')">
                  <path v-for="p in donut.parts" :key="p.n" :d="p.d" :fill="p.color" :class="{ on: hover === p.n }" @mouseenter="hover = p.n" @mouseleave="hover = null"><title>{{ catName(p.n) }}: ₪{{ n0(p.v) }} ({{ p.pc }}%)</title></path>
                  <text x="100" y="98" text-anchor="middle" class="dt">₪{{ n0(donut.tot) }}</text>
                  <text x="100" y="117" text-anchor="middle" class="ds">{{ t("home.spentThisMonth") }}</text>
                </svg>
                <div class="legend">
                  <div v-for="p in donut.parts" :key="p.n" :class="{ on: hover === p.n }" @mouseenter="hover = p.n" @mouseleave="hover = null"><span class="dot" :style="{ background: p.color }" /><span>{{ catName(p.n) }}</span><b class="num" dir="ltr">₪{{ n0(p.v) }}</b></div>
                </div>
              </div>
            </BaseCard>
          </section>

          <section v-if="M.has.budg">
            <h2><span>{{ t("home.budgets") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="hl" :href="link(H2.budg)" @click="onLink">{{ t("home.all") }}</a></h2>
            <BaseCard>
              <div v-for="b in M.budgets.slice(0, 8)" :key="b.k" class="bud">
                <div class="sp"><b>{{ catName(b.k) }}</b><span class="sm num" dir="ltr">{{ fm(b.s) }} / {{ fm(b.lim) }}</span></div>
                <div class="pbar" role="progressbar" :aria-label="catName(b.k)" aria-valuemin="0" :aria-valuemax="b.lim" :aria-valuenow="Math.round(b.s)"><i :style="{ inlineSize: Math.min(100, b.pc) + '%', background: b.st == 'over' ? 'var(--neg)' : b.st == 'warn' ? 'var(--warn)' : undefined }" /><u :style="{ insetInlineStart: (M.DAYN / M.DIM) * 100 + '%' }" /></div>
              </div>
              <a v-if="M.budgets.length > 8" class="sm hl2" :href="link('budgets')" @click="onLink">{{ t("home.moreBudgets", { n: M.budgets.length - 8 }) }}</a>
            </BaseCard>
          </section>

          <section v-if="M.has.bills">
            <h2>{{ t("home.upcomingBills") }}<a class="hl" :href="link(H2.bills)" @click="onLink">{{ t("home.all") }}</a></h2>
            <BaseCard>
              <div v-for="b in M.upcoming" :key="b.idx" class="row">
                <div class="grow"><b>{{ b.n }}</b><div class="sm">{{ b.status == "overdue" ? t("home.overdueSince", { date: dstr(b.pd) }) : t("home.dueIn", { date: dstr(b.nx), n: b.days }, b.days) }}</div></div>
                <b class="num" dir="ltr">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b>
              </div>
              <div v-if="!M.upcoming.length" class="sm">{{ t("home.noUpcoming") }}</div>
            </BaseCard>
          </section>

          <section v-if="M.has.recent">
            <h2>{{ t("home.recent") }}<a class="hl" :href="link(H2.recent)" @click="onLink">{{ t("home.all") }}</a></h2>
            <BaseCard class="recent">
              <a v-for="x in M.recent" :key="x.id" class="txi" :href="link('activity')" @click="onLink">
                <span class="av" :style="{ background: 'color-mix(in srgb,' + catColor(x.c || 'Uncategorized') + ' 22%,transparent)', color: catColor(x.c || 'Uncategorized') }" aria-hidden="true">{{ (nm(x) || "?")[0] }}</span>
                <div class="grow"><div class="mer">{{ nm(x) }}</div><div class="sm">{{ catName(x.c) }} · {{ dstr(x.d) }}</div></div>
                <b class="num" :class="{ pos: x.a > 0 }" dir="ltr">{{ amtText(x) }}</b>
              </a>
              <div v-if="!M.recent.length" class="sm">{{ t("home.noRecent") }}</div>
            </BaseCard>
          </section>

          <section v-if="M.has.jars">
            <h2>{{ t("home.jars") }}<a class="hl" :href="link(H2.jars)" @click="onLink">{{ t("home.all") }}</a></h2>
            <BaseCard>
              <div v-for="j in M.jars" :key="j.id" class="bud">
                <div class="sp"><b>{{ j.n }}</b><span class="num" :class="{ pos: j.got }" dir="ltr">{{ j.got ? t("home.gotThisMonth", { amount: "+₪" + n0(j.got) }) : j.want > 0 ? t("home.waiting") : "" }}</span></div>
                <div v-if="!j.open" class="pbar"><i :style="{ inlineSize: Math.min(100, j.pc) + '%', background: 'var(--c' + ((j.p - 1) % 7 + 7) % 7 + ')' }" /></div>
                <div class="sm num">{{ j.open ? t("home.savedNoGoal", { amount: "₪" + n0(j.bal) }) : t("home.ofGoal", { amount: "₪" + n0(j.bal), goal: "₪" + n0(j.need), pc: j.pc }) }}</div>
              </div>
              <div class="jfoot"><span class="sm">{{ t("home.safeToJars") }}</span><b class="num" dir="ltr">₪{{ n0(M.flow.free) }}</b></div>
            </BaseCard>
          </section>

          <section>
            <h2>{{ t("home.fx") }}<a class="hl" :href="link(H2.fx)" @click="onLink">{{ t("home.currencies") }}</a></h2>
            <BaseCard>
              <div v-if="!fxView" class="sm">{{ t("home.fxLoading") }}</div>
              <template v-else>
                <div class="fxh"><BaseTabs v-if="fxKeys.length > 1" v-model="fxCur" :options="fxOpts" :label="t('home.fx')" /><span v-else class="fxpair" dir="ltr">{{ fxCur }} → ILS</span><span class="bd" :class="Math.abs(fxView.ch) < .005 ? '' : fxView.ch > 0 ? 'dn' : 'up'"><span dir="ltr">{{ Math.abs(fxView.ch) < .005 ? "▬" : fxView.ch > 0 ? "▲" : "▼" }} {{ Math.abs(fxView.ch).toFixed(2) }}%</span> · {{ t("home.days30") }}</span></div>
                <div class="fxr" dir="ltr"><span class="fxl">{{ currencySymbol(fxCur) }}1</span><span class="fxe">=</span><b class="num">₪{{ fxView.last.toFixed(4) }}</b></div>
                <svg width="100%" :viewBox="`0 0 ${fxView.Wd} ${fxView.H}`" class="fxc" aria-hidden="true">
                  <g v-for="(g, i) in fxView.grid" :key="i"><line class="gl" :x1="fxView.P" :x2="fxView.Wd - 12" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="fxView.P - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></g>
                  <defs><linearGradient id="fxg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35" /><stop offset="1" stop-color="var(--acc)" stop-opacity="0" /></linearGradient></defs>
                  <polygon fill="url(#fxg)" :points="fxView.area" /><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" :points="fxView.pts" />
                  <circle :cx="fxView.lastX" :cy="fxView.lastY" r="5" fill="var(--bg)" stroke="var(--acc)" stroke-width="2.5" />
                  <text :x="fxView.P" :y="fxView.H - 5">{{ fxView.first }}</text><text :x="fxView.Wd - 12" :y="fxView.H - 5" text-anchor="end">{{ fxView.end }}</text>
                </svg>
                <div class="fxs">
                  <div class="fxt"><span>{{ t("home.low") }}</span><b class="num">{{ fxView.mn.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.average") }}</span><b class="num">{{ fxView.av.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.high") }}</span><b class="num">{{ fxView.mx.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.vsRange") }}</span><b class="num">{{ fxView.last.toFixed(3) }}</b><div class="fxbar"><i :style="{ insetInlineStart: fxView.pos.toFixed(1) + '%' }" /></div></div>
                </div>
                <div class="fxf"><span>{{ fx.stale ? t("home.fxStaleAt", { date: fx.asOf }) : t("home.fxSource", { date: fx.asOf }) }}</span><span>{{ t("home.fxUse") }}</span></div>
              </template>
            </BaseCard>
          </section>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: 0; overflow-x: clip; }
.g2 h2 { margin-top: 0; }
.g2 { margin-top: 28px; }
.hl2 { color: var(--acc); font-weight: 600; text-decoration: none; cursor: pointer; text-transform: none; letter-spacing: 0; }
.mo { font-weight: 400; color: var(--tx2); }
.grid { display: grid; gap: 16px; }
.g4 { grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
.g3 { grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); }
.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.kt { min-width: 0; }
.kt > :deep(.tw) { display: flex; width: 100%; height: 100%; }
.kt > :deep(.tw > span:first-child) { display: block; width: 100%; }
.kt :deep(.card) { height: 100%; }
.lbl { font-size: 13px; color: var(--tx2); display: flex; align-items: center; gap: 8px; font-weight: 500; }
:deep(.hero) .lbl, :deep(.hero) .sm { color: color-mix(in srgb, var(--onc) 75%, transparent); }
.gi { display: contents; }
.val { font-size: 32px; font-weight: 600; margin: 8px 0 2px; letter-spacing: -1px; text-align: start; }
html.he .val { text-align: end; }
.val small { font-size: .55em; font-weight: 500; opacity: .6; margin-inline-end: 2px; }
.sm { font-size: var(--fs-sm); color: var(--tx2); }
.dim { opacity: .65; }
.spark { position: absolute; inset-inline-end: 0; bottom: 0; width: 55%; height: 46px; opacity: .9; }
.kpi .sm { position: relative; z-index: 1; padding-inline-end: 0; }
.av { width: 34px; height: 34px; border-radius: 12px; display: inline-grid; place-items: center; font-weight: 700; font-size: 14px; flex: none; background: var(--s2); color: var(--tx2); }
.acc .lbl .av { width: 28px; height: 28px; border-radius: 9px; font-size: 13px; }
.chip { margin-inline-start: auto; padding: 1px 9px; border-radius: var(--pill); background: var(--s2); font-size: 12px; font-weight: 600; color: var(--tx2); }
.cur { display: flex; justify-content: space-between; gap: 8px; margin-top: 3px; }
.cur b { color: var(--tx); }
.bd { font-size: 12px; padding: 0 9px; height: 20px; line-height: 16px; border-radius: 99px; font-weight: 600; display: inline-flex; gap: 3px; align-items: center; white-space: nowrap; background: var(--s2); color: var(--tx2); }
.bd.up { background: color-mix(in srgb, var(--neg) 14%, transparent); color: var(--neg); }
.bd.dn { background: color-mix(in srgb, var(--pos) 14%, transparent); color: var(--pos); }
.pbar { position: relative; height: 8px; background: var(--s2); border-radius: var(--pill); margin: 8px 0 2px; }
.pbar i { display: block; height: 100%; border-radius: var(--pill); background: linear-gradient(90deg, var(--acc), var(--acc2)); }
.pbar u { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--tx2); opacity: .5; }
.bud { margin-bottom: 14px; }
.sp { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
.row { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--ol); }
.row:first-child { border-top: 0; padding-top: 0; }
.row b { font-size: 14px; }
.grow { flex: 1; min-width: 0; }
.recent { padding: 8px 12px; }
.txi { display: flex; gap: 12px; align-items: center; padding: 12px 4px; border-top: 1px solid var(--ol); color: inherit; text-decoration: none; cursor: pointer; }
.txi:first-child { border-top: 0; }
.mer { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jfoot { border-top: 1px solid var(--ol); padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
.jfoot b { font-size: 18px; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
/* spending ring */
.dnt { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.dsvg { max-width: 100%; flex: none; }
.dnt path { transition: opacity .15s, transform .15s; transform-origin: 100px 100px; cursor: pointer; }
.dnt.hv path { opacity: .3; }
.dnt.hv path.on { opacity: 1; transform: scale(1.045); }
.dt { font-size: 22px; font-weight: 600; fill: var(--tx); }
.ds { font-size: 12px; fill: var(--tx2); }
.legend { display: flex; flex-direction: column; gap: 9px; font-size: 13px; flex: 1; min-width: 170px; }
.legend div { display: flex; align-items: center; gap: 9px; padding: 3px 8px; margin: -3px -8px; border-radius: 9px; transition: background .15s, opacity .15s; }
.dnt.hv .legend div { opacity: .5; }
.dnt.hv .legend div.on { opacity: 1; background: var(--s2); }
.legend b { margin-inline-start: auto; padding-inline-start: 20px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
/* money flow */
.h2r { display: inline-flex; align-items: center; gap: 14px; }
.h2r :deep(.seg) { margin: 0; }
.h2r :deep(.seg button) { padding: 5px 12px; min-height: 28px; font-size: 12px; }
.flow { padding: 22px 24px; }
.fsr { display: flex; flex-wrap: wrap; align-items: stretch; gap: 10px 8px; margin-bottom: 22px; }
.fsr > i { align-self: center; font-style: normal; color: var(--tx2); font-size: 20px; flex: none; }
.fst { flex: 1 1 150px; min-width: 0; display: block; padding: 13px 16px; border-radius: 16px; border: 1px solid var(--ol); background: var(--s1); }
.fst span { display: block; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 4px; }
.fst small span { display: inline; font-weight: 400; margin: 0; }
.fst b { display: block; font-size: 22px; font-weight: 700; letter-spacing: -.3px; text-align: start; }
html.he .fst b { text-align: end; }
.fst small { display: block; font-size: 12px; color: var(--tx2); margin-top: 3px; line-height: 1.4; }
.fst.key { background: var(--s2); }
.fst.end { background: color-mix(in srgb, var(--acc) 13%, var(--s1)); border-color: color-mix(in srgb, var(--acc) 35%, var(--ol)); }
.fst.end.neg { background: color-mix(in srgb, var(--neg) 12%, var(--s1)); border-color: color-mix(in srgb, var(--neg) 35%, var(--ol)); }
.wf2 { display: grid; grid-template-columns: 100px repeat(var(--n), minmax(72px, 1fr)); grid-template-rows: auto 210px auto auto; column-gap: 12px; overflow-x: auto; padding: 4px 2px 8px; }
.wc { display: grid; grid-row: 1 / span 4; grid-column: var(--c); grid-template-rows: subgrid; min-width: 0; text-align: center; }
.wca { font-size: 15px; font-weight: 650; min-height: 24px; line-height: 24px; white-space: nowrap; margin-bottom: 6px; }
.wcp { position: relative; border-radius: 10px 10px 0 0; background: repeating-linear-gradient(0deg, transparent 0 41px, var(--ol) 41px 42px); }
.wcs, .wcg { position: absolute; inset-inline: 0; display: block; }
.wcs { bottom: 0; height: calc(var(--h) * 1%); min-height: 3px; border-radius: 7px 7px 0 0; background: var(--acc); }
.wcs.end.pos { background: var(--pos); } .wcs.end.neg { background: var(--neg); } .wcs.end.none { background: var(--tx2); }
.wcs.jn { border-radius: 0; }
.wcg { bottom: calc(var(--b) * 1%); height: calc(var(--h) * 1%); background: color-mix(in srgb, var(--acc) 30%, transparent); border-radius: 7px 7px 0 0; }
.wcn { padding: 10px 0 8px; line-height: 1.25; overflow-wrap: break-word; }
.wcn b { font-size: 13.5px; font-weight: 600; }
.wct, .wrl { padding: 9px 4px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
.wct { font-weight: 650; background: color-mix(in srgb, var(--acc) 14%, var(--s1)); border-radius: 0 0 10px 10px; }
.wrl { grid-column: 1; justify-content: flex-start; text-align: start; color: var(--tx2); font-size: 12px; font-weight: 600; white-space: nowrap; padding-inline: 0 4px; }
.wrl.w1 { align-items: flex-start; padding-top: 2px; }
.wc.end.pos .wca { color: var(--pos); } .wc.end.neg .wca { color: var(--neg); }
/* exchange rates */
.fxh { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.fxh :deep(.seg) { margin: 0; }
.fxpair { font-size: 13px; font-weight: 600; color: var(--tx2); }
.fxr { display: flex; align-items: baseline; gap: 10px; margin-top: 12px; justify-content: flex-start; }
html.he .fxr { justify-content: flex-end; }
.fxr b { font-size: 26px; font-weight: 650; letter-spacing: -.4px; }
.fxl, .fxe { font-size: 20px; font-weight: 600; color: var(--tx2); }
.fxc { margin-top: 6px; }
.fxc text { font-size: 11px; fill: var(--tx2); }
.fxc .gl { stroke: var(--ol); }
.fxs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.fxt { background: var(--s2); border-radius: 12px; padding: 9px 12px; min-width: 0; }
.fxt span { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: var(--tx2); margin-bottom: 2px; }
.fxt b { font-size: 16px; font-weight: 650; }
.fxbar { position: relative; height: 5px; border-radius: 99px; background: color-mix(in srgb, var(--tx) 14%, transparent); margin-top: 8px; }
.fxbar i { position: absolute; top: 50%; width: 11px; height: 11px; border-radius: 50%; background: var(--acc); border: 2px solid var(--bg); transform: translate(-50%, -50%); box-sizing: border-box; }
html.he .fxbar i { transform: translate(50%, -50%); }
.fxf { display: flex; justify-content: space-between; gap: 6px 16px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--ol); font-size: 12px; color: var(--tx2); }

@media (max-width: 760px) {
  .val { font-size: 27px; }
  .g2 { grid-template-columns: minmax(0, 1fr); }
  .grid { gap: 12px; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .kpis .kt.hero, .kpis .kt:last-child:nth-child(even) { grid-column: 1 / -1; }
  .kpis :deep(.card) { padding: 14px 15px; border-radius: 18px; }
  .kpis .val { font-size: 23px; margin: 4px 0; }
  .kpis .lbl, .kpis .sm { font-size: 12px; }
  .kpis .kt:not(.hero) .spark { position: static; display: block; width: 100%; height: 30px; margin-top: 8px; }
  .dsvg { display: block; margin: 0 auto; }
  .dnt { flex-direction: column; }
  .legend { min-width: 0; width: 100%; }
  .legend div { margin-inline: 0; }
  .flow { padding: 16px; }
  .fsr > i { display: none; }
  .fst { flex: 1 1 calc(50% - 8px); }
  .wf2 { display: flex; flex-direction: column; overflow: visible; gap: 16px; }
  .wrl { display: none; }
  .wc { display: grid; grid-template-columns: 1fr auto; grid-template-rows: none; grid-template-areas: "n a" "p p" "t t"; text-align: start; align-items: center; }
  .wca { grid-area: a; margin: 0; min-height: 0; }
  .wca::before { content: attr(data-l); color: var(--tx2); font-size: 12px; font-weight: 500; margin-inline-end: 8px; }
  .wc.start .wca::before, .wc.set .wca::before, .wc.end .wca::before { content: none; }
  .wcn { grid-area: n; padding: 0; }
  .wcp { grid-area: p; height: 12px; margin: 8px 0; border-radius: 99px; background: var(--s2); overflow: hidden; }
  .wcs { top: 0; bottom: 0; height: auto; inset-inline: 0 auto; width: calc(var(--h) * 1%); border-radius: 99px; }
  .wcs.jn { border-start-start-radius: 99px; border-end-start-radius: 99px; border-start-end-radius: 0; border-end-end-radius: 0; }
  .wcg { top: 0; bottom: 0; height: auto; inset-inline-start: calc(var(--b) * 1%); inset-inline-end: auto; width: calc(var(--h) * 1%); border-radius: 0; border-start-end-radius: 99px; border-end-end-radius: 99px; }
  .wct { grid-area: t; border-radius: 0; justify-content: space-between; background: none; padding: 4px 0; font-size: 13px; }
  .wct::before { content: attr(data-l); color: var(--tx2); font-size: 12px; font-weight: 500; }
  .fxs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .h2r { gap: 8px; }
  h2 { flex-wrap: wrap; }
}
</style>
