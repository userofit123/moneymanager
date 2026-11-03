<script setup>
// One jar (pushed on Jars, /jars?jar=): what the computer shows for one jar, as a screen. On top the computer's jar card
// (status, place in line, ⋯ with Edit, move up or down, Mark as done and Delete; ring and numbers), then its line from
// the computer's Goals list (badge, bar, line and button), then its history as the computer's "See all" window, narrowed
// to money put in, taken out or payments. A completed jar shows its line from the computer's Completed list with
// Reopen, then its history. Everything comes from pagelogic/jars.js, the same as the computer's Jars page.
import { ref, computed, watch, onMounted } from "vue";
import { openTx } from "../../core/txwin.js";
import { useJars } from "../../pagelogic/jars.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import Segmented from "../components/Segmented.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PIcon from "../components/PIcon.vue";
import JarCard from "./JarCard.vue";
import { jarActions, askDoneOf } from "./jarParts.js";

const props = defineProps({ id: { type: String, default: null } });
const J = useJars();
const { t, tk, data, S, M, save, ctx, fm, tx, dstr, histOf, noteText, amtText, amtCls, ofKind, allKinds, col, goalLine, GCLS, doneLine, goalFix, moveJarTo, reopenJar } = J;
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

// its history, narrowed by kind (the computer's "See all" window)
const kind = ref("all");
const hist = computed(() => (raw.value ? histOf(raw.value.id) : []));
const shown = computed(() => ofKind(hist.value, kind.value));

// ⋯ and the place in line (the computer's ⋯ menu and its priority pill)
const more = ref(false), pickPri = ref(false);
const actions = computed(() => (jar.value ? jarActions(J, jar.value) : []));
const priOptions = computed(() => (M.value?.jars || []).map((x, k) => ({ value: k + 1, label: k + 1 + " · " + tx(x.n) })));
</script>

<template>
  <PhoneScreen :large="false" class="ph-jar">
    <SkeletonRows v-if="!M" :rows="4" />
    <EmptyState v-else-if="!jar && !done" icon-name="search" :title="P('gone')" :text="P('goneSub')" />

    <!-- an open jar: the computer's jar card, then its goal -->
    <template v-else-if="jar">
      <JarCard class="ph-jar-card" :j="jar" :api="J" @more="more = true" @pri="pickPri = true" />

      <ListGroup v-if="goal" :title="P('goalTitle')" pad>
        <div class="ph-jar-goal">
          <div class="ph-jar-gh">
            <span class="ph-jar-gn"><b>{{ tx(goal.n) }}</b><span class="ph-amt">{{ t("jars.goalOf", { bal: fm(goal.bal), need: fm(goal.need), pc: Math.round(goal.pc) }) }}</span></span>
            <span class="bd" :class="GCLS[goal.st]">{{ tk("jars.g." + goal.st) }}</span>
          </div>
          <div class="bar"><i :style="{ width: goal.pc + '%', background: col(goal.p) }" /></div>
          <p class="ph-meta">{{ goalLine(goal) }}</p>
          <button v-if="goal.st === 'reached'" type="button" class="ph-btn block" @click="askDoneOf(J, goal.id)">{{ t("jars.markDone") }}</button>
          <button v-else-if="goal.fix" type="button" class="ph-btn block" @click="save((s) => goalFix(s, goal.id, ctx()))">{{ t("jars.raise", { amount: fm(goal.fix) }) }}</button>
        </div>
      </ListGroup>
    </template>

    <!-- a completed jar: its line from the computer's Completed list -->
    <section v-else class="ph-card ph-jar-done">
      <span class="ph-jar-donec"><PIcon name="check" /></span>
      <b class="ph-jar-dn">{{ tx(done.n) }}</b>
      <p class="ph-meta">{{ doneLine(done) }}</p>
      <p v-if="done.desc" class="ph-meta">{{ done.desc }}</p>
      <button type="button" class="ph-btn plain block" @click="save((s) => reopenJar(s, done.id))">{{ t("jars.reopen") }}</button>
    </section>

    <ListGroup v-if="M && raw" :title="t('jars.historyBtn')" class="ph-jar-hist">
      <template v-if="hist.length" #top><Segmented v-model="kind" :options="allKinds" :label="t('jars.hist.show')" /></template>
      <component :is="h.pay ? 'button' : 'div'" v-for="(h, i) in shown" :key="kind + i" :type="h.pay ? 'button' : undefined" class="ph-row ph-two ph-jar-h" @click="h.pay && openTx(h.id)">
        <span class="ph-row-main">
          <span class="ph-row-t">{{ noteText(h) }}</span>
          <span class="ph-row-s">{{ h.earlier ? t("jars.hist.earlier") : dstr(h.d) }}</span>
        </span>
        <span class="ph-row-end"><span class="ph-amt" :class="amtCls(h)" dir="ltr">{{ amtText(h) }}</span><PIcon v-if="h.pay" class="ph-chev" name="chevron" dir /></span>
      </component>
      <p v-if="!shown.length" class="ph-jar-none">{{ hist.length ? t("jars.hist.noneHere") : t("jars.hist.none") }}</p>
    </ListGroup>

    <PickerSheet v-if="jar" :open="pickPri" required :title="t('jars.pick')" :options="priOptions" :model-value="jar.ix + 1" @update:open="pickPri = $event" @update:model-value="(v) => save((s) => moveJarTo(s, jar.id, +v))" />
    <ActionSheet v-model:open="more" :title="raw ? tx(raw.n) : ''" :actions="actions" />
  </PhoneScreen>
</template>
