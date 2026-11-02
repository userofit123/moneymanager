<script setup>
// One jar (pushed on Jars, /jars?jar=): how full it is, what it is doing this month and why, its details (goal, monthly
// amount, when it will be full, its place in line, the categories it pays for), its goal, and its history, which can be
// narrowed to money put in, taken out or payments. ⋯ holds Edit, move up or down, Mark as done and Delete; a completed jar
// can be opened again. Everything comes from pagelogic/jars.js, the same as the computer's Jars page.
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { ask } from "../../core/ask.js";
import { tipFill, explain } from "../../core/tooltip.js";
import { openTx } from "../../core/txwin.js";
import { useJars } from "../../pagelogic/jars.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Segmented from "../components/Segmented.vue";
import ProgressBar from "../components/ProgressBar.vue";
import ProgressRing from "../components/ProgressRing.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PIcon from "../components/PIcon.vue";

const props = defineProps({ id: { type: String, default: null } });
const {
  t, tk, data, S, M, save, ctx, fm, tx, dstr, catLabel, histOf, noteText, amtText, amtCls, ofKind, allKinds,
  openEdit, askDone, doneAsk, doDone, askDel, delAsk, doDel, payoff, kindOf, stLabel, stBody, catTip, etaShow, etaTip,
  lateText, ringText, KI, col, goalLine, doneLine, goalFix, moveJar, moveJarTo, reopenJar,
} = useJars();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.jars." + k, o || {}, n);

// the jar: an open one (with its status), else a completed one
const jar = computed(() => M.value?.jars.find((x) => String(x.id) === props.id) || null);
const done = computed(() => (jar.value ? null : M.value?.done.find((x) => String(x.id) === props.id) || null));
const goal = computed(() => M.value?.goals.find((x) => String(x.id) === props.id) || null);
const raw = computed(() => (S.value?.jars || []).find((x) => String(x.id) === props.id) || null);
// the jar went away while open (deleted, or an undo of its creation): back to the jars
watch(raw, (x, was) => { if (!x && was) nav.back(); });

// what this month means for it, written out (the computer shows it when the status pill is pointed at)
const stBox = ref(null);
watch([jar, stBox], () => nextTick(() => { if (jar.value && stBox.value) tipFill(stBox.value, stBody(jar.value)); }), { immediate: true });
// a tooltip's text, opened by a tap

// its history, narrowed by kind
const kind = ref("all");
const hist = computed(() => (raw.value ? histOf(raw.value.id) : []));
const shown = computed(() => ofKind(hist.value, kind.value));

// priority: the place in line, picked from the list
const pickPri = ref(false);
const priOptions = computed(() => (M.value?.jars || []).map((x, k) => ({ value: k + 1, label: k + 1 + ". " + tx(x.n) })));

// ⋯ and the questions before a change
const more = ref(false);
const askDoneHere = () => {
  askDone(raw.value.id);
  const j = doneAsk.value; if (!j) return;
  ask(t("jars.done.title", { name: tx(j.n) }), t("jars.done.text") + (j.bal > 0 ? " " + t("jars.done.back", { amount: fm(j.bal) }) : ""), doDone, { yes: t("jars.markDone") });
};
const askDelHere = () => {
  askDel(raw.value.id);
  const j = delAsk.value; if (!j) return;
  ask(t("jars.del.title", { name: tx(j.n) }), t("jars.del.text"), doDel, { danger: true, yes: t("jars.menu.del") });
};
const ICON = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  done: '<path d="M5 12l5 5L20 7"/>', del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  reopen: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
};
const actions = computed(() => {
  const j = jar.value;
  if (!j) return done.value ? [{ label: t("jars.reopen"), icon: ICON.reopen, run: () => save((s) => reopenJar(s, done.value.id)) }] : [];
  return [
    { label: t("jars.menu.edit"), icon: ICON.edit, run: () => openEdit(j.id) },
    ...(j.ix > 0 ? [{ label: t("jars.up"), icon: ICON.up, run: () => save((s) => moveJar(s, j.id, true)) }] : []),
    ...(j.ix < M.value.jars.length - 1 ? [{ label: t("jars.down"), icon: ICON.down, run: () => save((s) => moveJar(s, j.id, false)) }] : []),
    { label: t("jars.markDone"), icon: ICON.done, run: askDoneHere },
    { label: t("jars.menu.del"), icon: ICON.del, danger: true, run: askDelHere },
  ];
});

const GTONE = { reached: "pos", ontrack: "pos", behind: "warn", saving: "acc", none: "" };
const stTone = (s) => (s.key === "needs" ? "warn" : s.key === "partly" ? "acc" : s.cls === "dn" ? "pos" : "");
</script>

<template>
  <PhoneScreen :large="false" class="ph-jar">
    <template #actions>
      <IconButton v-if="jar || done" :label="P('more')" icon-name="more" @tap="more = true" />
    </template>

    <SkeletonRows v-if="!M" :rows="4" />
    <EmptyState v-else-if="!jar && !done" icon-name="search" :title="P('gone')" :text="P('goneSub')" />

    <!-- an open jar -->
    <template v-else-if="jar">
      <header class="ph-jar-hero">
        <ProgressRing class="ph-jar-ring" :value="jar.open ? 0 : jar.bal" :max="jar.open ? 0 : jar.need" :size="104" :color="col(jar.p)" :label="ringText(jar)">
          <span class="ph-jar-pc">{{ jar.open ? "" : Math.min(999, jar.pc) + "%" }}</span>
          <svg v-if="jar.open" class="ph-jar-ki" :style="{ stroke: col(jar.p) }" viewBox="0 0 24 24" aria-hidden="true" v-html="KI[jar.type]" />
        </ProgressRing>
        <b class="ph-jar-amt">{{ fm(jar.bal) }}</b>
        <h1 class="ph-jar-name">{{ tx(jar.n) }}</h1>
        <!-- one plain line: what the amount is, and of how much -->
        <p class="ph-jar-sub">{{ jar.open ? (payoff(jar) ? t("jars.paidBack") : t("jars.saved")) : P(payoff(jar) ? "paidOfOwed" : "savedOfGoal", { amount: fm(jar.need) }) }}</p>
        <p class="ph-jar-kind"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="KI[jar.type]" />{{ kindOf(jar) }}</p>
        <p v-if="jar.desc" class="ph-jar-desc">{{ jar.desc }}</p>
      </header>

      <section class="ph-group ph-jar-status">
        <div class="ph-group-h"><h3>{{ P("status") }}</h3><span class="ph-jar-pill" :class="stTone(jar.state)">{{ stLabel(jar.state) }}</span></div>
        <div class="ph-group-b">
          <div ref="stBox" class="tip rich on ph-tipbox ph-jar-tip" />
        </div>
        <p v-if="jar.state.late" class="ph-group-n ph-jar-late">{{ lateText(jar.state.late) }}</p>
      </section>

      <ListGroup :title="P('details')" :note="P('priorityNote')">
        <ListRow :title="t('jars.monthly')" :value="jar.cap == null ? t('jars.topUp') : fm(jar.capE)" />
        <ListRow v-if="jar.state.eta" :title="t('jars.fullBy')" link @tap="explain(etaTip(jar.state.eta))">
          <template #end><span class="ph-row-v">{{ etaShow(jar.state.eta) }}</span></template>
        </ListRow>
        <ListRow :title="t('jars.pick')" :value="P('priorityOf', { n: jar.ix + 1, total: M.jars.length })" link @tap="pickPri = true" />
        <ListRow v-if="(jar.cats || []).length" :title="t('jars.paysFor')" link @tap="explain(catTip(jar))">
          <template #end><span class="ph-row-v ph-jar-cats">{{ jar.cats.map((x) => catLabel(x.c)).join(", ") }}</span></template>
        </ListRow>
      </ListGroup>

      <section v-if="goal" class="ph-group ph-jar-goal">
        <div class="ph-group-h"><h3>{{ P("goalTitle") }}</h3><span class="ph-jar-pill" :class="GTONE[goal.st]">{{ tk("jars.g." + goal.st) }}</span></div>
        <div class="ph-group-b ph-jar-gb">
          <ProgressBar :value="goal.pc" :max="100" :color="col(goal.p)" :label="tx(goal.n)" />
          <p>{{ goalLine(goal).replace(/ · /g, ", ") }}</p>
          <!-- the screen's one main button (everything else is in ⋯) -->
          <button v-if="goal.st === 'reached'" type="button" class="ph-btn block" @click="askDoneHere">{{ t("jars.markDone") }}</button>
          <button v-else-if="goal.fix" type="button" class="ph-btn block" @click="save((s) => goalFix(s, goal.id, ctx()))">{{ t("jars.raise", { amount: fm(goal.fix) }) }}</button>
        </div>
      </section>
    </template>

    <!-- a completed jar -->
    <template v-else>
      <header class="ph-jar-hero">
        <span class="ph-jar-donec"><PIcon name="check" /></span>
        <b v-if="done.count" class="ph-jar-amt">{{ fm(done.paid) }}</b>
        <h1 class="ph-jar-name">{{ tx(done.n) }}</h1>
        <p v-if="done.count" class="ph-jar-sub"><span>{{ P("paidOut") }}</span></p>
        <p class="ph-jar-desc">{{ doneLine(done) }}</p>
        <p v-if="done.desc" class="ph-jar-desc">{{ done.desc }}</p>
        <button type="button" class="ph-btn ph-jar-reopen" @click="save((s) => reopenJar(s, done.id))">{{ t("jars.reopen") }}</button>
      </header>
    </template>

    <section v-if="M && raw" class="ph-group ph-jar-hist">
      <div class="ph-group-h"><h3>{{ P("history") }}</h3></div>
      <Segmented v-if="hist.length" v-model="kind" :options="allKinds" :label="t('jars.hist.show')" />
      <div class="ph-group-b">
        <component :is="h.pay ? 'button' : 'div'" v-for="(h, i) in shown" :key="i" :type="h.pay ? 'button' : undefined" class="ph-row ph-two ph-jar-h" @click="h.pay && openTx(h.id)">
          <span class="ph-row-main">
            <span class="ph-row-t">{{ noteText(h) }}</span>
            <span class="ph-row-s">{{ h.earlier ? t("jars.hist.earlier") : dstr(h.d) }}</span>
          </span>
          <span class="ph-row-end"><span class="ph-amt" :class="amtCls(h)" dir="ltr">{{ amtText(h) }}</span><PIcon v-if="h.pay" class="ph-chev" name="chevron" dir /></span>
        </component>
        <p v-if="!shown.length" class="ph-jar-none">{{ hist.length ? t("jars.hist.noneHere") : P("noHistory") }}</p>
      </div>
    </section>

    <PickerSheet v-if="jar" :open="pickPri" required :title="t('jars.pick')" :options="priOptions" :model-value="jar.ix + 1" @update:open="pickPri = $event" @update:model-value="(v) => save((s) => moveJarTo(s, jar.id, +v))" />
    <ActionSheet v-model:open="more" :title="raw ? tx(raw.n) : ''" :actions="actions" />
  </PhoneScreen>
</template>
