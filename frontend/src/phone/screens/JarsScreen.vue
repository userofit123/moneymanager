<script setup>
// Jars (tab): money set aside for things. It opens with one sentence (how much is safe to put in jars, or how much the jars
// hold too much, with Take back), then what went into the jars this month with Fill now, the jars (a switch for jars, goals
// and completed jars right above their list), and last the amount kept untouched. Every number comes from pagelogic/jars.js, the same as the computer's Jars page.
// A row opens the jar's own screen; + adds a jar.
import { ref, computed, watch, onMounted } from "vue";
import { ask } from "../../core/ask.js";
import { explain } from "../../core/tooltip.js";
import { useJars } from "../../pagelogic/jars.js";
import { keyNums } from "../../core/derived.js";
import AvailWhy from "../../views/AvailWhy.vue";
import MoneyInput from "../../components/MoneyInput.vue";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Segmented from "../components/Segmented.vue";
import ProgressBar from "../components/ProgressBar.vue";
import ProgressRing from "../components/ProgressRing.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, tk, data, M, home, save, ctx, fm, tx, bufText, setBuffer, bufShown, BUF_PRESETS, filling, fill,
  openNew, askDone, doDone, doneAsk, relAmt, doRelease, why, kindOf, stLabel, statTips, col, monthLine, pay, goalLine, doneLine, goalFix, KI,
} = useJars();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.jars." + k, o || {}, n);

// the sentence at the top: safe to put in jars (the same number as "Free to use" on Home and the computer's Jars page),
// or how much the jars hold beyond what the accounts cover
// (right before payday, when the income still to come this month covers it: the jars wait, and what will likely be free after)
const paid = computed(() => (pay.value?.covered ? keyNums.value.payday : null));
const hero = computed(() => {
  const F = M.value.F, over = F.over > 0, k = paid.value ? "payday" : over ? "over" : "safe";
  const [a, b = ""] = P(k, { amount: "\u0000" }).split("\u0000");
  return [{ text: a }, { amount: fm(paid.value ? paid.value.after : over ? F.over : F.free) }, { text: b }];
});

// a tooltip's text, opened by a tap (the computer shows it on hover)

// take back what is too much, mark a reached goal as done: each asks first (the computer's confirm windows)
const askRelease = () => ask(t("jars.takeBack", { amount: fm(relAmt.value) }), t("jars.rel.text", { amount: fm(relAmt.value) }), doRelease, { yes: t("jars.rel.yes") });
const askDoneOf = (g) => {
  askDone(g.id);
  const j = doneAsk.value; if (!j) return;
  ask(t("jars.done.title", { name: tx(j.n) }), t("jars.done.text") + (j.bal > 0 ? " " + t("jars.done.back", { amount: fm(j.bal) }) : ""), doDone, { yes: t("jars.markDone") });
};

// keep untouched: preset amounts or an amount typed in
const keepOpen = ref(false);

// jars, goals, completed
const seg = ref("jars");
const segs = computed(() => [
  { value: "jars", label: P("tabJars") },
  { value: "goals", label: P("tabGoals") },
  ...(M.value?.done.length ? [{ value: "done", label: P("tabDone") }] : []),
]);
watch(() => M.value?.done.length, (n) => { if (!n && seg.value === "done") seg.value = "jars"; });
const open = (id) => nav.push("jar", String(id));
// the status's colour: on its way (acc), waiting for money (warn), nothing to do (plain)
const stTone = (s) => (s.key === "needs" ? "warn" : s.key === "partly" ? "acc" : s.cls === "dn" ? "pos" : "");
const GTONE = { reached: "pos", ontrack: "pos", behind: "warn", saving: "acc", none: "" };
// a goal's line from the computer joins its parts with " · "; on the phone it reads as one plain sentence
const plain = (s) => String(s || "").replace(/ · /g, ", ");
const iso = (s) => "\u2066" + s + "\u2069"; // an amount keeps its order inside a Hebrew sentence
const LOCK = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
</script>

<template>
  <PhoneScreen class="ph-jars">
    <template #actions>
      <IconButton :label="P('newJar')" icon-name="add" @tap="openNew" />
    </template>

    <LoadError v-if="data.error.value && !M" :text="t('jars.loadError')" />
    <SkeletonRows v-else-if="!M" :rows="5" />

    <template v-else>
      <HeroSentence :class="{ over: M.F.over > 0 && !paid }" :parts="hero" :link="t('jars.howWorked')" @link="why = true" />
      <button v-if="M.F.over > 0 && !paid && M.F.inJars > 0" type="button" class="ph-btn tonal ph-jars-back" @click="askRelease">{{ t("jars.takeBack", { amount: fm(relAmt) }) }}</button>

      <!-- this month: what went in of what is planned, what it means, the two numbers that decide it, and Fill now -->
      <section class="ph-group ph-jars-month">
        <div class="ph-group-h"><h3>{{ t("jars.thisMonth") }}</h3></div>
        <div class="ph-group-b">
          <div class="ph-jars-mh">
            <button type="button" class="ph-jars-mv" @click="explain(statTips.putIn)"><b>{{ M.month.planned > 0 ? P("monthOf", { got: iso(fm(M.month.got)), planned: iso(fm(M.month.planned)) }) : iso(fm(M.month.got)) }}</b></button>
            <ProgressBar :value="M.month.pct" :max="100" :tone="M.month.waiting ? 'warn' : 'acc'" :label="t('jars.thisMonth')" />
            <p class="ph-jars-ms" :class="{ warn: M.month.waiting && !paid }">{{ monthLine }}</p>
          </div>
          <ListRow :title="t('jars.still')" @tap="explain(statTips.still)"><template #end><span class="ph-amt">{{ fm(M.month.still) }}</span></template></ListRow>
          <ListRow :title="t('num.free')" @tap="explain(statTips.avail)"><template #end><span class="ph-amt" :class="{ neg: M.month.waiting && !paid }">{{ fm(M.F.free) }}</span></template></ListRow>
          <!-- the screen's one main button while it can do something (jars still need money and there is free money);
               otherwise a quiet button, so it never looks like the thing to press -->
          <div v-if="M.has.any" class="ph-jars-fill"><button type="button" class="ph-btn block" :class="{ plain: M.month.done || M.month.waiting }" :disabled="filling" @click="fill">{{ t("jars.fill") }}</button></div>
        </div>
      </section>

      <!-- the jars: one switch for jars, goals and completed ones, right above their list -->
      <section class="ph-group">
        <div class="ph-group-h"><h3>{{ P("yourJars") }}</h3></div>
        <div class="ph-group-top"><Segmented v-model="seg" :options="segs" :label="t('nav.jars')" /></div>

        <div v-if="seg === 'jars'" class="ph-group-b">
          <ListRow v-for="j in M.jars" :key="j.id" class="ph-jars-row" :title="tx(j.n)" link @tap="open(j.id)">
            <template #lead><ProgressRing class="ph-jars-ring" :value="j.open ? 0 : j.bal" :max="j.open ? 0 : j.need" :size="44" :color="col(j.p)"><PIcon v-if="!j.open && j.pc >= 100" class="ph-jars-ok" :style="{ color: col(j.p) }" name="check" /><span v-else-if="!j.open">{{ j.pc }}%</span><svg v-else class="ph-jars-ki" :style="{ stroke: col(j.p) }" viewBox="0 0 24 24" aria-hidden="true" v-html="KI[j.type]" /></ProgressRing></template>
            <template #sub><span :class="'ph-jars-st ' + stTone(j.state)">{{ stLabel(j.state) }}</span><span>{{ kindOf(j) }}</span></template>
            <template #end><span class="ph-amt">{{ fm(j.bal) }}</span></template>
          </ListRow>
          <p v-if="!M.jars.length" class="ph-jars-none">{{ P("noJars") }}</p>
          <ListRow :title="P('newJar')" icon-name="add" class="ph-jars-add" @tap="openNew" />
        </div>

        <div v-else-if="seg === 'goals'" class="ph-group-b">
          <div v-for="g in M.goals" :key="g.id" class="ph-jars-goal">
            <button type="button" class="ph-row ph-jars-gh" @click="open(g.id)">
              <span class="ph-row-main">
                <span class="ph-row-t">{{ tx(g.n) }}</span>
                <span class="ph-row-s"><span :class="'ph-jars-st ' + GTONE[g.st]">{{ tk("jars.g." + g.st) }}</span><span>{{ t("jars.goalOf", { bal: fm(g.bal), need: fm(g.need), pc: Math.round(g.pc) }).replace(/ · /, ", ") }}</span></span>
              </span>
              <PIcon class="ph-chev" name="chevron" dir />
            </button>
            <div class="ph-jars-gb">
              <ProgressBar :value="g.pc" :max="100" :color="col(g.p)" :label="tx(g.n)" />
              <p class="ph-meta">{{ plain(goalLine(g)) }}</p>
              <button v-if="g.st === 'reached'" type="button" class="ph-btn plain" @click="askDoneOf(g)">{{ t("jars.markDone") }}</button>
              <button v-else-if="g.fix" type="button" class="ph-btn plain" @click="save((s) => goalFix(s, g.id, ctx()))">{{ t("jars.raise", { amount: fm(g.fix) }) }}</button>
            </div>
          </div>
          <p v-if="!M.goals.length" class="ph-jars-none">{{ t("jars.noGoals") }}</p>
          <ListRow :title="P('newGoal')" icon-name="add" class="ph-jars-add" @tap="openNew" />
        </div>

        <div v-else class="ph-group-b">
          <ListRow v-for="d in M.done" :key="d.id" class="ph-jars-done" :title="tx(d.n)" icon-name="check" tone="pos" link @tap="open(d.id)">
            <template #sub><span>{{ doneLine(d) }}</span></template>
          </ListRow>
        </div>
        <p class="ph-group-n">{{ seg === "jars" ? P("jarsNote") : seg === "goals" ? t("jars.goalsNote") : P("doneNote") }}</p>
      </section>

      <!-- money the jars never touch: a setting, so it comes last -->
      <ListGroup :note="t('jars.keepSub')">
        <ListRow :title="t('jars.keep')" :value="M.F.buffer ? fm(M.F.buffer) : t('jars.none')" :icon="LOCK" link @tap="keepOpen = true" />
      </ListGroup>
    </template>

    <PhoneSheet v-if="M" v-model:open="keepOpen" :title="t('jars.keep')">
      <p class="ph-jars-kp">{{ t("jars.keepSub") }} {{ P("keepNote") }}</p>
      <div class="ph-jars-chips" role="radiogroup" :aria-label="t('jars.keep')">
        <button v-for="v in BUF_PRESETS" :key="v" type="button" class="ph-chip" :class="{ on: M.F.buffer == v }" role="radio" :aria-checked="M.F.buffer == v" @click="setBuffer(v)"><PIcon v-if="M.F.buffer == v" name="check" />{{ v ? fm(v) : t("jars.none") }}</button>
      </div>
      <div class="fld ph-jars-kin">
        <label for="ph-jbuf">{{ t("jars.other") }}</label>
        <MoneyInput id="ph-jbuf" :model-value="bufShown" :placeholder="t('jars.other')" :aria-label="t('jars.keepLabel')" @update:model-value="bufText = $event" @change="setBuffer(bufText ?? M.F.buffer)" @keydown.enter="$event.target.blur()" />
      </div>
      <template #foot><button type="button" class="ph-btn" @click="bufText != null && setBuffer(bufText); keepOpen = false">{{ P("done") }}</button></template>
    </PhoneSheet>

    <AvailWhy v-if="home" v-model:open="why" :M="home" />
  </PhoneScreen>
</template>
