<script setup>
// Jars (tab): the computer's Jars page for a phone, block by block in the same order: the summary (free to use, with
// "How is this worked out?" and Take back when the jars hold too much; what went into the jars this month with its bar
// and three numbers), the amount kept untouched, the jars as the computer's jar cards in a sliding row (Fill now and
// New jar at the heading), the goals with their bars and buttons, and the completed jars. Every number comes from
// pagelogic/jars.js, the same as the computer. What the computer shows on hover opens in a sheet on a tap.
// A jar card opens the jar's own screen; its ⋯ holds Edit, move up or down, Mark as done and Delete.
import { ref, computed, onMounted } from "vue";
import { ask } from "../../core/ask.js";
import { explain } from "../../core/tooltip.js";
import { useJars } from "../../pagelogic/jars.js";
import AvailWhy from "../../views/AvailWhy.vue";
import MoneyInput from "../../components/MoneyInput.vue";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import SwipeCards from "../components/SwipeCards.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
import JarCard from "./JarCard.vue";
import { jarActions, askDoneOf } from "./jarParts.js";
defineProps({ id: { type: String, default: null } });

const J = useJars();
const {
  t, tk, data, M, home, save, ctx, fm, f0, tx, bufText, setBuffer, bufShown, BUF_PRESETS, filling, fill,
  openNew, relAmt, doRelease, why, statTips, col, monthLine, pay, goalLine, GCLS, doneLine, goalFix, moveJarTo, reopenJar,
} = J;
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.jars." + k, o || {}, n);
const open = (id) => nav.push("jar", String(id));

// take back what is too much: asks first (the computer's confirm window)
const askRelease = () => ask(t("jars.takeBack", { amount: fm(relAmt.value) }), t("jars.rel.text", { amount: fm(relAmt.value) }), doRelease, { yes: t("jars.rel.yes") });

// a jar card's ⋯ and its place in line (the computer's ⋯ menu and its priority pill)
const moreOf = ref(null), priOf = ref(null), moreOpen = ref(false), priOpen = ref(false);
const showMore = (id) => { moreOf.value = id; moreOpen.value = true; };
const showPri = (id) => { priOf.value = id; priOpen.value = true; };
const setPri = (v) => { const j = priJar.value; if (j) save((s) => moveJarTo(s, j.id, +v)); };
const moreJar = computed(() => M.value?.jars.find((x) => x.id === moreOf.value) || null);
const priJar = computed(() => M.value?.jars.find((x) => x.id === priOf.value) || null);
const actions = computed(() => (moreJar.value ? jarActions(J, moreJar.value) : []));
const priOptions = computed(() => (M.value?.jars || []).map((x, k) => ({ value: k + 1, label: k + 1 + " · " + tx(x.n) })));
</script>

<template>
  <PhoneScreen class="ph-jars">
    <LoadError v-if="data.error.value && !M" :text="t('jars.loadError')" />
    <SkeletonRows v-else-if="!M" :rows="5" />

    <template v-else>
      <!-- the computer's summary: free to use, then this month, one under the other -->
      <section class="jhero ph-jars-hero">
        <div class="jh1">
          <button type="button" class="ph-jars-lbl" @click="explain(statTips.avail)"><span class="lbl">{{ t("num.free") }}</span><PIcon name="info" /></button>
          <div class="val"><small>₪</small><bdi dir="ltr">{{ f0(M.F.free) }}</bdi></div>
          <div class="sm">{{ t("jars.safeSub") }}</div>
          <div v-if="pay?.covered" class="ph-jars-pay"><button type="button" @click="explain(pay.tip)"><b>{{ pay.after }}</b></button> {{ pay.note }}</div>
          <div v-else-if="M.F.over > 0" class="ph-jars-over"><b>{{ t("jars.tooMuch", { amount: fm(M.F.over) }) }}</b> {{ t("jars.tooMuchText") }}<template v-if="pay"> {{ pay.note }}</template>
            <button v-if="relAmt > 0" type="button" class="ph-btn ph-jars-sbtn" @click="askRelease">{{ t("jars.takeBack", { amount: fm(relAmt) }) }}</button>
          </div>
          <button type="button" class="ph-btn plain ph-jars-sbtn" @click="why = true">{{ t("jars.howWorked") }}</button>
        </div>
        <div class="jh2">
          <button type="button" class="ph-jars-lbl" @click="explain(statTips.putIn)"><span class="lbl">{{ t("jars.thisMonth") }}</span><PIcon name="info" /></button>
          <div class="val"><small>₪</small><bdi dir="ltr">{{ f0(M.month.got) }}</bdi><span v-if="M.month.planned > 0" class="of">{{ " " + t("jars.of", { amount: fm(M.month.planned) }) }}</span></div>
          <div class="jbar"><i :class="M.month.waiting ? 'w' : M.month.done ? 'd' : ''" :style="{ width: M.month.pct + '%' }" /></div>
          <div class="sm">{{ monthLine }}</div>
          <div class="jstats">
            <button type="button" @click="explain(statTips.putIn)"><span>{{ t("jars.putIn") }}</span><b class="ph-amt">{{ fm(M.month.got) }}</b></button>
            <button type="button" @click="explain(statTips.still)"><span>{{ t("jars.still") }}</span><b class="ph-amt">{{ fm(M.month.still) }}</b></button>
            <button type="button" @click="explain(statTips.avail)"><span>{{ t("num.free") }}</span><b class="ph-amt" :class="{ neg: M.month.waiting && !pay?.covered }">{{ fm(M.F.free) }}</b></button>
          </div>
        </div>
      </section>

      <!-- money the jars never touch: the computer's card with its amounts and "Other amount" -->
      <section class="ph-card ph-jars-keep">
        <b>{{ t("jars.keep") }}</b>
        <p>{{ t("jars.keepSub") }}</p>
        <div class="ph-jars-chips" role="radiogroup" :aria-label="t('jars.keep')">
          <button v-for="v in BUF_PRESETS" :key="v" type="button" class="ph-chip" :class="{ on: M.F.buffer == v }" role="radio" :aria-checked="M.F.buffer == v" @click="setBuffer(v)">{{ v ? fm(v) : t("jars.none") }}</button>
        </div>
        <div class="ph-jars-kin"><span>₪</span><MoneyInput id="ph-jbuf" :model-value="bufShown" :placeholder="t('jars.other')" :aria-label="t('jars.keepLabel')" @update:model-value="bufText = $event" @change="setBuffer(bufText ?? M.F.buffer)" @keydown.enter="$event.target.blur()" /></div>
      </section>

      <!-- the jars: the computer's jar cards, sliding sideways -->
      <ListGroup :title="t('jars.jars')" bare>
        <template #head>
          <span class="ph-jars-hb">
            <button v-if="M.has.any" type="button" class="ph-btn plain ph-jars-sbtn" :disabled="filling" @click="fill">{{ t("jars.fill") }}</button>
            <button type="button" class="ph-btn plain ph-jars-sbtn" @click="openNew"><PIcon name="add" />{{ P("newJar") }}</button>
          </span>
        </template>
        <SwipeCards v-if="M.jars.length" :count="M.jars.length" class="ph-jars-cards">
          <JarCard v-for="j in M.jars" :key="j.id" :j="j" :api="J" open @open="open(j.id)" @more="showMore(j.id)" @pri="showPri(j.id)" />
        </SwipeCards>
        <p v-else class="ph-card ph-jars-none">{{ P("noJars") }}</p>
      </ListGroup>

      <!-- goals: the note, then each goal's name, badge, bar, line and button -->
      <ListGroup :title="t('jars.goals')" pad>
        <template #head><button type="button" class="ph-btn plain ph-jars-sbtn" @click="openNew"><PIcon name="add" />{{ P("newGoal") }}</button></template>
        <template #top><p class="ph-jars-gnote">{{ t("jars.goalsNote") }}</p></template>
        <div v-for="g in M.goals" :key="g.id" class="ph-jars-goal">
          <button type="button" class="ph-jars-gh" @click="open(g.id)">
            <span class="ph-jars-gn"><b>{{ tx(g.n) }}</b><span class="ph-amt">{{ t("jars.goalOf", { bal: fm(g.bal), need: fm(g.need), pc: Math.round(g.pc) }) }}</span></span>
            <span class="bd" :class="GCLS[g.st]">{{ tk("jars.g." + g.st) }}</span>
          </button>
          <div class="bar"><i :style="{ width: g.pc + '%', background: col(g.p) }" /></div>
          <p class="ph-meta">{{ goalLine(g) }}</p>
          <button v-if="g.st === 'reached'" type="button" class="ph-btn ph-jars-sbtn" @click="askDoneOf(J, g.id)">{{ t("jars.markDone") }}</button>
          <button v-else-if="g.fix" type="button" class="ph-btn ph-jars-sbtn" @click="save((s) => goalFix(s, g.id, ctx()))">{{ t("jars.raise", { amount: fm(g.fix) }) }}</button>
        </div>
        <p v-if="!M.goals.length" class="ph-meta">{{ t("jars.noGoals") }}</p>
      </ListGroup>

      <!-- completed jars: what each did, its history (its own screen) and Reopen -->
      <ListGroup v-if="M.done.length" :title="t('jars.completed')" pad>
        <template #head><span class="ph-jars-cnt">{{ M.done.length }}</span></template>
        <div v-for="d in M.done" :key="d.id" class="ph-jars-goal">
          <b>{{ tx(d.n) }}</b>
          <p class="ph-meta">{{ doneLine(d) }}</p>
          <p v-if="d.desc" class="ph-meta">{{ d.desc }}</p>
          <span class="ph-jars-db">
            <button type="button" class="ph-btn plain ph-jars-sbtn" @click="open(d.id)">{{ t("jars.historyBtn") }}</button>
            <button type="button" class="ph-btn plain ph-jars-sbtn" @click="save((s) => reopenJar(s, d.id))">{{ t("jars.reopen") }}</button>
          </span>
        </div>
      </ListGroup>
    </template>

    <ActionSheet v-model:open="moreOpen" :title="moreJar ? tx(moreJar.n) : ''" :actions="actions" />
    <PickerSheet v-if="M" v-model:open="priOpen" required :title="t('jars.pick')" :options="priOptions" :model-value="priJar ? priJar.ix + 1 : null" @update:model-value="setPri" />
    <AvailWhy v-if="home" v-model:open="why" :M="home" />
  </PhoneScreen>
</template>
