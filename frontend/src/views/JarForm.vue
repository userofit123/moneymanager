<script setup>
// The pop-up to make a new jar or edit one, like the current app's (web/js/08-jars.js jarShell, jarForm, jarHint, jarCatsDraw).
// It only collects what is typed; Jars.vue saves it with saveJar() from jars.js.
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseDialog from "../components/BaseDialog.vue";
import BaseButton from "../components/BaseButton.vue";
import MoneyInput from "../components/MoneyInput.vue";
import { ALLN, catJarsOf } from "../lib/jars.js";
import { fm } from "../format.js";

const props = defineProps({ open: Boolean, S: Object, M: Object, id: Number, start: Object });
const emit = defineEmits(["update:open", "save"]);
const { t, locale } = useI18n();
const tk = (k, ...a) => t(k, ...a);
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));

const f = ref({});
const q = ref(""), catsOpen = ref(false);
watch(() => props.open, (o) => { if (!o) return; f.value = { kind: "goal", n: "", desc: "", cats: [], T: "", S: 0, D: "", C: "", B: "", Mo: 12, O: false, since: false, ...structuredClone(props.start || {}) }; q.value = ""; catsOpen.value = f.value.cats.length > 0; }, { immediate: true }); // the shared window opens already open (FormHost)

const TYPES = ["goal", "bill", "payoff"];
const num = (v) => +v || 0;
const mon = (k) => new Date(+props.M.MK.slice(0, 4), +props.M.MK.slice(5, 7) - 1 + k, 1).toLocaleDateString(loc.value, { month: "long", year: "numeric" });
const billName = (k) => tk("jars.kind." + { "*": "all", "*i": "allIrregular", "*a": "allAny" }[k]);
const billOpts = computed(() => [...["*a", "*", "*i"].map((k) => ({ v: k, l: billName(k) + " · " + t("jars.form.perMonth", { amount: fm(props.M.bills.allMo(k)) }) })), ...props.M.bills.rec.map((b) => ({ v: b.match, l: b.n + " · " + t("jars.form.perMonth", { amount: fm(b.mo) }) }))]);

// The line under the fields that says what will happen (jarHint).
const hint = computed(() => {
  const x = f.value, sv = num(x.S), M = props.M;
  if (x.kind == "payoff") { const T = num(x.T), C = num(x.C), rest = Math.max(0, T - sv), k = C > 0 ? Math.ceil(rest / C) : 0; return !(T > 0) ? t("jars.form.hOwe") : rest <= 0 ? t("jars.form.hPaidOff") : C > 0 ? t("jars.form.hPayoff", { c: fm(C), rest: fm(rest), k, when: mon(k - 1) }, k) : t("jars.form.hPayBack"); }
  if (x.kind == "goal" && !(num(x.T) > 0)) { const C = num(x.C); return C > 0 ? t("jars.form.hForever", { c: fm(C), year: fm(sv + C * 12) }) : t("jars.form.hGoalOr"); }
  if (x.kind == "goal") {
    const T = num(x.T), D = x.D, C = x.C == null ? "" : String(x.C), left = Math.max(0, T - sv);
    if (left <= 0) return t("jars.form.hHas");
    if (D && D >= M.today) { const m = M.monthsTo(D), by = new Date(D).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
      if (C === "") return t("jars.form.hAuto", { c: fm(Math.ceil(left / m)), m, goal: fm(T), by }, m);
      const c = +C, k = c > 0 ? Math.ceil(left / c) : 0;
      return c > 0 ? (k <= m ? t("jars.form.hOnTime", { c: fm(c), goal: fm(T), k }, k) : t("jars.form.hLate", { c: fm(c), k, need: fm(Math.ceil(left / m)) })) : t("jars.form.hNothing"); }
    if (C !== "" && +C > 0) { const k = Math.ceil(left / +C); return t("jars.form.hMonthly", { c: fm(+C), goal: fm(T), k, when: mon(k - 1) }, k); }
    return t("jars.form.hDateOr");
  }
  const all = x.B in ALLN, b = all ? { n: billName(x.B).toLowerCase(), mo: M.bills.allMo(x.B) } : M.bills.BC.find((y) => y.match == x.B), m = num(x.Mo) || 12;
  return b ? t(all ? "jars.form.hBillAll" : "jars.form.hBill", { goal: fm(Math.round(b.mo * m)), m, n: b.n }) : t("jars.form.hPick");
});

// Categories this jar pays for. A category belongs to one jar only: choosing one another jar has moves it here.
const CJ = computed(() => catJarsOf(props.S || {}));
const oth = (k) => CJ.value[k] && CJ.value[k].j.id != props.id;
const catKeys = computed(() => { const s = q.value.trim().toLowerCase(); return Object.keys(props.S?.cats || {}).filter((k) => props.S.cats[k] !== 99 && k != "Uncategorized").sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" })).filter((k) => !s || k.toLowerCase().includes(s)); });
const groups = computed(() => { const sel = f.value.cats || []; return [["sel", catKeys.value.filter((k) => sel.includes(k))], ["avail", catKeys.value.filter((k) => !sel.includes(k) && !oth(k))], ["other", catKeys.value.filter((k) => !sel.includes(k) && oth(k))]].filter(([, L]) => L.length); });
const moved = computed(() => (f.value.cats || []).filter((k) => oth(k)));
const toggleCat = (k) => { const c = f.value.cats; f.value.cats = c.includes(k) ? c.filter((x) => x != k) : [...c, k]; };
const cc = (c) => (c == "Income" || props.S?.cats?.[c] === 99 ? "var(--pos)" : `var(--c${(props.S?.cats?.[c] == null ? 6 : props.S.cats[c]) % 7})`);
</script>

<template>
  <BaseDialog :open="open" :title="id ? t('jars.form.edit') : t('jars.form.new')" @update:open="emit('update:open', $event)">
    <div>
      <div v-if="!id" class="sm" style="margin-bottom:14px">{{ t("jars.form.intro") }}</div>
      <div class="fld"><label for="njN">{{ t("jars.form.name") }}</label><input id="njN" v-model="f.n" :placeholder="t('jars.form.nameEx')" autocomplete="off"></div>
      <div class="fld"><label for="njDsc">{{ t("jars.form.desc") }}</label><input id="njDsc" v-model="f.desc" maxlength="400" :placeholder="t('jars.form.descEx')" autocomplete="off"></div>
      <div class="fld"><label>{{ t("jars.form.forWhat") }}</label>
        <div class="jtype"><button v-for="v in TYPES" :key="v" type="button" class="jt" :class="{ on: f.kind == v }" :aria-pressed="f.kind == v" @click="f.kind = v"><b>{{ tk("jars.form.ty." + v) }}</b><span>{{ tk("jars.form.tyd." + v) }}</span></button></div>
      </div>

      <template v-if="f.kind == 'goal'">
        <div class="two">
          <div class="fld"><label for="njT">{{ t("jars.form.goalAmt") }}</label><MoneyInput id="njT" v-model="f.T" :placeholder="t('jars.form.goalEx')" /></div>
          <div class="fld"><label for="njS">{{ id ? t("jars.form.savedSoFar") : t("jars.form.already") }}</label><MoneyInput id="njS" v-model="f.S" /></div>
        </div>
        <label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:-4px 0 12px;font-size:13px"><input v-model="f.O" type="checkbox" style="margin-top:3px"><span>{{ t("jars.form.notHere") }}<br><span class="sm">{{ t("jars.form.notHereSub") }}</span></span></label>
        <div class="two">
          <div class="fld"><label for="njD">{{ t("jars.form.byWhen") }}</label><input id="njD" v-model="f.D" type="date"></div>
          <div class="fld"><label for="njC">{{ t("jars.form.perMonthL") }}</label><MoneyInput id="njC" v-model="f.C" :placeholder="t('jars.form.workedOut')" /></div>
        </div>
      </template>
      <template v-else-if="f.kind == 'payoff'">
        <div class="two">
          <div class="fld"><label for="njT">{{ t("jars.form.owe") }}</label><MoneyInput id="njT" v-model="f.T" :placeholder="t('jars.form.oweEx')" /></div>
          <div class="fld"><label for="njS">{{ t("jars.form.paidBack") }}</label><MoneyInput id="njS" v-model="f.S" /></div>
        </div>
        <div class="two"><div class="fld"><label for="njC">{{ t("jars.form.payPer") }}</label><MoneyInput id="njC" v-model="f.C" :placeholder="t('jars.form.payEx')" /></div><div /></div>
      </template>
      <template v-else>
        <div class="fld"><label for="njB">{{ t("jars.form.bill") }}</label><select id="njB" v-model="f.B"><option value="">{{ t("jars.form.chooseBill") }}</option><option v-for="o in billOpts" :key="o.v" :value="o.v">{{ o.l }}</option></select></div>
        <div class="two">
          <div class="fld"><label for="njMo">{{ t("jars.form.months") }}</label><input id="njMo" v-model="f.Mo" type="number" inputmode="numeric" min="1"></div>
          <div class="fld"><label for="njS">{{ id ? t("jars.form.savedSoFar") : t("jars.form.already") }}</label><MoneyInput id="njS" v-model="f.S" /></div>
        </div>
      </template>
      <div class="jhint">{{ hint }}</div>

      <div class="fld">
        <button type="button" class="jcht" :aria-expanded="catsOpen" @click="catsOpen = !catsOpen"><span class="jcl2">{{ t("jars.form.cats") }} <span class="sm">{{ t("jars.form.optional") }}</span></span><span class="bd" :class="f.cats.length ? 'bill' : 'fl'">{{ t("jars.form.selected", { n: f.cats.length }) }}</span><svg class="jcv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
        <template v-if="catsOpen">
          <div class="sm" style="margin:8px 0 10px">{{ t("jars.form.catsEx", { amount: fm(120) }) }}</div>
          <input v-model="q" class="jcq" type="search" :placeholder="t('jars.form.catSearch')" autocomplete="off" :aria-label="t('jars.form.catSearch')">
          <div class="jcl">
            <div v-for="[g, L] in groups" :key="g" class="jcg"><h5>{{ tk("jars.form.cg." + g) }}</h5>
              <div><button v-for="k in L" :key="k" type="button" class="jct" :class="{ on: f.cats.includes(k), oth: oth(k) && !f.cats.includes(k) }" :aria-pressed="f.cats.includes(k)" @click="toggleCat(k)">
                <span class="dot" :style="{ background: cc(k) }" /><span class="jcn"><b>{{ k }}</b><small v-if="f.cats.includes(k)">{{ oth(k) ? t("jars.form.movesFrom", { jar: CJ[k].j.n }) : t("jars.form.paysThis") }}</small><small v-else-if="oth(k)"><span class="bd am2">{{ t("jars.form.inJar", { jar: CJ[k].j.n }) }}</span></small><small v-else>{{ t("jars.form.notLinked") }}</small></span>
                <span class="jck"><svg v-if="f.cats.includes(k)" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg></span></button></div>
            </div>
            <div v-if="!groups.length" class="sm" style="padding:6px 2px">{{ t("jars.form.noCat") }}</div>
          </div>
          <label v-if="f.cats.length" class="chk" style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px"><input v-model="f.since" type="checkbox"> {{ t("jars.form.since") }}</label>
          <div v-if="moved.length" class="sm" style="margin-top:8px">{{ t("jars.form.willMove", { cats: moved.join(", "), jars: [...new Set(moved.map((k) => CJ[k].j.n))].join(", ") }) }}</div>
        </template>
        <div v-else class="sm" style="margin-top:6px">{{ f.cats.length ? t("jars.form.catsSet", { cats: f.cats.join(", ") }) : t("jars.form.catsNone") }}</div>
      </div>
      <div class="sm" style="margin:2px 0 16px">{{ t("jars.form.order1") }}<template v-if="!id">{{ " " }}{{ t("jars.form.order2") }}</template> {{ t("jars.form.order3") }} {{ t("jars.form.order4") }}</div>
    </div>
    <template #actions>
      <BaseButton variant="outline" @click="emit('update:open', false)">{{ t("jars.cancel") }}</BaseButton>
      <BaseButton @click="emit('save', { ...f })">{{ id ? t("jars.form.saveEdit") : t("jars.form.create") }}</BaseButton>
    </template>
  </BaseDialog>
</template>
