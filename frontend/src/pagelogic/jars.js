// What Jars knows and does, without the screen: what is safe to put in jars, what went in this month, the amount kept
// untouched, each jar with its status and history, goals and completed jars, and the changes (fill, take back, mark as done,
// delete, reorder, reopen). Used by the computer's Jars page (views/Jars.vue) and the phone's Jars and Jar screens, so both
// show the same numbers. The jar changes (lib/jars.js) write history lines and undo entries.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { jars as M, home, keyNums } from "../core/derived.js";
import { paydayWords } from "./payday.js";
import { openForm } from "../core/forms.js";
import { openTx } from "../core/txwin.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { catLabel } from "../core/cats.js";
import { TP } from "../core/tooltip.js";
import { fm, f0 } from "../format.js";
import { dstr } from "../dates.js";
import { isolateNumbers } from "../core/polish.js";
import { jarCtx, releaseJars, takeBackAmt, markDone, deleteJar, jarHistory, jarFormOf, goalFix, moveJar, moveJarTo, reopenJar } from "../lib/jars.js";
import { displayName } from "../lib/activity.js";

export function useJars() {
  const { t, locale } = useI18n();
  const tk = (key, ...a) => t(key, ...a);

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
  const BUF_PRESETS = [0, 1000, 2000, 5000, 10000];

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
  const histOf = (id) => jarHistory(S.value, id, (x) => displayName(S.value, x));
  const hist = computed(() => (menu.value && menu.value.kind == "hist" ? histOf(menu.value.id) : []));
  const histName = computed(() => (menu.value ? (S.value.jars || []).find((j) => j.id == menu.value.id)?.n || "" : ""));
  // names and notes come from the data (names are shown through tx() too);
  // notes (the app's and the server's English, "Auto-fill 2026-10"): shown in Hebrew through tx() (core/heSaved.js)
  const noteText = (h) => (h.earlier ? t(h.note == "start" ? "jars.hist.start" : "jars.hist.untracked") : h.pay ? t(h.payoff ? "jars.hist.paidBack" : "jars.hist.paid", { name: "⁨" + h.name + "⁩" }) : tx(h.note));
  const amtText = (h) => (h.pay && h.payoff ? "" : h.amt < 0 ? "−" : "+") + "₪" + f0(h.amt);
  const amtCls = (h) => (h.pay ? (h.payoff ? "" : "neg") : h.amt < 0 ? "neg" : "pos");
  const histOpen = (h) => { menu.value = null; allOf.value = null; openTx(h.id); };
  // The menu shows the latest lines; "See all" opens the whole history in a window, where it can be narrowed down.
  const HIST_N = 8;
  const allOf = ref(null), allKind = ref("all");
  const openAll = () => { allOf.value = menu.value.id; allKind.value = "all"; menu.value = null; };
  const allName = computed(() => (S.value.jars || []).find((j) => j.id == allOf.value)?.n || "");
  const ofKind = (L, kind) => L.filter((h) => kind == "all" || (kind == "pay" ? h.pay : !h.pay && (kind == "in" ? h.amt > 0 : h.amt < 0)));
  const allHist = computed(() => ofKind(allOf.value == null ? [] : histOf(allOf.value), allKind.value));
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
  const relAmt = computed(() => takeBackAmt(M.value.F.jarsOver, M.value.F.inJars));
  const doRelease = () => { relAsk.value = false; const amt = relAmt.value; if (!(amt > 0)) return; save((next) => { const l = releaseJars(next, amt, ctx()); return l.length ? l : false; }); toast(t("jars.rel.done")); };
  const why = ref(false);

  // One jar's texts.
  const ALLB = { "*": "all", "*i": "allIrregular", "*a": "allAny" };
  const payoff = (j) => j.kind === "payoff";
  const kindOf = (j) => (payoff(j) ? t("jars.kind.payoff") : j.type !== "bill" ? (j.type === "month" ? t("jars.kind.month") : t("jars.kind.goal")) : ALLB[j.bill] ? tk("jars.kind." + ALLB[j.bill]) : j.billName || t("jars.kind.bill"));
  const stLabel = (s) => (s.key === "needs" ? t("jars.st.needs", { amount: fm(s.want) }) : tk("jars.st." + s.key));
  // The tooltips' layout: a title, rows, a line, a note.
  const T = (k, v) => tk("jarp.tip." + k, v);
  // what the status means (stBody); the computer's pill adds that a click opens the history (stTip)
  function stBody(j) {
    const s = j.state;
    return s.key === "noAuto" ? TP(T("noAutoT"), [], T("noAutoN"))
      : s.key === "full" || s.key === "paidOff" ? TP(T("fullT"), [[T("nowIn"), fm(j.bal)], ...(j.need > 0 ? [[t("jars.goal"), fm(j.need)]] : [])], T(s.bill ? "fullBillN" : "fullN"))
      : s.key === "funded" ? TP(T("fundedT"), [[T("putIn"), fm(s.got)], ...(s.bill ? [] : [[T("monthly"), fm(s.share)]])], T("fundedN"))
      : s.key === "partly" ? TP(T("partlyT"), [[T("putIn"), fm(s.got)], [T("monthly"), fm(s.share)], [T("stillDue"), fm(s.want)]], T("partlyN"))
      : TP(T("needsT"), [...(s.share > 0 ? [[T("monthly"), fm(s.share)]] : []), [T("putInMonth"), fm(0)], [T("stillDue"), fm(s.want)]], t(s.soon ? "jars.stTip.needsSoon" : "jars.stTip.needsNo"));
  }
  const stTip = (j) => stBody(j) + "\n" + t("jars.history");
  const priTip = (j) => TP(t("jars.priority", { n: j.ix + 1, total: M.value.jars.length }), [], T("priorityN"));
  const catTip = (j) => TP(T("catsT"), [...j.cats.map((x) => [catLabel(x.c), T("spent", { amount: fm(M.value.spend[x.c] || 0) })]), "---", [T("paidMonth"), fm(j.autoPaid)], [T("stillIn"), fm(j.bal)]], t("jars.paysForTip"));
  const etaWhen = (e) => (e.k ? mlab(e.when) : t("jars.over5"));
  // on the card, in Hebrew the year stays left to right (יוני ⁦2028⁩)
  const etaShow = (e) => (locale.value === "he" ? isolateNumbers(etaWhen(e)) : etaWhen(e));
  const etaTip = (e) => TP(T("fullByT", { when: etaWhen(e) }), [[T("toSave"), fm(e.left)], [T("perMonth"), fm(e.cap)], [T("monthsTo"), e.k ? String(e.k) : "60+"], ...(e.due ? [[T("deadline"), mlab(e.due)]] : [])]);
  const statTips = computed(() => { const m = M.value.month, F = M.value.F; return {
    putIn: TP(t("jars.putIn"), [[T("thisMonth"), fm(m.got)]], T("putInNote")),
    still: TP(t("jars.still"), [[T("needed"), fm(m.still)]], T("stillNote")),
    avail: TP(t("num.free"), [[t("num.inAccounts"), fm(F.cash)], ...(F.cards >= 1 ? [[t("num.cardsUnpaid"), fm(F.cards)]] : []), ...(F.up >= 1 ? [[t("num.upcoming"), fm(F.up)]] : []), ...(F.toCome >= 1 ? [[t("num.leftBudgets"), fm(F.toCome)]] : []), ...(F.aside >= 1 ? [[t("num.putAside"), fm(F.aside)]] : []), "---", [t("num.free"), fm(F.free)]], T("availNote")),
  }; });
  const lateText = (l) => (l.kind === "after" ? t("jars.lateAfter", { when: mlab(l.when), due: mlab(l.due), amount: fm(l.need) }) : t("jars.lateNever", { due: mlab(l.due) }));
  const ringText = (j) => (j.open ? "₪" + (j.bal >= 1e4 ? Math.round(j.bal / 1e3) + "k" : f0(j.bal)) : j.pc + "%");
  const RC = 2 * Math.PI * 34;
  const KI = { goal: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', month: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>', bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>' };
  const col = (p) => `var(--c${(p - 1) % 7})`;
  // what the month bar under "Put into jars this month" says
  // Free to use below zero right before payday (lib/payday.js): what it will likely be after payday, and whether the income
  // still to come this month covers it (then the jars simply wait for it: no "too much" warning)
  const pay = computed(() => (M.value && M.value.F.over > 0 ? paydayWords(t, keyNums.value?.payday, locale.value === "he") : null));
  const monthLine = computed(() => { const m = M.value.month; return m.done ? t("jars.allDone") : m.waiting && pay.value?.covered ? t("jars.waitPay", { amount: fm(m.still) }) : m.waiting ? (M.value.F.buffer > 0 ? t("jars.waitingKept", { amount: fm(m.still), kept: fm(M.value.F.buffer) }) : t("jars.waiting", { amount: fm(m.still) })) : t("jars.filling"); });

  // One goal's line.
  function goalLine(g) {
    if (g.st === "reached") return t("jars.reachedLine");
    if (g.due) return t("jars.dueLine", { due: mlab(g.due), m: g.m, req: fm(g.req), c: fm(g.c) }, g.m) + (g.short ? " · " + t("jars.dueShort") : "");
    if (g.st === "saving") return g.k ? t("jars.savingLine", { c: fm(g.c), k: g.k, when: mlab(g.when) }, g.k) : t("jars.savingNever", { c: fm(g.c) });
    return t("jars.noneLine");
  }
  const GCLS = { reached: "dn", ontrack: "dn", behind: "up", saving: "am2", none: "fl" };
  const doneLine = (d) => [t("jars.doneOn", { date: dstr(d.done) }), d.need > 0 ? t("jars.goalAmt", { amount: fm(d.need) }) : "", d.count ? t("jars.paidOut", { amount: fm(d.paid), n: d.count }, d.count) : ""].filter(Boolean).join(" · ");

  return {
    t, tk, locale, data, S, M, home, mlab, save, ctx, fm, f0, tx, dstr, catLabel,
    bufText, setBuffer, bufShown, BUF_PRESETS, filling, fill,
    menu, toggleMenu, histOf, hist, histName, noteText, amtText, amtCls, histOpen, HIST_N, allOf, allKind, openAll, allName, ofKind, allHist, allKinds,
    openNew, openEdit, doneAsk, askDone, doDone, delAsk, askDel, doDel, relAmt, relAsk, doRelease, why,
    payoff, kindOf, stLabel, stBody, stTip, priTip, catTip, etaWhen, etaShow, etaTip, statTips, lateText, ringText, RC, KI, col, monthLine, pay,
    goalLine, GCLS, doneLine, goalFix, moveJar, moveJarTo, reopenJar, markDone, deleteJar,
  };
}
