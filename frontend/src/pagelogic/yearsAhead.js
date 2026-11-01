// Years ahead, on the Forecast (computer page and phone screen): what the money could add up to over the years, and a place
// to try other amounts. The numbers come from lib/yearsAhead.js. It starts from Home's "In your accounts" and the Forecast's
// "Saved each month" (Average), so those amounts are the same everywhere. The choices tried are only remembered as a
// preference ("moneyYears"), never written to the data.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now } from "../core/clock.js";
import { home } from "../core/derived.js";
import { usePref } from "../core/prefs.js";
import { fm } from "../format.js";
import { profAge } from "../views/settings/profile.js";
import { yearsAheadModel } from "../lib/yearsAhead.js";

export const GROWTH = [0, 0.03, 0.05];

// M: the Forecast model (pagelogic/forecast.js), for what you keep in an average month.
export function useYearsAhead(M) {
  const { t } = useI18n();
  const Y_ = (k, o, n) => (n == null ? t("years." + k, o || {}) : t("years." + k, o || {}, n));
  const pick = usePref("moneyYears", {}, { json: true });
  const age = computed(() => profAge(data.state.value?.cfg?.profile, now.value));
  const pace = computed(() => { const s = M.value?.d?.shown; return s ? s.inc.total.mean - s.out.total.mean : 0; });
  const Y = computed(() => yearsAheadModel({ start: home.value?.kpi?.cash || 0, pace: pace.value, age: age.value, pick: pick.value }));
  const set = (k, v) => { pick.value = { ...pick.value, [k]: v }; };
  const back = () => { const p = { ...pick.value }; delete p.m; pick.value = p; };
  // the age (or years from now) box: with an age the choice is kept as an age, without one as years
  const atKey = computed(() => (Y.value.hasAge ? "at" : "yrs"));

  const yrs = (k) => Math.max(1, Math.round(k / 12));
  const pc = (g) => Math.round(g * 1000) / 10;
  // the answer at the top: what today's pace adds up to by the age chosen, and when it reaches the goal
  const answer = computed(() => {
    const y = Y.value, goal = fm(y.goal), r = y.now.reach;
    const at = y.hasAge ? Y_("atAge", { amount: fm(y.now.at), age: y.at }) : Y_("atYears", { amount: fm(y.now.at), n: y.years }, y.years);
    const reach = !r ? Y_("reachNever", { goal }) : r.k == 0 ? Y_("reachHave", { goal }) : r.k < 12 ? Y_("reachSoon", { goal }) : y.hasAge ? Y_("reachAge", { goal, age: r.age }) : Y_("reachYears", { goal, n: yrs(r.k) }, yrs(r.k));
    return { at, reach };
  });
  // the results of the amounts tried: what is needed each month for the goal by the age chosen, when these amounts reach it,
  // and the change from today's pace
  const results = computed(() => {
    const y = Y.value, goal = fm(y.goal), p = y.play, amount = fm(y.m), out = [];
    if (p.need === 0) out.push({ k: "need", text: Y_("needNone", { goal }) });
    else if (p.need != null) {
      const d = y.diff.need, more = Math.abs(d) < 10 ? Y_("same") : Y_(d > 0 ? "more" : "less", { amount: fm(Math.abs(d)) });
      out.push({ k: "need", text: y.hasAge ? Y_("needAge", { goal, age: y.at, amount: fm(p.need) }) : Y_("needYears", { goal, n: y.years, amount: fm(p.need) }, y.years), sub: more });
    }
    const r = p.reach;
    const hit = !r ? Y_("hitNever", { amount }) : r.k == 0 ? Y_("hitHave") : r.k < 12 ? Y_("hitSoon", { amount }) : y.hasAge ? Y_("hitAge", { amount, age: r.age }) : Y_("hitYears", { amount, n: yrs(r.k) }, yrs(r.k));
    let sub = "";
    if (y.changed && r && r.k > 0) {
      const s = y.diff.sooner;
      if (s === Infinity) sub = Y_("onlyThis");
      else if (s != null && s != 0) { const n = Math.round(Math.abs(s) / 12); sub = n == 0 ? Y_(s > 0 ? "soonerLt" : "laterLt") : Y_(s > 0 ? "sooner" : "later", { n }, n); }
    }
    out.push({ k: "hit", text: hit, sub });
    return out;
  });
  // a point's name on the chart: "Age 45", "In 11 years" or "Today"
  const ptName = (i) => (i == 0 ? Y_("tipNow") : Y.value.hasAge ? Y_("tipAge", { age: Y.value.age + i }) : Y_("tipYears", { n: i }, i));
  const axisLabel = (i) => (Y.value.hasAge ? String(Y.value.age + i) : String(i));
  const ages = computed(() => Array.from({ length: Y.value.hi - Y.value.lo + 1 }, (_, i) => Y.value.lo + i));

  return { Y, Y_, pick, set, back, atKey, answer, results, ptName, axisLabel, ages, pc, GROWTH, fm };
}
