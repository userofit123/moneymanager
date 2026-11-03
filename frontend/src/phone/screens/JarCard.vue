<script setup>
// One jar as the computer's jar card: its name and kind, its status pill, its place in line and ⋯ at the top, what it is
// for and the categories it pays for, then the ring with how full it is beside saved, goal, monthly and full by, and a red
// line when it will be late. Used in the Jars screen's sliding row and at the top of a jar's own screen.
// What the computer shows on hover opens in a sheet on a tap. api is useJars().
import { explain } from "../../core/tooltip.js";
import PIcon from "../components/PIcon.vue";
const props = defineProps({ j: { type: Object, required: true }, api: { type: Object, required: true }, open: { type: Boolean, default: false } });
const emit = defineEmits(["open", "more", "pri"]);
const { t, tx, f0, catLabel, payoff, kindOf, stLabel, stBody, catTip, etaShow, etaTip, lateText, ringText, RC, KI, col } = props.api;
const go = () => props.open && emit("open");
</script>

<template>
  <article class="ph-jcard" :class="{ tap: open }" :role="open ? 'button' : null" :tabindex="open ? 0 : null" @click="go" @keydown.enter.self="go">
    <div class="ph-jcard-h">
      <div class="ph-jcard-n">
        <b>{{ tx(j.n) }}</b>
        <span class="ph-jcard-k"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="KI[j.type]" />{{ kindOf(j) }}</span>
      </div>
      <button type="button" class="ph-jcard-i" :aria-label="t('jars.options')" @click.stop="emit('more')"><PIcon name="more" /></button>
    </div>
    <div class="ph-jcard-pills">
      <button type="button" class="bd jst" :class="j.state.cls" @click.stop="explain(stBody(j))">{{ stLabel(j.state) }}<PIcon name="info" /></button>
      <button type="button" class="ph-jcard-pri" :aria-label="t('jars.pick')" @click.stop="emit('pri')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h12l-3 4 3 4H5" /></svg>{{ j.ix + 1 }}<svg class="ph-jcard-dn" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
    </div>
    <div v-if="j.desc" class="jdesc">{{ j.desc }}</div>
    <button v-if="(j.cats || []).length" type="button" class="jcats ph-jcard-cats" @click.stop="explain(catTip(j))"><span>{{ t("jars.paysFor") }}</span><i v-for="x in j.cats" :key="x.c">{{ catLabel(x.c) }}</i></button>
    <div class="ph-jcard-b">
      <svg class="ph-jcard-ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--s2)" stroke-width="9" /><circle cx="42" cy="42" r="34" fill="none" :stroke="col(j.p)" stroke-width="9" stroke-linecap="round" :stroke-dasharray="RC * Math.min(1, j.pc / 100) + ' ' + RC" transform="rotate(-90 42 42)" /><text x="42" y="47" text-anchor="middle" :style="{ fontSize: (j.open ? 13 : 16) + 'px', fontWeight: 650, fill: 'var(--tx)' }">{{ ringText(j) }}</text></svg>
      <div class="ph-jcard-st">
        <div><span>{{ payoff(j) ? t("jars.paidBack") : t("jars.saved") }}</span><b class="ph-amt">₪{{ f0(j.bal) }}</b></div>
        <div><span>{{ payoff(j) ? t("jars.owed") : t("jars.goal") }}</span><b class="ph-amt">{{ j.open ? t("jars.none") : "₪" + f0(j.need) }}</b></div>
        <div><span>{{ t("jars.monthly") }}</span><b class="ph-amt">{{ j.cap == null ? t("jars.topUp") : "₪" + f0(j.capE) }}</b></div>
        <button v-if="j.state.eta" type="button" @click.stop="explain(etaTip(j.state.eta))"><span>{{ t("jars.fullBy") }}<PIcon name="info" /></span><b class="ph-amt">{{ etaShow(j.state.eta) }}</b></button>
      </div>
    </div>
    <div v-if="j.state.late" class="ph-jcard-warn">{{ lateText(j.state.late) }}</div>
  </article>
</template>
