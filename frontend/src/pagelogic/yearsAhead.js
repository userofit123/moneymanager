// Years ahead, on the Forecast (computer page and phone screen): what the money could add up to over the years with the
// choices made (goal, each month, age, growth). The numbers come from lib/yearsAhead.js. It starts from Home's
// "In your accounts" and what you really kept on average in the last full months (keptEachMonth, the months chosen at the top
// of the Forecast). The tiles always describe the choices as they are now. The choices are remembered as a preference
// ("moneyYears"); while a slider is dragged they are saved a moment after it stops, so dragging stays smooth.
// "Save this goal" keeps the choices in the data (cfg.goal, with a history line and Undo), for Home's goal card; with a saved
// goal the page starts from it.
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { ask } from "../core/ask.js";
import { now } from "../core/clock.js";
import { home, forecast, fcSaved } from "../core/derived.js";
import { readJson, writeJson } from "../core/prefs.js";
import { fm } from "../format.js";
import { profAge } from "../views/settings/profile.js";
import { yearsAheadModel, keptEachMonth, goalOf, goalPick, goalLine, sameGoal, goalStatus, MAX_YEARS, MAX_AGE } from "../lib/yearsAhead.js";

export const GROWTH = [0, 0.03, 0.05];
// the tiles' icons: money growing, the goal's flag, each month
export const YAI = { total: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>', reach: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  need: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>' };

// M: the Forecast model (pagelogic/forecast.js): its months (FH) and the months chosen at the top (fc.n).
export function useYearsAhead(M) {
  const { t, locale } = useI18n();
  const Y_ = (k, o, n) => (n == null ? t("years." + k, o || {}) : t("years." + k, o || {}, n));
  const age = computed(() => profAge(data.state.value?.cfg?.profile, now.value));
  // the saved goal (null when none); the page starts from it when there is one
  const G = computed(() => data.state.value?.cfg?.goal || null);
  const pick = ref((G.value && goalPick(G.value, age.value, now.value)) || readJson("moneyYears", {}) || {});
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = null; writeJson("moneyYears", pick.value); };
  onBeforeUnmount(() => { if (saveT) save(); });
  const set = (k, v) => { pick.value = { ...pick.value, [k]: v }; clearTimeout(saveT); saveT = setTimeout(save, 400); };
  const back = () => { const p = { ...pick.value }; delete p.m; pick.value = p; save(); };

  const kept = computed(() => keptEachMonth(M.value?.FH, M.value?.fc?.n || 3));
  const Y = computed(() => yearsAheadModel({ start: home.value?.kpi?.cash || 0, pace: kept.value.avg || 0, age: age.value, pick: pick.value }));
  // the saved goal as the model sees it today, and whether the choices are still the same as it
  const Ys = computed(() => (G.value ? yearsAheadModel({ start: home.value?.kpi?.cash || 0, pace: kept.value.avg || 0, age: age.value, pick: goalPick(G.value, age.value, now.value) }) : null));
  const same = computed(() => sameGoal(Y.value, Ys.value));
  // Save this goal / Update goal: the choices as they are now go into the data, with a history line and Undo
  const saveGoal = () => {
    const g = goalOf(Y.value, now.value);
    data.change((S) => { S.cfg = S.cfg || {}; const had = !!S.cfg.goal; S.cfg.goal = g; return [[had ? "Updated goal" : "Saved a goal", goalLine(g)]]; });
  };
  // the goal block next to the three numbers: whether a goal is saved ("none", "same" as the choices, or "diff"), its heading
  // and the line under it
  const goalState = computed(() => {
    const S = Ys.value;
    if (!S) return { k: "none", head: Y_("goalNone"), sub: Y_("goalNoneSub") };
    if (same.value) return { k: "same", head: S.hasAge ? Y_("goalSavedAge", { goal: fm(S.goal), age: S.at }) : Y_("goalSavedYears", { goal: fm(S.goal), n: S.years }, S.years), sub: Y_("goalSavedSub") };
    return { k: "diff", head: Y_("goalChanged"), sub: S.hasAge ? Y_("savedDiffAge", { goal: fm(S.goal), age: S.at }) : Y_("savedDiffYears", { goal: fm(S.goal), n: S.years }, S.years) };
  });
  // Remove goal: asks first; the choices on the page stay as they are
  const removeGoal = () => ask(Y_("rmTitle"), Y_("rmText"), () => data.change((S) => { const g = S.cfg?.goal; if (!g) return false; delete S.cfg.goal; return [["Removed goal", goalLine(g)]]; }), { danger: true, yes: Y_("remove") });
  // the age (or years from now) box: with an age the choice is kept as an age, without one as years
  const atKey = computed(() => (Y.value.hasAge ? "at" : "yrs"));
  const pc = (g) => Math.round(g * 1000) / 10;
  // the age (or years) box: a whole number within the slider's range is used while typing; when the box is left it shows a
  // number in that range again (the nearest one, or the last one when it was left empty)
  const typeAt = (e) => { const v = +e.target.value; if (e.target.value.trim() && Number.isInteger(v) && v >= Y.value.lo && v <= Y.value.hi) set(atKey.value, v); };
  const leaveAt = (e) => {
    const raw = e.target.value.trim(), v = raw && isFinite(+raw) ? Math.min(Y.value.hi, Math.max(Y.value.lo, Math.round(+raw))) : Y.value.at;
    if (v !== Y.value.at) set(atKey.value, v);
    e.target.value = String(v);
  };
  // the most years looked ahead (40, or up to age 100)
  const limit = computed(() => (Y.value.hasAge ? Math.min(MAX_YEARS, MAX_AGE - Y.value.age) : MAX_YEARS));

  // The answer: up to three tiles about the choices as they are now (a small label, a big value, a short line under it and a
  // tooltip that says how it is worked out). The label follows the choices (the age or years, the goal).
  const lines = (...a) => a.filter(Boolean).join("\n");
  const answer = computed(() => {
    const y = Y.value, goal = fm(y.goal), m = fm(y.m), by = y.hasAge ? "Age" : "Years", cnt = y.hasAge ? undefined : y.years;
    const o = { goal, m, age: y.at, n: y.years, start: fm(y.start), pc: pc(y.g) };
    const grow = y.g > 0 ? Y_("tipGrow", o) : Y_("tipNoGrow");
    const total = { k: "total", label: Y_("total" + by, o, cnt), value: fm(y.total), sub: y.m > 0 ? Y_("atM", o) : Y_("atNone"),
      tip: lines(Y_("totalTipH"), Y_("tipStart", o), y.m > 0 ? Y_("tipAdd", o) : null, grow, Y_("tipGuess")) };
    const r = y.reach, s = y.sooner;
    const value = !r ? (y.hasAge ? Y_("neverAge", { age: y.age + limit.value }) : Y_("neverYears", { n: limit.value }, limit.value))
      : r.k == 0 ? Y_("have") : r.soon ? Y_("soon") : y.hasAge ? Y_("ageV", { age: r.age }) : Y_("yearsV", { n: r.years }, r.years);
    const sub = r && r.k == 0 ? Y_("haveSub") : !s ? (y.m > 0 ? Y_("atM", o) : Y_("atNone"))
      : s.never ? Y_("avgNever") : s.months ? Y_(s.months > 0 ? "soonerLt" : "laterLt") : Y_(s.n > 0 ? "sooner" : "later", { n: Math.abs(s.n) }, Math.abs(s.n));
    const reach = { k: "reach", label: Y_("reach", o), value, sub, tip: lines(Y_("reachTipH"), Y_("reachTip", o), Y_("reachTipAvg", { amount: fm(y.kept) }), grow) };
    const out = [total, reach];
    if (y.need != null && (!r || r.k > 0 || y.need === 0)) {
      const d = y.needDiff;
      out.push({ k: "need", label: Y_("need" + by, o, cnt), value: fm(y.need), unit: Y_("aMonth"),
        sub: y.need === 0 ? Y_("needNone") : Math.abs(d) < 10 ? Y_("needSame") : Y_(d > 0 ? "needMore" : "needLess", { amount: fm(Math.abs(d)) }),
        tip: lines(Y_("needTipH"), Y_("needTip" + by, o, cnt), Y_("tipStart", o), grow) });
    }
    return out;
  });

  // The tooltip of "Set aside each month": what it is, then your average and the full months it comes from.
  const monthName = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "short" });
  const mTip = computed(() => {
    const y = Y.value, ks = kept.value.months, n = ks.length, range = n > 1 ? monthName(ks[0]) + " – " + monthName(ks[n - 1]) : n ? monthName(ks[0]) : "";
    const from = !n ? Y_("avgNone") : y.pace < 0 ? Y_("avgNeg", { amount: fm(-y.pace), n, range }, n) : Y_("avgFrom", { n, range }, n);
    return lines(Y_("mTip"), "---", Y_("avgTipH", { amount: fm(y.kept) }), from, Y_("avgTip"));
  });

  // a point's name on the chart: "Age 45", "In 11 years" or "Today"
  const ptName = (i) => (i == 0 ? Y_("tipNow") : Y.value.hasAge ? Y_("tipAge", { age: Y.value.age + i }) : Y_("tipYears", { n: i }, i));
  const axisLabel = (i) => (Y.value.hasAge ? String(Y.value.age + i) : String(i));
  const legMine = computed(() => Y_("legMine", { m: fm(Y.value.m) }));

  return { YAI, Y, Y_, set, back, G, same, saveGoal, removeGoal, goalState, atKey, typeAt, leaveAt, answer, mTip, ptName, axisLabel, legMine, pc, GROWTH, fm };
}

// Home's goal card opens the Forecast at Years ahead: the card sets this, and Years ahead scrolls itself into view once.
const toYears = { on: false };
export const openYearsNext = () => { toYears.on = true; };
export function useScrollToYears(el) {
  onMounted(() => { if (!toYears.on) return; toYears.on = false; nextTick(() => setTimeout(() => el.value?.scrollIntoView({ block: "start" }), 60)); });
}

// Home's goal card (computer and phone): only when a goal is saved. The goal, how much of it is in your accounts today (Home's
// "In your accounts"), and whether setting aside your average gets there in time (goalStatus, the same numbers as Years ahead).
export function useGoalCard() {
  const { t } = useI18n();
  const H_ = (k, o, n) => (n == null ? t("home.goal." + k, o || {}) : t("home.goal." + k, o || {}, n));
  const st = computed(() => {
    const G = data.state.value?.cfg?.goal;
    if (!G || !home.value) return null;
    const kept = keptEachMonth(forecast.value?.FH, fcSaved.value?.n || 3);
    return goalStatus({ start: home.value.kpi?.cash || 0, pace: kept.avg || 0, age: profAge(data.state.value?.cfg?.profile, now.value), G, today: now.value });
  });
  return computed(() => {
    const s = st.value;
    if (!s) return null;
    const goal = fm(s.goal), r = s.reach;
    const name = s.hasAge ? H_("byAge", { goal, age: s.at }) : H_("inYears", { goal, n: s.years }, s.years);
    const have = H_("have", { amount: fm(s.start) });
    let line;
    if (s.have) line = H_("done");
    else if (s.on) line = r.soon ? H_("onSoon") : s.hasAge ? H_("onAge", { age: r.age }) : H_("onYears", { n: r.years }, r.years);
    else {
      // when your average gets there (or not at all), then what it would take each month to get there in time
      const shown = r && (s.hasAge ? r.age : r.years), target = s.hasAge ? s.at : s.years;
      const when = !r ? H_("behindNever") : shown <= target ? H_("behindLt") : s.hasAge ? H_("behindAge", { age: r.age }) : H_("behindYears", { n: r.years }, r.years);
      line = when + " " + (s.hasAge ? H_("needAge", { need: fm(s.need), age: s.at }) : H_("needYears", { need: fm(s.need), n: s.years }, s.years));
    }
    const tip = [H_("tipH"), H_("tipGoal"), H_("tipHave", { amount: fm(s.start) }), H_("tipAvg", { amount: fm(s.kept) }),
      s.g > 0 ? H_("tipGrow", { pc: Math.round(s.g * 1000) / 10 }) : H_("tipNoGrow"), H_("tipOn"), H_("tipGuess")].join("\n");
    return { name, have, pc: s.pc, on: s.on, lead: s.have ? H_("doneLead") : s.on ? H_("onLead") : H_("behindLead"), line, tip };
  });
}
