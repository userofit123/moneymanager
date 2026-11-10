// What Home knows and does, without the screen: the alerts, the four totals, accounts, cards, the money flow and its
// explanations, spending by category, upcoming bills and exchange rates. Used by the computer's Home page (views/Home.vue)
// and the phone's Home screen (phone/screens/HomeScreen.vue), so both show the same numbers.
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { openAlert as openAlertFrom } from "../core/shell.js";
import { openSettingsTab } from "../views/settings/tab.js";
import { home, fcSaved, keyNums, forecast } from "../core/derived.js";
import { paydayWords } from "./payday.js";
import { now } from "../core/clock.js";
import { readPref, writePref } from "../core/prefs.js";
import { go } from "../router.js";
import { formatMoney, currencySymbol } from "../format.js";
import { flowSteps } from "../lib/home.js";
import { isBillPayment } from "../lib/bills.js";
import { numText } from "../lib/keyNumbers.js";
import { spentEachMonth, moneyLasts } from "../lib/moneyLasts.js";
import { alertsModel } from "../lib/alerts.js";
import { alertTexts } from "../lib/alerttext.js";
import { makeFriendly } from "../core/alertReport.js";
import { openTx, openPop } from "../core/txwin.js";
import { TP } from "../core/tooltip.js";
import { dstr, titleCase } from "../dates.js";
import { categoryName } from "../catnames.js";
import { tx } from "../core/heText.js";

export function useHome() {
  const { t, locale } = useI18n();
  const tk = (key, ...a) => t(key, ...a);
  const fm = (v) => formatMoney(Math.round(v));
  const n0 = (v) => Math.round(Math.abs(v)).toLocaleString("en-IL");
  const an = (n) => categoryName(n, locale.value); // a bank, card or wallet name
  const subOf = (s) => String(s).split(" · ").map(tx).join(" · "); // an account's subtitle from the server ("Cash · entered by you"), like Accounts
  const cur = (c) => (locale.value === "he" ? { USD: "דולר", ILS: "שקל" }[c] || c : c);
  const pair = (c) => (locale.value === "he" && c === "USD" ? "דולר ← שקל" : c + " → ILS");
  const lblOf = (a) => (a.lbl || a.n).replace(a.n, an(a.n));

  const fx = data.fx; // exchange rates, loaded with the data

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

  // Alerts: the first three. Their sentences come from the language files.
  const friendly = makeFriendly(t);
  const alertList = computed(() => (S.value && M.value ? alertsModel(S.value, M.value, now.value, fcSaved.value, friendly) : []));
  const monthYear = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
  const alertText = (x) => alertTexts(x, { t, catName, an, dstr, monthYear });
  const alerts3 = computed(() => alertList.value.slice(0, 3).map((x) => ({ ...x, title: alertText(x)[0], text: alertText(x)[1] })));
  const openTxId = (id) => openTx(id);
  const openAlert = (x) => openAlertFrom(x, x.title);
  // an account's own page (accGo), Settings → Connections (goConn)
  const accGo = (n) => go("/accounts?n=" + encodeURIComponent(n));
  const goConn = () => { openSettingsTab("conn"); go("/settings"); };

  // Under "In your accounts": how long that money would last at your usual spending (lib/moneyLasts.js), with how it is
  // worked out. Hidden with no money in the accounts or no full month of spending yet.
  const lasts = computed(() => {
    const cash = Math.round(M.value?.kpi?.cash || 0), sp = spentEachMonth(forecast.value?.FH, fcSaved.value?.n || 3), L = moneyLasts(cash, sp.avg);
    if (!L) return null;
    const n = sp.months.length, text = L.less ? t("home.lastsLess") : L.months ? t("home.lastsMonths", { n: L.months }, L.months) : t("home.lastsYears", { n: L.years });
    const tip = TP(t("home.lastsTitle"), [[t("num.inAccounts"), fm(cash)], [t("home.lastsSpend"), fm(sp.avg)]], [t("home.lastsHow"), t("home.lastsWhat", { n }, n), t("home.lastsLeft"), t("home.lastsMeans")].join("\n"));
    return { text, tip };
  });

  // The four totals at the top, each with its hover text.
  const kpis = computed(() => {
    const K = M.value.kpi, pm = M.value.pm, inc = K.inc, ex = K.ex, net = K.net;
    const sub0 = (K.pen > 0 ? t("home.withPension", { amount: fm(K.withPension) }) : K.missing.length ? "" : t("home.worthSub")) + (K.missing.length ? (K.pen > 0 ? " · " : "") + t("home.notRead", { names: K.missing.map(an).join(", ") }) : "");
    const tipWorth = TP(t("num.inAccounts"), [...K.cashAccts.map((a) => [lblOf(a), fm(a.ils)]), "---", [t("tip.total"), fm(K.cash)], ...(K.pen > 0 ? [[t("tip.withPension"), fm(K.withPension)]] : []), ...K.notCounted.map((n) => [an(n), t("tip.notCounted")]), ...(K.noRate || []).map((n) => [an(n), t("tip.noRate")]), ...K.missing.map((n) => [an(n), t("tip.notRead")])],
      t("tip.worthNote") + (K.pen > 0 ? t("tip.pensionNote") : "") + (K.missing.length ? t("tip.missingNote") : ""));
    return [
      { key: "worth", hero: true, label: t("num.inAccounts"), v: K.cash, sub: sub0, lasts: lasts.value, spark: K.nwSpark, col: "var(--onc)", tip: tipWorth },
      { key: "income", label: t(numText("moneyIn").short), v: inc, sub: t("home.vsLast", { amount: fm(K.incLast), month: monthName(pm) }), spark: K.incSpark, col: "var(--pos)", tip: TP(t(numText("moneyIn").name), [[t("tip.soFarMonth"), fm(inc)], ...(K.sal >= 1 ? [[t("tip.salaryPart"), fm(K.sal)]] : []), [t("tip.lastMonth"), fm(K.incLast)], ...(K.back >= 1 ? ["---", [t("tip.moneyBack"), fm(K.back)]] : [])], t("tip.incomeNote")) },
      { key: "expense", label: t(numText("moneyOut").short), v: ex, sub: t("home.lastMonthAmount", { amount: fm(K.exLast) }), spark: K.exSpark, col: "var(--neg)", tip: TP(t(numText("moneyOut").name), [[t("tip.soFarMonth"), fm(ex)], [t("tip.lastMonth"), fm(K.exLast)]], t("tip.expensesNote")) },
      { key: "net", label: t("num.saved"), v: net, sub: t("home.netSub"), spark: null, tip: TP(t("tip.netTitle"), [[t(numText("moneyIn").name), fm(inc)], [t(numText("moneyOut").name), fm(ex)], "---", [t("num.savedS"), fm(net)]], t("tip.netNote")) },
    ];
  });

  // Accounts: one card per bank or wallet, listing each currency when there is more than one.
  const money2 = (x) => currencySymbol(x.cur) + Number(x.v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const accSub = (g) => {
    if (!g.multi) return { lines: null, text: subOf(g.L[0].s || ""), chips: g.manual ? t("home.manual") : "" };
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
  const flowOpts = computed(() => [{ value: "actual", label: t("home.actual") }, { value: "left", label: t("home.planned") }]);
  const W = computed(() => flowSteps(M.value.flow, flowMode.value));
  // Free to use below zero before payday (lib/payday.js), in the Planned view: what it will likely be after payday, and
  // calm (not "Short", not red) when the income still to come this month covers it
  const pay = computed(() => (W.value.ACT || !(W.value.eOver > 0) ? null : paydayWords(t, keyNums.value?.payday, locale.value === "he")));
  const calm = computed(() => !!pay.value?.covered);
  const colName = (c) => c.kind === "start" ? t("num.inAccounts") : c.kind === "end" ? (W.value.eOver > 0 && !calm.value ? t("home.short") : W.value.ACT ? t("num.afterKnown") : t("num.free"))
    : c.k === "cards" ? t("num.cardsUnpaid") : c.k === "up" ? t("num.upcoming") : c.k === "jars" ? t("home.inNJars", { n: c.n }, c.n) : c.k === "cushion" ? t("home.cushion") : c.k === "other" ? t("home.otherN", { n: c.rest.length }) : catName(c.k);
  const cols = computed(() => W.value.cols.map((c) => ({ ...c, name: colName(c), ...(c.kind === "end" && calm.value ? { tone: "none" } : {}) })));
  const six = (rows, extra) => [...rows.slice(0, 6), ...(rows.length > 6 ? [[t("tip.more", { n: rows.length - 6 }), ""]] : [])];
  const startTip = (step) => TP(t("num.inAccounts"), [...M.value.flow.cashAccts.map((a) => [lblOf(a), fm(a.ils)]), "---", [t("tip.total"), fm(W.value.start)]], tk("tip." + (step ? "startStep" : "startBar") + (W.value.ACT ? "Act" : "Plan")));
  const cardsTip = computed(() => { const F = M.value.flow; return TP(t("num.cardsUnpaid"), [[t("num.inAccounts"), fm(F.cash)], [t("num.cardsUnpaid"), "−" + fm(F.cards)], "---", [W.value.upTot >= 1 ? t("home.whatsLeft") : t("num.afterKnown"), fm(F.cash - F.cards)]], t("tip.cardsOwedNote")); });
  const upTip = computed(() => { const w = W.value; return TP(t("num.upcoming"), [...six([...M.value.flow.up].sort((a, b) => b.amt - a.amt).map((b) => [b.n, fm(b.amt)])), "---", [t("tip.total"), fm(w.upTot)]], t("tip.upNote")); });
  const endTip = computed(() => {
    const F = M.value.flow, w = W.value;
    if (w.ACT) return TP(w.eOver > 0 ? t("tip.shortTitle") : t("num.afterKnown"), [[t("num.inAccounts"), fm(F.cash)], ...(F.cards >= 1 ? [[t("num.cardsUnpaid"), fm(F.cards)]] : []), ...(w.upTot >= 1 ? [[t("num.upcoming"), fm(w.upTot)]] : []), "---", [w.eOver > 0 ? t("tip.shortBy") : t("num.afterKnown"), fm(w.eOver > 0 ? w.eOver : w.eFree)]], t("tip.availNote1") + "\n" + t("tip.availNote2"));
    const P = pay.value, short = w.eOver > 0 && !calm.value;
    return TP(short ? t("tip.shortTitle") : t("num.free"), [[t("num.inAccounts"), fm(F.cash)], ...(F.cards >= 1 ? [[t("num.cardsUnpaid"), fm(F.cards)]] : []), ...(w.upTot >= 1 ? [[t("num.upcoming"), fm(w.upTot)]] : []), [t("num.leftBudgets"), fm(w.leftTot)], [t("num.putAside"), fm(w.jarsA + F.buffer)], "---", [short ? t("tip.shortBy") : t("num.free"), short ? fm(w.eOver) : calm.value ? fm(-w.eOver) : fm(w.eFree)], ...(P ? [[t("num.afterPay"), fm(keyNums.value.payday.after)]] : [])],
      P ? (short ? "!" + t("tip.shortNote") + "\n" : "") + P.note : w.eOver > 0 ? "!" + t("tip.shortNote") : t("tip.freeNote1") + "\n" + t("tip.freeNote2"));
  });
  const colTip = (c) => {
    const F = M.value.flow;
    if (c.kind === "start") return startTip(false);
    if (c.kind === "end") return endTip.value;
    if (c.k === "cards") return cardsTip.value;
    if (c.k === "up") return upTip.value;
    if (c.k === "jars") return TP(t("tip.jarsTitle"), [...six(F.jarsHeld.map((j) => [j.n, fm(j.v)])), ...(W.value.upJar >= 1 ? [[t("tip.jarsPayUp"), "−" + fm(W.value.upJar)]] : []), "---", [t("tip.total"), fm(W.value.jarsA)]], t("tip.jarsNote"));
    if (c.k === "cushion") return TP(t("tip.keptTitle"), [[t("tip.cushionRow"), fm(F.buffer)]], t("tip.cushionNote"));
    if (c.k === "other") return TP(t("tip.otherTitle"), c.rest.map((x) => [colName(x), fm(x.a)]), t("tip.otherNote"));
    const bud = c.rk === "budget", bill = c.rk === "bill"; // the column's own kind (kind is its place in the chart)
    const note = [...(c.over || (bud && c.base > 0 && c.spent > c.base) ? ["!" + t("tip.overBy", { amt: fm(Math.round(c.spent - c.base)) })] : []), tk(bud ? "tip.noteBudget" : bill ? "tip.noteBill" : "tip.noteUsual")]
      .concat(c.bcov > 0 || c.jarCov > 0 ? [t("tip.jarNoRecount")] : [], (c.bills || []).length ? [t("tip.includesBills", { list: c.bills.map((b) => b.n).join(", ") })] : []).join("\n");
    return TP(catName(c.k), [[tk(bud ? "tip.budgetRow" : bill ? "tip.billsRow" : "tip.usualRow"), fm(Math.round(c.base))], [t("tip.spentRow"), fm(c.spent)], ...(c.bcov > 0 ? [[t("tip.jarPaysBills"), fm(c.bcov)]] : []), ...(c.jarCov > 0 ? [[t("tip.paidByJar", { j: c.jar }), fm(c.jarCov)]] : []), ...(c.upIn >= 1 ? [[t("tip.inUpcoming"), fm(c.upIn)]] : []), "---", [tk(bud ? "tip.leftBudget" : bill ? "tip.leftPay" : "tip.leftUsual"), fm(c.left)]], note);
  };
  const asideTip = computed(() => { const F = M.value.flow, w = W.value; return TP(t("num.putAside"), [[t("tip.jarsTitle"), fm(F.inJars)], ...(w.upJar >= 1 ? [[t("tip.jarsPayUp"), "−" + fm(w.upJar)]] : []), [t("home.cushion"), fm(F.buffer)], "---", [t("tip.total"), fm(w.jarsA + F.buffer)]], t("tip.asideNote")); });
  const tileTip = computed(() => {
    const w = W.value, src = [...w.src];
    return TP(t("num.leftBudgets"), [...six(src.sort((x, y) => y.left - x.left).map((r) => [catName(r.k), fm(r.left)])), "---", [t("tip.total"), fm(w.leftTot)]], t("tip.plannedTileNote"));
  });
  const leftOf = (c) => (c.kind === "end" ? (W.value.eOver > 0 ? "−" + fm(W.value.eOver) : fm(W.value.eFree)) : fm(c.lo));

  // Spending by category (ring chart).
  const donut = computed(() => {
    const data0 = M.value.spend, tot = data0.reduce((s, x) => s + x[1], 0) || 1, R = 84, r = 58, gap = 0.03; let a = -Math.PI / 2;
    const p = (x, y) => [100 + x * Math.cos(y), 100 + x * Math.sin(y)];
    return { tot, parts: data0.map(([n, v]) => { const b = a + (v / tot) * 2 * Math.PI, l = b - a - gap > Math.PI ? 1 : 0, a2 = a + gap / 2, b2 = b - gap / 2;
      const [x1, y1] = p(R, a2), [x2, y2] = p(R, b2), [x3, y3] = p(r, b2), [x4, y4] = p(r, a2); a = b;
      const pc = Math.round((v / tot) * 100);
      return { n, v, pc, color: catColor(n), tip: `${catName(n)}: ₪${n0(v)} (${pc}%)`, d: `M${x1} ${y1}A${R} ${R} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${l} 0 ${x4} ${y4}Z` }; }) };
  });

  // Exchange rates (shown only when there are rates).
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
  // "+₪1,250", "≈ −₪80" for an expected bill, "balance +₪500" for a balance update
  const openBill = (b) => { const bl = M.value.billsAll[b.idx]; const last = bl && M.value.rows.filter((x) => x.a < 0 && isBillPayment(bl, x)).sort((p, q) => p.d.localeCompare(q.d)).pop(); if (last) openTxId(last.id); else if (bl) openPop("hist", { title: bl.n, rows: [], sub: t("txw.chip.bill"), q: bl.match }); };

  return {
    t, locale, tk, fm, n0, an, subOf, cur, pair, lblOf, fx, S, M, loc, monthName, catName, catColor, nm, esc, accTail, accLbl, friendly, alertList, monthYear, alerts3, alertText, openTxId, openAlert, accGo, goConn, kpis, money2, accSub, cardRows, FLOWKEY, flowMode, flowOpts, W, pay, calm, colName, cols, six, startTip, cardsTip, upTip, endTip, colTip, asideTip, tileTip, leftOf, donut, fxCur, fxKeys, fxView, fxOpts, openBill,
  };
}
