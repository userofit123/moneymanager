// What Budgets knows and does, without the screen: the three numbers on top, suggested budgets, each budget's pace, bills and jar,
// spending with no budget, and the changes (accept, change, remove...). Used by the computer's Budgets page (views/Budgets.vue)
// and the phone's Budgets screen (phone/screens/BudgetsScreen.vue), so both show the same numbers.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { budgets as M } from "../core/derived.js";
import { openForm } from "../core/forms.js";
import { goActivity } from "../core/shell.js";
import { openTx, openPop } from "../core/txwin.js";
import { catColor } from "../core/cats.js";
import { dstr } from "../dates.js";
import { toast } from "../core/toast.js";
import { fm } from "../lib/bills.js";
import { acceptBudget, acceptAll, dismissSuggestion, laterReview, resetDismissed, applyBudget, removeBudget, changeBudget } from "../lib/budgets.js";

export function useBudgets() {
  const { t, locale } = useI18n();
  const tk = (key, ...a) => t(key, ...a);
  const S = computed(() => data.state.value);

  const cc = (n) => catColor(S.value, n);
  const mlab = computed(() => M.value.budMonths.map((m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "short" })).join(", "));

  // what is left of all budgets, per day until the month ends (the "Left to spend" line and the phone's opening sentence)
  const perDayLeft = computed(() => { const m = M.value; return Math.max(0, m.totL - m.totS) / Math.max(1, m.DIM - m.DAYN); });
  const kpis = computed(() => {
    const m = M.value, tl = m.totL, ts = m.totS;
    return [
      { c: "hero", l: t("budgets.k.budgeted"), v: tl, s: t("budgets.k.across", { n: m.info.length }) },
      { c: "", l: t("budgets.k.spent"), v: ts, s: t("budgets.k.spentSub", { pct: tl ? Math.round((ts / tl) * 100) : 0, month: Math.round((m.DAYN / m.DIM) * 100) }) },
      { c: "", l: t("budgets.k.left"), v: tl - ts, s: t("budgets.k.leftSub", { amount: fm(perDayLeft.value) }) },
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
  const typed = ref({}); // what is typed in each suggestion's amount box
  const propOf = (x) => (x.k in typed.value ? typed.value[x.k] : x.prop);
  const accept = (x) => { const v = Math.round(+propOf(x)); if (!(v > 0)) { say(t("budgets.enter"), "err"); return; } change((n) => acceptBudget(n, x.k, v)); };
  const acceptEvery = () => change((n) => acceptAll(n, M.value.fresh.slice(0, 8).map((x) => [x.k, propOf(x)])));
  const dismiss = (k) => change((n) => dismissSuggestion(n, k));
  const later = (k) => change((n) => laterReview(n, k, M.value.MK));
  const resetNo = () => change((n) => resetDismissed(n));
  const apply = (r) => change((n) => applyBudget(n, r.k, r.prop));
  const edit = (k, ev) => change((n) => changeBudget(n, k, ev.target.value.replace(/,/g, ""))); // the box shows "1,200"
  const remove = (k) => change((n) => removeBudget(n, k));

  // ---- Add a budget ----
  // Add a budget: the shared window (components/forms/BudgetForm.vue).
  const openAdd = (k) => openForm("budget", { k: k || "" });
  // A category name opens Activity with only that category (goCat).
  const goCat = (cat) => goActivity({ cat });
  // A bill inside a budget opens its last payment, or its payment history when there is none yet (billOpen).
  const billOpen = (x) => { const b = M.value.bills[x.idx]; if (!b) return; const L = M.value.billTx(b), last = L[L.length - 1]; if (last) openTx(last.id); else openPop("hist", { title: b.n, rows: L, sub: t("txw.chip.bill"), q: b.match }); };

  return { t, tk, locale, S, M, cc, mlab, perDayLeft, kpis, stClass, stTip, fillColor, billSt, rvOf, lastVals, typed, propOf, accept, acceptEvery, dismiss, later, resetNo, apply, edit, remove, openAdd, goCat, billOpen };
}
