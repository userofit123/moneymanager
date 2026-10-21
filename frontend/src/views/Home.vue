<script setup>
// Home: the overview. A copy of the current app's Home page (web/js/03-bills-home.js, renderHome): alerts, the four totals, accounts, cards,
// the money flow, spending by category, budgets, upcoming bills, recent activity, jars and exchange rates, with the same hover texts.
// It only reads: the shared data store and GET /api/fx, the same as the old page. A block with nothing to show is hidden.
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { openAlert as openAlertFrom, goActivity } from "../core/shell.js";
import { openForm } from "../core/forms.js";
import { amtText } from "../lib/txrows.js";
import { openSettingsTab } from "./settings/tab.js";
import { home } from "../core/derived.js";
import { now } from "../core/clock.js";
import { readPref, writePref } from "../core/prefs.js";
import { pages } from "../routes.js";
import { hrefOf, onLink, go } from "../router.js";
import { formatMoney, currencySymbol } from "../format.js";
import PageHeader from "../components/PageHeader.vue";
import { brandIcon, glyphIcon } from "../brands.js";
import BaseTabs from "../components/BaseTabs.vue";
import { flowSteps } from "./home.js";
import { alertsModel } from "./alerts.js";
import { openTx, openPop } from "../core/txwin.js";
import AvailWhy from "./AvailWhy.vue";
import { vTip, TP } from "../core/tooltip.js";
import { dcell, dstr, titleCase } from "../dates.js";
import { categoryName } from "../catnames.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const fm = (v) => formatMoney(Math.round(v));
const n0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
const link = (name) => hrefOf(pages.find((p) => p.name === name));
const to = (name) => go(hrefOf(pages.find((p) => p.name === name)));
const an = (n) => categoryName(n, locale.value); // a bank, card or wallet name
const cur = (c) => (locale.value === "he" ? { USD: "דולר", ILS: "שקל" }[c] || c : c);
const pair = (c) => (locale.value === "he" && c === "USD" ? "דולר ← שקל" : c + " → ILS");
const lblOf = (a) => (a.lbl || a.n).replace(a.n, an(a.n));

const fx = data.fx; // exchange rates, loaded with the data
onMounted(async () => {
  data.start();
});

const S = computed(() => data.state.value);
const M = home; // worked out once for the whole app (core/derived.js)
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthName = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const catName = (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : categoryName(c, locale.value));
const catColor = (c) => (c == "Income" || S.value?.cats?.[c] === 99 ? "var(--pos)" : `var(--c${(S.value?.cats?.[c] == null ? 6 : S.value.cats[c]) % 7})`);
const nm = (x) => M.value.nameOf(x);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const accTail = (n) => { const m = /··\s*(\S+)$/.exec(n); if (m) return m[1]; const a = (S.value?.accounts || []).find((x) => x.n == n && x.tail); return a ? a.tail : ""; };
const accLbl = (n) => { const m = /^(.*?)\s*··\s*(\S+)$/.exec(n), tl = m ? m[2] : accTail(n), sp = (x) => ` <span class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· ${esc(x)}</span>`; return m ? esc(titleCase(an(m[1]))) + sp(tl) : esc(titleCase(an(n))) + (tl ? sp(tl) : ""); };

// Alerts: the first three, like the old page. Their sentences come from the language files.
const friendly = (e) => {
  e = e || "";
  if (/fetchPostWithinPage|fetchGetWithinPage|Unexpected end of JSON/i.test(e)) { const st = (e.match(/reqName=([A-Za-z_0-9]+)/) || [])[1] || ""; return /^(ValidateIdData|performLogonI)$/.test(st) ? t("al.feLogon") : t("al.feNoData") + (st ? t("al.feStep", { st }) : ""); }
  return /^OTP_REQUIRED/.test(e) ? t("al.feOtp") : e;
};
const alertList = computed(() => (S.value && M.value.any ? alertsModel(S.value, M.value, now.value, {}, friendly) : []));
const monthYear = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
function alertText(x) {
  const p = { ...x.p }; if (p.k) p.k = catName(p.k); if (p.n && x.key === "card") p.n = an(p.n); if (p.date && /^\d{4}-/.test(String(p.date)) || p.date instanceof Date) p.date = dstr(p.date);
  const T = (k, q, c) => tk("al." + k + "T", q ?? p, c), X = (k, q) => tk("al." + k + "X", q ?? p);
  switch (x.key) {
    case "overdue": return [T("overdue"), X("overdue")];
    case "due": return [p.d == 0 ? t("al.dueToday", p) : p.d == 1 ? t("al.dueT1", p) : t("al.dueT", p), X("due")];
    case "price": return [tk(p.up ? "al.priceUp" : "al.priceDown", p), `${p.was} → ${p.amt} (${p.pct})`];
    case "jarAsk": return [t("al.jarAskT"), X("jarAsk")];
    case "large": return [tk(p.inc ? "al.largeIn" : "al.largeOut", p), X("large")];
    case "xfer": return [tk("al.xferT" + (p.n == 1 ? "1" : ""), p), X("xfer")];
    case "dup": return [tk("al.dupT" + (p.n == 1 ? "1" : ""), p), X("dup")];
    case "gapBill": return [T("gapBill"), X("gapBill")];
    case "gap": return [tk(p.down ? "al.gapDown" : "al.gapUp", p), t("al.gapX")];
    case "pending": return [tk("al.pendingT" + (p.c == 1 ? "1" : ""), p), t("al.pendingX")];
    case "syncFail": return [t("al.syncFailT", p), p.msg === "Check the login" ? t("al.syncCheck") : p.msg];
    case "syncOld": return [t("al.syncOldT", p), t("al.syncLast", { when: (p.msg.match(/^Last synced (.*) \(over/) || [])[1] || "" })];
    case "uncat": return [tk("al.uncatT" + (p.n == 1 ? "1" : ""), p), t("al.uncatX")];
    case "forecast": return [t("al.fcT", { when: monthYear(p.when) }), t("al.fcX", p)];
    case "docs": return [t("al.docsT", p), X("docs")];
    default: return [T(x.key), X(x.key)];
  }
}
const alerts3 = computed(() => alertList.value.slice(0, 3).map((x) => ({ ...x, title: alertText(x)[0], text: alertText(x)[1] })));
const avail = ref(false);
const openTxId = (id) => openTx(id);
const openAlert = (x) => openAlertFrom(x, x.title);
// an account's own page (accGo), Settings → Connections (goConn)
const accGo = (n) => go("/accounts?n=" + encodeURIComponent(n));
const goConn = () => { openSettingsTab("conn"); go("/settings"); };

// The four totals at the top, each with the old hover text.
const kpis = computed(() => {
  const K = M.value.kpi, pm = M.value.pm, inc = K.inc, ex = K.ex, net = K.net;
  const sub0 = (K.pen > 0 ? t("home.withPension", { amount: fm(K.withPension) }) : K.missing.length ? "" : t("home.worthSub")) + (K.missing.length ? (K.pen > 0 ? " · " : "") + t("home.notRead", { names: K.missing.map(an).join(", ") }) : "");
  const tipWorth = TP(t("home.worth"), [...K.cashAccts.map((a) => [lblOf(a), fm(a.ils)]), "---", [t("tip.total"), fm(K.cash)], ...(K.pen > 0 ? [[t("tip.withPension"), fm(K.withPension)]] : []), ...K.notCounted.map((n) => [an(n), t("tip.notCounted")]), ...K.missing.map((n) => [an(n), t("tip.notRead")])],
    t("tip.worthNote") + (K.pen > 0 ? t("tip.pensionNote") : "") + (K.missing.length ? t("tip.missingNote") : ""));
  return [
    { key: "worth", hero: true, label: t("home.worth"), v: K.cash, sub: sub0, spark: K.nwSpark, col: "var(--onc)", tip: tipWorth },
    { key: "income", label: t("home.income"), v: inc, sub: t("home.vsLast", { amount: fm(K.incLast), month: monthName(pm) }), spark: K.incSpark, col: "var(--pos)", tip: TP(t("tip.income"), [[t("tip.soFarMonth"), fm(inc)], [t("tip.lastMonth"), fm(K.incLast)]], t("tip.incomeNote")) },
    { key: "expense", label: t("home.expenses"), v: ex, sub: t("home.lastMonthAmount", { amount: fm(K.exLast) }), spark: K.exSpark, col: "var(--neg)", tip: TP(t("tip.expenses"), [[t("tip.soFarMonth"), fm(ex)], [t("tip.lastMonth"), fm(K.exLast)]], t("tip.expensesNote")) },
    { key: "net", label: t("home.net"), v: net, sub: t("home.netSub"), spark: null, tip: TP(t("tip.net"), [[t("tip.income"), fm(inc)], [t("tip.expenses"), fm(ex)], "---", [t("tip.net"), fm(net)]], t("tip.netNote")) },
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
  if (!g.multi) return { lines: null, text: an(g.L[0].s || ""), chips: g.manual ? t("home.manual") : "" };
  const L = [...g.L]; if (g.wallet && !L.some((x) => x.cur == "ILS")) L.push({ cur: "ILS", v: 0, none: 1 });
  return { lines: L, chips: L.filter((x) => !x.none || g.wallet).map((x) => cur(x.cur)).join(" + "), stale: L.some((x) => x.cur != "ILS") && (!fx.value.live || fx.value.stale) };
};
const cardRows = computed(() => M.value.cards.map((c) => {
  const d = c.now - c.last, p = c.last ? Math.round(Math.abs(d) / c.last * 100) : 0, nme = an(c.n);
  return { ...c, d, p, nme, tip: TP(tk(c.wise ? "tip.cardPaid" : "tip.cardUpcoming", { n: nme }), [[t("tip.thisMonthSoFar"), fm(c.now)], [t("tip.lastMonthTotal"), fm(c.last)], ...(c.last ? [[t("tip.change"), (d > 0 ? "+" : "−") + fm(Math.abs(d)) + " (" + p + "%)"]] : [])], tk(c.wise ? "tip.wiseNote" : "tip.cardNote")) };
}));

// Money flow.
const FLOWKEY = "moneyFlow";
const flowMode = ref((() => { try { return readPref(FLOWKEY) === "actual" ? "actual" : "left"; } catch { return "left"; } })());
watch(flowMode, (v) => { try { writePref(FLOWKEY, v); } catch { /* not remembered */ } });
const flowOpts = computed(() => [{ value: "left", label: t("home.planned") }, { value: "actual", label: t("home.actual") }]);
const W = computed(() => flowSteps(M.value.flow, flowMode.value));
const colName = (c) => c.kind === "start" ? t("home.beforeSpending") : c.kind === "end" ? (W.value.eOver > 0 ? t("home.short") : W.value.ACT ? t("home.availableNow") : t("home.freeToUse"))
  : c.k === "jars" ? t("home.inNJars", { n: c.n }, c.n) : c.k === "cushion" ? t("home.cushion") : c.k === "other" ? t("home.otherN", { n: c.rest.length }) : c.unplanned ? t("home.unplanned") : catName(c.k);
const cols = computed(() => W.value.cols.map((c) => ({ ...c, name: colName(c) })));
const six = (rows, extra) => [...rows.slice(0, 6), ...(rows.length > 6 ? [[t("tip.more", { n: rows.length - 6 }), ""]] : [])];
const startTip = (step) => TP(t("tip.beforeTitle"), [...M.value.flow.cashAccts.map((a) => [lblOf(a), fm(a.ils)]), [t("tip.spentMonthRow"), fm(W.value.spentAll)], "---", [t("tip.beforeTitle"), fm(W.value.start)]], tk("tip." + (step ? "startStep" : "startBar") + (W.value.ACT ? "Act" : "Plan")));
const endTip = computed(() => {
  const F = M.value.flow, w = W.value;
  if (w.ACT) return TP(w.eOver > 0 ? t("tip.shortTitle") : t("tip.availTitle"), [[t("tip.rowAccounts"), fm(F.cash)], [t("tip.rowAside"), fm(F.saved)], "---", [w.eOver > 0 ? t("tip.shortBy") : t("tip.availTitle"), fm(w.eOver > 0 ? w.eOver : w.eFree)]], t("tip.availNote1") + "\n" + t("tip.availNote2"));
  return TP(F.over > 0 ? t("tip.shortTitle") : t("tip.freeTitle"), [[t("tip.rowAccounts"), fm(F.cash)], [t("tip.rowAside"), fm(F.saved)], [t("tip.rowStill"), fm(w.leftTot)], "---", [F.over > 0 ? t("tip.shortBy") : t("tip.freeTitle"), fm(F.over > 0 ? F.over : F.free)]], F.over > 0 ? "!" + t("tip.shortNote") : t("tip.freeNote1") + "\n" + t("tip.freeNote2"));
});
const colTip = (c) => {
  const F = M.value.flow;
  if (c.kind === "start") return startTip(false);
  if (c.kind === "end") return endTip.value;
  if (c.k === "jars") return TP(t("tip.jarsTitle"), [...six(F.jarsHeld.map((j) => [j.n, fm(j.v)])), "---", [t("tip.total"), fm(F.inJars)]], t("tip.jarsNote"));
  if (c.k === "cushion") return TP(t("tip.keptTitle"), [[t("tip.cushionRow"), fm(F.buffer)]], t("tip.cushionNote"));
  if (c.k === "other") return TP(t("tip.otherTitle"), c.rest.map((x) => [colName(x), fm(x.a)]), t("tip.otherNote"));
  if (c.unplanned) return TP(colName(c), [...six((c.cats || []).map((e) => [catName(e[0]), fm(e[1])])), "---", [t("tip.spentRow"), fm(c.spent)]], t("tip.unplannedNote"));
  const bud = c.rk === "budget", bill = c.rk === "bill"; // the column's own kind (kind is its place in the chart)
  const note = [...(c.over || (bud && c.base > 0 && c.spent > c.base) ? ["!" + t("tip.overBy", { amt: fm(Math.round(c.spent - c.base)) })] : []), tk(bud ? "tip.noteBudget" : bill ? "tip.noteBill" : "tip.noteUsual")]
    .concat(c.bcov > 0 || c.jarCov > 0 ? [t("tip.jarNoRecount")] : [], (c.bills || []).length ? [t("tip.includesBills", { list: c.bills.map((b) => b.n).join(", ") })] : []).join("\n");
  return TP(catName(c.k), [[tk(bud ? "tip.budgetRow" : bill ? "tip.billsRow" : "tip.usualRow"), fm(Math.round(c.base))], [t("tip.spentRow"), fm(c.spent)], ...(c.bcov > 0 ? [[t("tip.jarPaysBills"), fm(c.bcov)]] : []), ...(c.jarCov > 0 ? [[t("tip.paidByJar", { j: c.jar }), fm(c.jarCov)]] : []), "---", [tk(bud ? "tip.leftBudget" : bill ? "tip.leftPay" : "tip.leftUsual"), fm(c.left)]], note);
};
const asideTip = computed(() => { const F = M.value.flow; return TP(t("tip.asideTitle"), [[t("tip.jarsTitle"), fm(F.inJars)], [t("home.cushion"), fm(F.buffer)], "---", [t("tip.total"), fm(F.saved)]], t("tip.asideNote")); });
const tileTip = computed(() => {
  const w = W.value, src = [...w.src];
  return w.ACT ? TP(t("home.spentMonth"), [...src.filter((r) => r.spent >= 1).sort((x, y) => y.spent - x.spent).slice(0, 6).map((r) => [catName(r.k), fm(r.spent)]), "---", [t("tip.total"), fm(w.spentAll)]], t("tip.spentTileNote"))
    : TP(t("home.budgetsBills"), [...src.sort((x, y) => y.spent + y.left - (x.spent + x.left)).slice(0, 6).map((r) => [catName(r.k), fm(r.spent + r.left)]), "---", [t("tip.total"), fm(w.spentAll + w.leftTot)]], t("tip.plannedTileNote"));
});
const leftOf = (c) => (c.kind === "end" ? (W.value.eOver > 0 ? "−" + fm(W.value.eOver) : fm(W.value.eFree)) : fm(c.lo));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Spending by category (ring chart).
const donut = computed(() => {
  const data0 = M.value.spend, tot = data0.reduce((s, x) => s + x[1], 0) || 1, R = 84, r = 58, gap = 0.03; let a = -Math.PI / 2;
  const p = (x, y) => [100 + x * Math.cos(y), 100 + x * Math.sin(y)];
  return { tot, parts: data0.map(([n, v]) => { const b = a + (v / tot) * 2 * Math.PI, l = b - a - gap > Math.PI ? 1 : 0, a2 = a + gap / 2, b2 = b - gap / 2;
    const [x1, y1] = p(R, a2), [x2, y2] = p(R, b2), [x3, y3] = p(r, b2), [x4, y4] = p(r, a2); a = b;
    const pc = Math.round((v / tot) * 100);
    return { n, v, pc, color: catColor(n), tip: `${catName(n)}: ₪${n0(v)} (${pc}%)`, d: `M${x1} ${y1}A${R} ${R} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${l} 0 ${x4} ${y4}Z` }; }) };
});
const hover = ref(null);

// Exchange rates (shown only when there are rates, like the old page).
const fxCur = ref("USD");
const fxKeys = computed(() => Object.keys(fx.value.series).filter((k) => (fx.value.series[k] || []).length > 1));
watch(fxKeys, (ks) => { if (ks.length && !ks.includes(fxCur.value)) fxCur.value = ks[0]; }, { immediate: true });
const fxView = computed(() => {
  const ser = fx.value.series[fxCur.value] || []; if (ser.length < 2) return null;
  const v = ser.map((x) => x[1]), last = v[v.length - 1], ch = (last / v[0] - 1) * 100, mn = Math.min(...v), mx = Math.max(...v), av = v.reduce((a, b) => a + b) / v.length;
  const Wd = 460, H = 170, P = 40, sp = mx - mn || Math.max(mn * 0.01, 0.01), lo = mn - sp * 0.2, hi = mx + sp * 0.2, x = (i) => P + (i * (Wd - P - 12)) / (v.length - 1), y = (q) => H - 22 - ((q - lo) / (hi - lo)) * (H - 36);
  const grid = [0, 1, 2, 3].map((k) => { const q = lo + ((hi - lo) * k) / 3; return { y: y(q), label: q.toFixed(2) }; });
  const pts = v.map((q, i) => x(i) + "," + y(q)).join(" ");
  return { Wd, H, P, grid, pts, ser, xs: ser.map((_, i) => x(i)), ys: ser.map((s) => y(s[1])), y0: 12, y1: H - 22, area: `${x(0)},${H - 22} ${pts} ${x(v.length - 1)},${H - 22}`, lastX: x(v.length - 1), lastY: y(last), first: ser[0][0].slice(5), end: ser[ser.length - 1][0].slice(5), last, ch, mn, mx, av, pos: mx > mn ? Math.min(100, Math.max(0, ((last - mn) / (mx - mn)) * 100)) : 50 };
});
const fxOpts = computed(() => fxKeys.value.map((k) => ({ value: k, label: pair(k) })));
// Hover over the chart: a dashed line, a dot and the day's rate (hoverInit in the old app).
const hv = ref(null), fxSvg = ref(null), fxWrap = ref(null);
function hvShow(e) {
  const F = fxView.value, svg = fxSvg.value; if (!F || !svg) return;
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const k = F.Wd / r.width, vx = (e.clientX - r.left) * k; let i = 0, best = 1e9;
  F.xs.forEach((x, j) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = j; } });
  hv.value = { i, x: F.xs[i], y: F.ys[i], px: F.xs[i] / k, py: F.ys[i] / k };
}
const hvStyle = computed(() => {
  if (!hv.value) return { display: "none" };
  const w = fxWrap.value?.querySelector(".trtip")?.offsetWidth || 120, h = fxWrap.value?.querySelector(".trtip")?.offsetHeight || 44, W0 = fxSvg.value?.getBoundingClientRect().width || 0;
  return { direction: "ltr", insetInlineStart: Math.max(0, Math.min(W0 - w, hv.value.px - w / 2)) + "px", top: Math.max(0, hv.value.py - h - 12) + "px" };
});

const H2 = { recent: "activity", budg: "budgets", bills: "bills", jars: "jars", donut: "reports", accts: "accounts", fx: "settings" };
// "+₪1,250", "≈ −₪80" for an expected bill, "balance +₪500" for a balance update (amtT)
const openBill = (b) => { const bl = M.value.billsAll[b.idx]; const last = bl && M.value.rows.filter((x) => x.a < 0 && (bl.mode == "once" ? (bl.ids || []).includes(x.id) : (x.desc + " " + x.to).toLowerCase().includes(bl.match))).sort((p, q) => p.d.localeCompare(q.d)).pop(); if (last) openTxId(last.id); else if (bl) openPop("hist", { title: bl.n, rows: [], sub: t("txw.chip.bill"), q: bl.match }); };
</script>

<template>
  <PageHeader :title="t('nav.home')" />
  <section id="dash" class="view on">

    <p v-if="data.error.value && !S" class="muted">{{ t("home.loadError") }}</p>
    <p v-else-if="!S" class="muted">{{ t("home.loading") }}</p>

    <template v-else>
      <div id="attn">
        <div v-if="alerts3.length" class="card warn" style="margin-bottom:16px;padding:6px 18px">
          <div v-for="x in alerts3" :key="x.id" class="al" style="padding:10px 0"><span class="sev" :class="x.sev" /><div style="flex:1;min-width:0"><b style="font-size:14px">{{ x.title }}</b><div class="sm">{{ x.text }}</div></div><button type="button" class="btn o s" @click="openAlert(x)">{{ t("home.alertOpen") }}</button></div>
          <div style="padding:8px 0"><a class="sm" style="cursor:pointer;color:var(--acc);font-weight:600" :href="link('alerts')" @click="onLink">{{ t("home.allAlerts", { n: alertList.length }) }}</a></div>
        </div>
      </div>

      <div v-if="!M.any" id="homeEmpty" class="card">
        <b>{{ t("home.emptyTitle") }}</b>
        <div class="sm" style="margin:6px 0 12px">{{ t("home.emptyText") }}</div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn s" @click="goConn">{{ t("home.connect") }}</button><button type="button" class="btn o s" @click="openForm('tx')">{{ t("home.addTx") }}</button></div>
      </div>

      <template v-else>
        <div id="kpis" class="grid g4">
          <div v-for="c in kpis" :key="c.key" class="card" :class="{ hero: c.hero }" v-tip="c.tip">
            <div class="lbl"><span class="gi" v-html="glyphIcon(c.key, { worth: 'var(--acc)', income: 'var(--pos)', expense: 'var(--neg)', net: 'var(--acc)' }[c.key])" /><span>{{ titleCase(c.label) }}</span></div>
            <div class="val"><small>₪</small>{{ c.key === "net" && c.v < 0 ? "−" : "" }}{{ n0(c.v) }}</div>
            <div class="sm">{{ c.sub }}</div>
            <svg v-if="c.spark" class="spark" viewBox="0 0 200 46" preserveAspectRatio="none">
              <defs><linearGradient :id="'sg' + c.key" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.col" stop-opacity="0" /></linearGradient></defs>
              <polygon :points="sparkPath(c.spark).area" :fill="'url(#sg' + c.key + ')'" /><polyline :points="sparkPath(c.spark).line" fill="none" :stroke="c.col" stroke-width="2" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>

        <div v-if="M.has.accts" id="sec-accts">
          <h2>{{ t("home.accounts") }}<a class="sm hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div id="accts" class="grid g3">
            <div v-for="g in M.groups" :key="g.n" class="card click" :style="g.manual ? 'opacity:.85' : ''" role="button" tabindex="0" @click="accGo(g.n)">
              <div class="lbl"><span class="gi" v-html="brandIcon(g.n, g.L[0].src, g.L[0].kind, g.L[0].ck)" /><span>{{ an(g.n) }}</span><span v-if="accSub(g).chips" class="chip" style="margin-inline-start:auto;padding:1px 9px">{{ accSub(g).chips }}</span></div>
              <div class="val"><small>₪</small>{{ n0(g.total) }}</div>
              <div class="sm">
                <template v-if="accSub(g).lines">
                  <div v-for="x in accSub(g).lines" :key="x.cur" class="flex" style="justify-content:space-between;gap:8px;margin-top:3px"><span><template v-if="x.none">ILS · <i>{{ t("home.noShekel") }}</i></template><template v-else>{{ x.cur }} · {{ money2(x) }}<span v-if="x.cur != 'ILS'" style="opacity:.65"> × {{ (fx.fx[x.cur] || 1).toFixed(4) }}</span></template></span><b class="num" style="color:var(--tx)">₪{{ n0(x.none ? 0 : x.v * M.rate(x.cur)) }}</b></div>
                  <div v-if="accSub(g).stale" style="margin-top:4px;opacity:.7">{{ fx.live ? t("home.fxStale") : t("home.fxNone") }}</div>
                </template>
                <template v-else>{{ accSub(g).text }}</template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="M.has.cards" id="sec-cards">
          <h2>{{ t("home.cards") }}<a class="sm hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div id="cards" class="grid g3">
            <div v-for="c in cardRows" :key="c.n" class="card click" v-tip="c.tip" role="button" tabindex="0" @click="accGo(c.wise ? 'Wise' : c.n)">
              <div class="lbl"><span class="gi" v-html="brandIcon(c.n, c.acc?.src, c.acc?.kind || 'card', c.acc?.ck)" /><span><template v-if="c.wise">{{ titleCase(c.nme) }} · {{ titleCase(t("home.paidNow")) }}</template><template v-else><span v-html="accLbl(c.n)" /> · {{ titleCase(t("home.upcomingCharge")) }}</template></span></div>
              <div class="val"><small>₪</small>{{ n0(c.now) }}</div>
              <div class="sm">{{ t("home.lastMonthAmount", { amount: "₪" + n0(c.last) }) }} <span v-if="c.last" class="bd" :class="c.d > 0 ? 'up' : 'dn'">{{ c.d > 0 ? "▲" : "▼" }} {{ c.p }}%</span></div>
              <div class="bar"><i :style="{ width: Math.min(100, c.now / Math.max(c.now, c.last, 1) * 100) + '%', background: c.d > 0 ? 'var(--neg)' : 'var(--pos)' }" /></div>
            </div>
          </div>
        </div>

        <div v-if="M.has.flow" id="sec-flow">
          <h2><span id="flowTitle">{{ flowMode === "actual" ? t("home.flowSoFar") : t("home.flowAhead") }}</span><span class="h2r"><BaseTabs id="flowSeg" v-model="flowMode" :options="flowOpts" :label="t('home.flowMode')" /><a class="sm hl" href="#" @click.prevent="avail = true">{{ t("home.fullBreakdown") }}</a></span></h2>
          <div id="flowHome" class="card flow">
            <div class="fs"><div class="fsr">
              <div class="fst" v-tip="startTip(true)"><span>{{ t("home.beforeSpending") }}</span><b class="num">{{ fm(W.start) }}</b><small><span>{{ t("home.inAccounts") }}</span> {{ fm(M.flow.cash) }}<br><span>{{ t("home.spentSoFar") }}</span> {{ fm(W.spentAll) }}</small></div>
              <i>−</i>
              <div class="fst" v-tip="asideTip"><span>{{ t("home.putAside") }}</span><b class="num">{{ fm(M.flow.saved) }}</b><small><span>{{ t("home.inJars") }}</span> {{ fm(M.flow.inJars) }}<br><span>{{ t("home.cushion") }}</span> {{ fm(M.flow.buffer) }}</small></div>
              <i>−</i>
              <div v-if="W.ACT" class="fst" v-tip="tileTip"><span>{{ t("home.spentMonth") }}</span><b class="num">{{ fm(W.spentAll) }}</b><small>{{ cap(t("home.whatYouSpent")) }}</small></div>
              <div v-else class="fst" v-tip="tileTip"><span>{{ t("home.budgetsBills") }}</span><b class="num">{{ fm(W.spentAll + W.leftTot) }}</b><small><span>{{ t("home.spentSoFar") }}</span> {{ fm(W.spentAll) }}<br><span>{{ t("home.stillToCome") }}</span> {{ fm(W.leftTot) }}</small></div>
              <i>=</i>
              <div class="fst key end" :class="{ neg: W.eOver > 0 }" v-tip="endTip"><span>{{ W.eOver > 0 ? t("home.shortBy") : W.ACT ? t("home.availableNow") : t("home.freeToUse") }}</span><b class="num" :class="{ neg: W.eOver > 0 }">{{ W.eOver > 0 ? "−₪" + n0(W.eOver) : fm(W.eFree) }}</b><small>{{ cap(W.ACT ? t("home.notPutAside") : W.eOver > 0 ? t("home.morePlanned") : t("home.afterPlanned")) }}</small></div>
            </div></div>
            <div class="wf2" :style="{ '--n': cols.length }">
              <div class="wrl w1" style="grid-row:1">{{ W.ACT ? t("home.spentSoFar") : t("home.budgetOrUsual") }}</div>
              <div class="wrl wnb" style="grid-row:3">{{ t("home.whatsLeft") }}</div>
              <div v-for="(c, i) in cols" :key="i" class="wc" :class="c.kind === 'end' ? 'end ' + c.tone : c.kind === 'item' ? '' : c.kind" :style="{ '--c': i + 2 }" v-tip="colTip(c)">
                <div class="wca num" :data-l="W.ACT ? t('home.spentSoFar') : t('home.budgetOrUsual')"><span v-if="c.kind === 'end'" class="dim">–</span><template v-else><small>₪</small>{{ n0(c.a) }}</template></div>
                <div class="wcp"><i class="wcg" :style="{ '--b': c.b, '--h': c.h }" /><i class="wcs" :class="[c.kind === 'end' ? 'end ' + c.tone : c.kind === 'item' ? '' : c.kind, c.kind === 'start' || c.kind === 'end' ? '' : 'jn']" :style="{ '--h': c.s }" /></div>
                <div class="wct" :data-l="t('home.whatsLeft')"><span v-if="c.kind === 'end' && W.eOver > 0" class="neg">−{{ fm(W.eOver) }}</span><template v-else>{{ leftOf(c) }}</template></div>
                <div class="wcn"><b>{{ c.name }}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="M.has.bills || M.has.budg || M.has.jars || M.has.fx || M.has.donut || M.has.recent" id="row-bb" class="grid g2">
          <div v-if="M.has.donut" id="sec-donut">
            <h2 style="margin-top:0"><span>{{ t("home.byCategory") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="sm hl" :href="link(H2.donut)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div class="card"><div id="donutHome" class="flex dnt" :class="{ hv: hover }">
              <svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%">
                <path v-for="p in donut.parts" :key="p.n" :d="p.d" :fill="p.color" :class="{ on: hover === p.n }" style="cursor:pointer" v-tip="p.tip" @mouseenter="hover = p.n" @mouseleave="hover = null" @click="goActivity({ cat: p.n })" />
                <text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ n0(donut.tot) }}</text>
                <text x="100" y="117" text-anchor="middle">{{ t("home.spentThisMonth") }}</text>
              </svg>
              <div class="legend">
                <div v-for="p in donut.parts" :key="p.n" :class="{ on: hover === p.n }" data-k="" @mouseenter="hover = p.n" @mouseleave="hover = null"><span class="dot" :style="{ background: p.color }" /><span class="catl" @click="goActivity({ cat: p.n })">{{ catName(p.n) }}</span><b>₪{{ n0(p.v) }}</b></div>
              </div>
            </div></div>
          </div>

          <div v-if="M.has.budg" id="sec-budg">
            <h2 style="margin-top:0"><span>{{ t("home.budgets") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="sm hl" :href="link(H2.budg)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="budHome" class="card">
              <div v-for="b in M.budgets.slice(0, 8)" :key="b.k" style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;font-size:14px"><b><span class="catl" @click="goActivity({ cat: b.k })">{{ catName(b.k) }}</span></b><span class="sm num">{{ fm(b.s) }} / {{ fm(b.lim) }}</span></div>
                <div class="bar" style="margin:8px 0 2px"><i :style="{ width: Math.min(100, b.pc) + '%', background: b.st == 'over' ? 'var(--neg)' : b.st == 'warn' ? '#e68a00' : '' }" /><u :style="{ insetInlineStart: (M.DAYN / M.DIM) * 100 + '%' }" /></div>
              </div>
              <div v-if="M.budgets.length > 8" class="sm" style="padding-top:4px"><a style="cursor:pointer;color:var(--acc)" :href="link('budgets')" @click="onLink">{{ t("home.moreBudgets", { n: M.budgets.length - 8 }) }}</a></div>
            </div>
          </div>

          <div v-if="M.has.bills" id="sec-bills">
            <h2 style="margin-top:0">{{ t("home.upcomingBills") }}<a class="sm hl" :href="link(H2.bills)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="billHome" class="card">
              <div v-for="b in M.upcoming" :key="b.idx" class="row" style="cursor:pointer" @click="openBill(b)">
                <div class="grow"><b style="font-size:14px">{{ an(b.n) }}</b><div class="sm">{{ b.status == "overdue" ? t("home.overdueSince", { date: dstr(b.pd) }) : t("home.dueIn", { date: dstr(b.nx), n: b.days }) }}</div></div>
                <b class="num">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b>
              </div>
            </div>
          </div>

          <div v-if="M.has.recent" id="sec-recent">
            <h2 style="margin-top:0">{{ t("home.recent") }}<a class="sm hl" :href="link(H2.recent)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="recent" class="card" style="padding:8px 12px">
              <div v-for="x in M.recent" :key="x.id" class="txi" @click="openTxId(x.id)">
                <span class="av" :style="{ background: 'color-mix(in srgb,' + catColor(x.c || 'Uncategorized') + ' 22%,transparent)', color: catColor(x.c || 'Uncategorized') }">{{ (nm(x) || "?")[0] }}</span>
                <div style="flex:1;min-width:0"><div class="mer" style="font-size:14px">{{ nm(x) }}</div><div class="sm">{{ catName(x.c) }} · {{ dcell(x.d) }}</div></div>
                <b class="num" :class="{ pos: x.a > 0 }">{{ amtText(x) }}</b>
              </div>
            </div>
          </div>

          <div v-if="M.has.jars" id="sec-jars">
            <h2 style="margin-top:0">{{ t("home.jars") }}<a class="sm hl" :href="link(H2.jars)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="jarHome" class="card">
              <div v-for="j in M.jars" :key="j.id" style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;font-size:14px"><b>{{ an(j.n) }}</b><span class="num" :class="{ pos: j.got }">{{ j.got ? t("home.gotThisMonth", { amount: "+₪" + n0(j.got) }) : j.want > 0 ? t("home.waiting") : "" }}</span></div>
                <div v-if="!j.open" class="bar" style="margin:8px 0 5px"><i :style="{ width: j.pc + '%', background: 'var(--c' + ((j.p - 1) % 7) + ')' }" /></div>
                <div class="sm num" :style="j.open ? 'margin-top:4px' : ''">{{ j.open ? t("home.savedNoGoal", { amount: "₪" + n0(j.bal) }) : t("home.ofGoal", { amount: "₪" + n0(j.bal), goal: "₪" + n0(j.need), pc: j.pc }) }}</div>
              </div>
              <div style="border-top:1px solid var(--ol);padding-top:14px;display:flex;justify-content:space-between;align-items:center"><span class="sm">{{ t("home.safeToJars") }}</span><b class="num" style="font-size:18px">₪{{ n0(M.flow.free) }}</b></div>
            </div>
          </div>

          <div v-if="fxKeys.length" id="sec-fx">
            <h2 style="margin-top:0">{{ t("home.fx") }}<a class="sm hl" :href="link(H2.fx)" @click="onLink">{{ t("home.currencies") }}</a></h2>
            <div id="fxc" class="card">
              <template v-if="fxView">
                <div class="fxh"><BaseTabs v-if="fxKeys.length > 1" v-model="fxCur" :options="fxOpts" :label="t('home.fx')" /><span v-else class="fxpair">{{ pair(fxCur) }}</span><span class="bd" :class="Math.abs(fxView.ch) < .005 ? '' : fxView.ch > 0 ? 'dn' : 'up'">{{ Math.abs(fxView.ch) < .005 ? "▬" : fxView.ch > 0 ? "▲" : "▼" }} {{ Math.abs(fxView.ch).toFixed(2) }}% · {{ t("home.days30") }}</span></div>
                <div class="fxr"><span class="fxl">{{ currencySymbol(fxCur) }}1</span><span class="fxe">=</span><b class="num">₪{{ fxView.last.toFixed(4) }}</b></div>
                <div ref="fxWrap" class="trw tight">
                  <svg ref="fxSvg" width="100%" :viewBox="`0 0 ${fxView.Wd} ${fxView.H}`" style="margin-top:6px" @pointermove="hvShow" @pointerdown="hvShow" @pointerleave="hv = null">
                    <g v-for="(g, i) in fxView.grid" :key="i"><line class="gl" :x1="fxView.P" :x2="fxView.Wd - 12" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="fxView.P - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></g>
                    <defs><linearGradient id="fxg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35" /><stop offset="1" stop-color="var(--acc)" stop-opacity="0" /></linearGradient></defs>
                    <polygon fill="url(#fxg)" :points="fxView.area" /><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" :points="fxView.pts" />
                    <template v-if="hv"><line :x1="hv.x" :x2="hv.x" :y1="fxView.y0" :y2="fxView.y1" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" style="pointer-events:none" /><circle :cx="hv.x" :cy="hv.y" r="5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2" style="pointer-events:none" /></template>
                    <circle :cx="fxView.lastX" :cy="fxView.lastY" r="5" fill="var(--bg)" stroke="var(--acc)" stroke-width="2.5" />
                    <text :x="fxView.P" :y="fxView.H - 5">{{ fxView.first }}</text><text :x="fxView.Wd - 12" :y="fxView.H - 5" text-anchor="end">{{ fxView.end }}</text>
                  </svg>
                  <div v-if="hv" class="trtip" :style="hvStyle"><b>{{ fxView.ser[hv.i][0] }}</b><span>{{ currencySymbol(fxCur) }}1 = ₪{{ fxView.ser[hv.i][1].toFixed(4) }}</span></div>
                </div>
                <div class="fxs">
                  <div class="fxt"><span>{{ t("home.low") }}</span><b class="num">{{ fxView.mn.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.average") }}</span><b class="num">{{ fxView.av.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.high") }}</span><b class="num">{{ fxView.mx.toFixed(3) }}</b></div>
                  <div class="fxt fxnow"><span>{{ t("home.vsRange") }}</span><b class="num">{{ fxView.last.toFixed(3) }}</b><div class="fxbar"><i :style="{ insetInlineStart: fxView.pos.toFixed(1) + '%' }" /></div></div>
                </div>
                <div class="fxf"><span>{{ fx.stale ? t("home.fxStaleAt", { date: fx.asOf }) : t("home.fxSource", { date: fx.asOf }) }}</span><span>{{ t("home.fxUse") }}</span></div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </template>
    <AvailWhy v-if="S" v-model:open="avail" :M="M" />
  </section>
</template>

<style scoped>
.gi { display: contents; }
.hl, .card a, a.sm { text-decoration: none; }
</style>
