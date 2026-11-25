<script setup>
// Taxes and reports (from More): the computer's page for a phone. List or Calendar on top; the list is the computer's two
// cards (Coming up, Not needed now) with the Bills rows: the paper tile (red while late), the name with Late, the amount
// and To pay / You get back at the end, the last day, the months of money it counts and the missing papers.
// The calendar is the computer's month with the chosen day's items under it. With nothing yet: the ready-made examples.
// Add (+ in the top bar) opens the computer's Add menu as a sheet. An item opens its own screen (/taxes?report=<id>~<date>),
// which holds the computer's report and ⋯ menu. Everything it knows comes from pagelogic/taxes.js, as on the computer.
import { ref, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { useTaxes } from "../../pagelogic/taxes.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Segmented from "../components/Segmented.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import LoadError from "../components/LoadError.vue";
import PIcon from "../components/PIcon.vue";
import "../../styles/pages/taxes.css"; // the computer's calendar days and marks
defineProps({ id: { type: String, default: null } });

const {
  t, S, M, any, nameOf, span, lastText, wantText, isLate, whyQuiet, fm, amountOf, EXG, addEx, addOwn,
  open, openItem, view, cal, calTitle, calWeek, calMove, calToday, calDay, chosen, chosenMarks, longDay, calLabel, openMark, shownYm, ymNow, chev, ICON,
} = useTaxes();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.taxes." + k, o || {}, n);

// an item tapped (or an alert's Open): its report opens as a screen of its own
watch(open, (o) => { if (o) { nav.push("taxReport", o.id + "~" + o.key); open.value = null; } }, { immediate: true });

const VIEWS = ["list", "cal"].map((v) => ({ value: v, label: t("taxes.page.view." + v) }));
// Add: the computer's menu (your own, then the ready-made ones per country) as a sheet
const addOpen = ref(false);
const add = (fn) => { addOpen.value = false; fn(); };
const amt = (r) => amountOf(r.report);
</script>

<template>
  <PhoneScreen class="ph-taxes">
    <template #actions>
      <IconButton v-if="S && any" :label="P('addTitle')" icon-name="add" @tap="addOpen = true" />
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('taxes.page.loadError')" />
    <SkeletonRows v-else-if="!S || !M" :rows="4" />

    <!-- nothing yet: the ready-made examples -->
    <template v-else-if="!any">
      <EmptyState :icon="ICON.doc" :title="t('taxes.page.emptyTitle')" :text="t('taxes.page.emptyText')" />
      <p class="ph-meta ph-tax-pick">{{ t("taxes.page.emptyPick") }}</p>
      <ListGroup v-for="g in EXG" :key="g.c" :title="t('taxes.page.' + g.c)">
        <ListRow v-for="x in g.L" :key="x.ex" :icon="ICON.doc" :title="t(x.nk)" :sub="t('taxes.page.exd.' + x.ex)" @tap="addEx(x.ex)">
          <template #end><PIcon class="ph-tax-plus" name="add" /></template>
        </ListRow>
      </ListGroup>
      <button type="button" class="ph-btn plain block ph-tax-own" @click="addOwn">{{ t("taxes.page.own") }}</button>
    </template>

    <template v-else>
      <Segmented v-model="view" class="ph-tax-seg" :options="VIEWS" :label="t('taxes.page.view.label')" />

      <!-- the calendar: each item's last day and the day I want to do it, month by month -->
      <section v-if="view == 'cal' && cal" class="ph-bgrp ph-tax-cal">
        <header class="ph-bgh">
          <span class="ph-bgi"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.up" /></span>
          <span class="ph-bgt"><b aria-live="polite">{{ calTitle }}</b></span>
          <span class="ph-tax-cnav">
            <button v-if="shownYm != ymNow" type="button" class="ph-btn plain ph-tax-now" @click="calToday">{{ t("taxes.page.cal.thisMonth") }}</button>
            <button type="button" class="ph-ib" :aria-label="t('taxes.page.cal.prev')" @click="calMove(-1)"><svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true"><path :d="chev(false)" /></svg></button>
            <button type="button" class="ph-ib" :aria-label="t('taxes.page.cal.next')" @click="calMove(1)"><svg class="ph-ic" viewBox="0 0 24 24" aria-hidden="true"><path :d="chev(true)" /></svg></button>
          </span>
        </header>
        <div class="tax-cbody">
          <div class="tax-cw" aria-hidden="true"><span v-for="(w, i) in calWeek" :key="i">{{ w }}</span></div>
          <div class="tax-cg">
            <template v-for="c in cal.cells" :key="c.k">
              <i v-if="c.blank" />
              <button v-else type="button" class="tax-cd" :class="{ t: c.today, on: c.k == chosen, has: c.marks.length }" :aria-label="calLabel(c)" :aria-pressed="c.k == chosen" @click="calDay = c.k">
                <span class="tax-cn">{{ c.d }}</span>
                <span class="tax-mk"><i v-for="(m, i) in c.marks.slice(0, 3)" :key="i" :class="[m.kind, m.state]" /></span>
              </button>
            </template>
          </div>
          <div class="tax-lg sm">
            <span><i class="last next" />{{ t("taxes.page.cal.last") }}</span>
            <span><i class="want next" />{{ t("taxes.page.cal.want") }}</span>
            <span><i class="last late" />{{ t("taxes.page.stLate") }}</span>
            <span><i class="last done" />{{ t("taxes.page.stDone") }}</span>
          </div>
        </div>
        <div class="ph-tax-day">
          <template v-if="chosen">
            <div class="ph-tax-dt">{{ longDay(chosen) }}</div>
            <div v-for="(m, i) in chosenMarks" :key="m.item.id + m.kind + i" class="ph-brow" role="button" tabindex="0" @click="openMark(m)" @keydown.enter="openMark(m)">
              <span class="ph-bills-av ph-tax-av" :class="{ late: m.state == 'late' }" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
              <div class="ph-brow-m">
                <div class="ph-brow-t">{{ nameOf(m.item) }}<span v-if="m.state != 'next'" class="ph-bpill" :class="m.state == 'late' ? 'ph-tax-late' : 'ph-tax-done'">{{ m.state == "late" ? t("taxes.page.stLate") : t("taxes.page.stDone") }}</span></div>
                <div class="ph-brow-s">{{ m.kind == "last" ? t("taxes.page.cal.last") : t("taxes.page.cal.want") }} · {{ t("taxes.page.moneyFrom", { span: span(m.period) }) }}</div>
              </div>
            </div>
            <p v-if="!chosenMarks.length" class="ph-meta ph-tax-none">{{ t("taxes.page.cal.none") }}</p>
          </template>
          <p v-else class="ph-meta ph-tax-none">{{ cal.count ? t("taxes.page.cal.pick") : t("taxes.page.cal.empty", { month: calTitle }) }}</p>
        </div>
      </section>

      <template v-else>
        <!-- coming up -->
        <section v-if="M.now.length" class="ph-bgrp">
          <header class="ph-bgh">
            <span class="ph-bgi"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.up" /></span>
            <span class="ph-bgt"><b>{{ t("taxes.page.upTitle") }}</b><span class="ph-bcnt">{{ M.now.length }}</span></span>
            <p class="ph-bgd">{{ t("taxes.page.upDesc") }}</p>
          </header>
          <div v-for="r in M.now" :key="r.item.id" class="ph-brow" role="button" tabindex="0" @click="openItem(r)" @keydown.enter="openItem(r)">
            <span class="ph-bills-av ph-tax-av" :class="{ late: r.late.length }" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="ph-brow-m">
              <div class="ph-brow-l">
                <span class="ph-brow-t">{{ nameOf(r.item) }}<span v-if="r.late.length" class="ph-bpill ph-tax-late">{{ t("taxes.page.lateN", { n: r.late.length }, r.late.length) }}</span></span>
                <span v-if="r.report" class="ph-brow-a"><b v-if="amt(r)" class="ph-amt" dir="ltr">{{ fm(amt(r).n) }}</b><small>{{ !amt(r) ? t("taxes.page.noAmount") : amt(r).back ? t("taxes.page.getBack") : t("taxes.page.toPay") }}</small></span>
              </div>
              <template v-if="r.period">
                <div class="ph-brow-s ph-bdue" :class="isLate(r.period) ? 'late' : ''">{{ lastText(r.period) }}</div>
                <div v-if="wantText(r.period)" class="ph-brow-s">{{ wantText(r.period) }}</div>
                <div class="ph-brow-s">{{ t("taxes.page.moneyFrom", { span: span(r.period) }) }}</div>
              </template>
              <template v-else-if="r.check">
                <div class="ph-brow-s">{{ t("taxes.page.checkLine", { total: fm(r.check.total), limit: fm(r.check.limit), pct: r.check.pct }) }}</div>
                <div class="ph-brow-chips"><span class="ph-bpill ph-tax-chk-p" :class="r.check.over ? 'ph-tax-late' : 'warn'">{{ r.check.over ? t("taxes.page.checkOver") : t("taxes.page.checkNear") }}</span></div>
              </template>
              <div v-if="r.report?.missing.length" class="ph-brow-chips"><span class="ph-bpill warn ph-tax-miss"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.clip" />{{ t("taxes.page.missing", { n: r.report.missing.length }, r.report.missing.length) }}</span></div>
            </div>
          </div>
        </section>

        <!-- not needed now -->
        <section v-if="M.quiet.length" class="ph-bgrp ph-tax-quiet">
          <header class="ph-bgh">
            <span class="ph-bgi"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON.quiet" /></span>
            <span class="ph-bgt"><b>{{ t("taxes.page.quietTitle") }}</b><span class="ph-bcnt">{{ M.quiet.length }}</span></span>
            <p class="ph-bgd">{{ t("taxes.page.quietDesc") }}</p>
          </header>
          <div v-for="r in M.quiet" :key="r.item.id" class="ph-brow" role="button" tabindex="0" @click="openItem(r)" @keydown.enter="openItem(r)">
            <span class="ph-bills-av ph-tax-av quiet" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="ICON.doc" /></span>
            <div class="ph-brow-m">
              <div class="ph-brow-t">{{ nameOf(r.item) }}</div>
              <div class="ph-brow-s">{{ whyQuiet(r) }}</div>
              <div v-if="r.check" class="ph-brow-s">{{ t("taxes.page.checkLine", { total: fm(r.check.total), limit: fm(r.check.limit), pct: r.check.pct }) }}</div>
            </div>
          </div>
        </section>
      </template>
    </template>

    <!-- how the amounts are worked out -->
    <ListGroup v-if="S && M" :title="t('taxes.page.notesTitle')" pad>
      <ul class="ph-tax-notes">
        <li><b>{{ t("taxes.page.noteEstB") }}</b> {{ t("taxes.page.noteEst") }}</li>
        <li><b>{{ t("taxes.page.noteBankB") }}</b> {{ t("taxes.page.noteBank") }}</li>
        <li><b>{{ t("taxes.page.noteYearB") }}</b> {{ t("taxes.page.noteYear") }}</li>
      </ul>
    </ListGroup>

    <!-- Add: your own, or a ready-made one -->
    <PhoneSheet v-model:open="addOpen" :title="P('addTitle')">
      <div class="ph-group-b"><ListRow icon-name="add" :title="t('taxes.page.own')" @tap="add(addOwn)" /></div>
      <ListGroup v-for="g in EXG" :key="g.c" :title="t('taxes.page.menuEx.' + g.c)">
        <ListRow v-for="x in g.L" :key="x.ex" :icon="ICON.doc" :title="t(x.nk)" :sub="t('taxes.page.exd.' + x.ex)" @tap="add(() => addEx(x.ex))" />
      </ListGroup>
    </PhoneSheet>
  </PhoneScreen>
</template>
