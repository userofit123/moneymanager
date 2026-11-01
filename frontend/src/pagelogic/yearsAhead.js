// Years ahead, on the Forecast (computer page and phone screen): what the money could add up to over the years with the
// choices made (goal, each month, age, growth). The numbers come from lib/yearsAhead.js. It starts from Home's
// "In your accounts" and what you really kept on average in the last full months (keptEachMonth, the months chosen at the top
// of the Forecast). The tiles always describe the choices as they are now. The choices are only remembered as a preference
// ("moneyYears"), never written to the data; while a slider is dragged they are saved a moment after it stops, so dragging
// stays smooth.
import { ref, computed, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { home } from "../core/derived.js";
import { readJson, writeJson } from "../core/prefs.js";
import { fm } from "../format.js";
import { profAge } from "../views/settings/profile.js";
import { yearsAheadModel, keptEachMonth, MAX_YEARS, MAX_AGE } from "../lib/yearsAhead.js";

export const GROWTH = [0, 0.03, 0.05];
// the tiles' icons: money growing, the goal's flag, each month
export const YAI = { total: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>', reach: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  need: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>' };

// M: the Forecast model (pagelogic/forecast.js): its months (FH) and the months chosen at the top (fc.n).
export function useYearsAhead(M) {
  const { t, locale } = useI18n();
  const Y_ = (k, o, n) => (n == null ? t("years." + k, o || {}) : t("years." + k, o || {}, n));
  const pick = ref(readJson("moneyYears", {}) || {});
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = null; writeJson("moneyYears", pick.value); };
  onBeforeUnmount(() => { if (saveT) save(); });
  const set = (k, v) => { pick.value = { ...pick.value, [k]: v }; clearTimeout(saveT); saveT = setTimeout(save, 400); };
  const back = () => { const p = { ...pick.value }; delete p.m; pick.value = p; save(); };

  const age = computed(() => profAge(data.state.value?.cfg?.profile, now.value));
  const kept = computed(() => keptEachMonth(M.value?.FH, M.value?.fc?.n || 3));
  const Y = computed(() => yearsAheadModel({ start: home.value?.kpi?.cash || 0, pace: kept.value.avg || 0, age: age.value, pick: pick.value }));
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

  // Your average, shown under "Set aside each month": the amount, and in its tooltip the full months it comes from.
  const monthName = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "short" });
  const avg = computed(() => {
    const y = Y.value, ks = kept.value.months, n = ks.length, range = n > 1 ? monthName(ks[0]) + " – " + monthName(ks[n - 1]) : n ? monthName(ks[0]) : "";
    const from = !n ? Y_("avgNone") : y.pace < 0 ? Y_("avgNeg", { amount: fm(-y.pace), n, range }, n) : Y_("avgFrom", { n, range }, n);
    return { text: Y_("avg", { amount: fm(y.kept) }), tip: lines(Y_("avgTipH"), from, Y_("avgTip")) };
  });

  // a point's name on the chart: "Age 45", "In 11 years" or "Today"
  const ptName = (i) => (i == 0 ? Y_("tipNow") : Y.value.hasAge ? Y_("tipAge", { age: Y.value.age + i }) : Y_("tipYears", { n: i }, i));
  const axisLabel = (i) => (Y.value.hasAge ? String(Y.value.age + i) : String(i));
  const legMine = computed(() => Y_("legMine", { m: fm(Y.value.m) }));

  return { YAI, Y, Y_, set, back, atKey, typeAt, leaveAt, answer, avg, ptName, axisLabel, legMine, pc, GROWTH, fm };
}
