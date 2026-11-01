// Years ahead, on the Forecast (computer page and phone screen): what the money could add up to over the years with the
// choices made (goal, each month, age, growth). The numbers come from lib/yearsAhead.js. It starts from Home's
// "In your accounts" and what you really kept on average in the last full months (keptEachMonth, the months chosen at the top
// of the Forecast). The sentences always describe the choices as they are now. The choices are only remembered as a preference
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
  // the most years looked ahead (40, or up to age 100)
  const limit = computed(() => (Y.value.hasAge ? Math.min(MAX_YEARS, MAX_AGE - Y.value.age) : MAX_YEARS));

  // The answer: three sentences about the choices as they are now (each with a smaller second line when there is more to say).
  const answer = computed(() => {
    const y = Y.value, goal = fm(y.goal), m = fm(y.m), by = y.hasAge ? "Age" : "Years", o = { goal, m, age: y.at, n: y.years };
    const cnt = y.hasAge ? undefined : y.years;
    const total = { k: "total", text: Y_((y.m > 0 ? "total" : "totalNone") + by, { ...o, amount: fm(y.total) }, cnt) };
    const r = y.reach, s = y.sooner;
    const reach = { k: "reach", text: !r ? Y_("reachNever", { goal, n: limit.value }, limit.value) : r.k == 0 ? Y_("reachHave", { goal }) : r.soon ? Y_("reachSoon", { goal }) : y.hasAge ? Y_("reachAge", { goal, age: r.age }) : Y_("reachYears", { goal, n: r.years }, r.years) };
    if (s) reach.sub = s.never ? Y_("avgNever", { n: limit.value }, limit.value) : s.months ? Y_(s.months > 0 ? "soonerLt" : "laterLt") : Y_(s.n > 0 ? "sooner" : "later", { n: Math.abs(s.n) }, Math.abs(s.n));
    const out = [total, reach];
    if (y.need === 0) out.push({ k: "need", text: Y_("needNone" + by, o, cnt) });
    else if (y.need != null && (!r || r.k > 0)) {
      const d = y.needDiff;
      out.push({ k: "need", text: Y_("need" + by, { ...o, amount: fm(y.need) }, cnt), sub: Math.abs(d) < 10 ? Y_("needSame") : Y_(d > 0 ? "needMore" : "needLess", { amount: fm(Math.abs(d)), m }) });
    }
    return out;
  });

  // What it starts from: your average (the full months it comes from) and the money in your accounts today.
  const monthName = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "short" });
  const basis = computed(() => {
    const y = Y.value, ks = kept.value.months, n = ks.length, range = n > 1 ? monthName(ks[0]) + " – " + monthName(ks[n - 1]) : n ? monthName(ks[0]) : "";
    const avg = !n ? Y_("avgNone") : y.pace > 0 ? Y_("avg", { amount: fm(y.pace), n, range }, n) : y.pace < 0 ? Y_("avgNeg", { amount: fm(-y.pace), n, range }, n) : Y_("avgZero", { n, range }, n);
    const start = y.g > 0 ? Y_("startG", { start: fm(y.start), pc: pc(y.g) }) : Y_("start", { start: fm(y.start) });
    return { avg, start };
  });

  // a point's name on the chart: "Age 45", "In 11 years" or "Today"
  const ptName = (i) => (i == 0 ? Y_("tipNow") : Y.value.hasAge ? Y_("tipAge", { age: Y.value.age + i }) : Y_("tipYears", { n: i }, i));
  const axisLabel = (i) => (Y.value.hasAge ? String(Y.value.age + i) : String(i));
  const legMine = computed(() => Y_("legMine", { m: fm(Y.value.m) }));

  return { Y, Y_, set, back, atKey, answer, basis, ptName, axisLabel, legMine, pc, GROWTH, fm };
}
