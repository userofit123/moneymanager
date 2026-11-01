<script setup>
// Activity (tab): every transaction, with search, filters, grouping and sorting, the totals of what is shown, and Needs review.
// All the page's logic is the computer's (pagelogic/activity.js); this file only draws it for the phone.
// A row opens its transaction; swipe it (or press and hold) to change its category and more.
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated, onDeactivated } from "vue";
import { data } from "../../stores/data.js";
import { dcell, dshort, dstr } from "../../dates.js";
import { openDocs } from "../../core/docs.js";
import { openForm } from "../../core/forms.js";
import { run } from "../../core/txact.js";
import { catLabel } from "../../core/cats.js";
import * as A from "../../lib/txactions.js";
import { amtText, SYM, CHIP_ICON } from "../../lib/txrows.js";
import { fm, f0 } from "../../format.js";
import { useActivity } from "../../pagelogic/activity.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import Segmented from "../components/Segmented.vue";
import SearchField from "../components/SearchField.vue";
import ChipBar from "../components/ChipBar.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import SwipeRow from "../components/SwipeRow.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import BaseButton from "../../components/BaseButton.vue";
import ExportPanel from "../../components/ExportPanel.vue";
import EmText from "../../components/EmText.vue";
import "../../styles/pages/activity.css"; // the Export window's own styles (shared with the computer)
defineProps({ id: { type: String, default: null } });

const {
  t, PAGE, today, S, K, name, tab, f, group, sort, focus, shownCount, closed, clear, exportFrom, rows, T, filtered, gkey, visibleGroups, visibleRows,
  more, rangeOpts, groupOpts, sortOpts, typeOpts, cats, catOpts, srcOpts, tagOpts, groupLabel, isXf, isPos, avStyle, chips,
  openRow, setCat, setBillCat, goCat, goTag, loN, sumTip, grpParts, revXf, revDups, revGaps, reviewCount, gapWhen, gapAmt, gapKey, gapOrig, gapB,
  gapCall, gapNote, gapAdd,
} = useActivity();

// ---- the top: All / Needs review, search, filter chips ----
const segs = computed(() => [{ value: "all", label: t("activity.all") }, { value: "rev", label: t("activity.review") + (reviewCount.value ? " " + reviewCount.value : "") }]);
// Export is a sheet on the phone, not a tab: a page that asks for it (goActivity with tab "exp") opens the sheet over All
const expOpen = ref(false);
watch(tab, (v) => { if (v === "exp") { tab.value = "all"; expOpen.value = true; } }, { immediate: true });

const labelOf = (opts, v) => opts.find((o) => o.value === v)?.label || "";
const chipList = computed(() => [
  { id: "p", label: t("activity.timeFrame"), value: f.value.p !== "all" ? labelOf(rangeOpts.value, f.value.p) : "" },
  { id: "cat", label: t("activity.category"), value: f.value.cat ? labelOf(catOpts.value, f.value.cat) : "" },
  { id: "src", label: t("activity.source"), value: f.value.src ? labelOf(srcOpts.value, f.value.src) : "" },
  { id: "type", label: t("activity.typeLabel"), value: f.value.type ? labelOf(typeOpts.value, f.value.type) : "" },
  { id: "tag", label: t("activity.tag"), value: f.value.tag ? "#" + f.value.tag : "" },
]);
const picker = ref(""); // the filter whose list is open
const PICK = computed(() => ({
  p: { title: t("activity.timeFrame"), options: rangeOpts.value },
  cat: { title: t("activity.category"), options: catOpts.value.slice(1) },
  src: { title: t("activity.source"), options: srcOpts.value.slice(1) },
  type: { title: t("activity.typeLabel"), options: typeOpts.value.slice(1) },
  tag: { title: t("activity.tag"), options: tagOpts.value.slice(1) },
  group: { title: t("activity.groupBy"), options: groupOpts.value },
  sort: { title: t("activity.sortBy"), options: sortOpts.value },
}));
const pickVal = computed(() => (picker.value === "group" ? group.value : picker.value === "sort" ? sort.value : picker.value ? f.value[picker.value] || null : null));
const pickOpen = computed({ get: () => !!picker.value, set: (v) => { if (!v) picker.value = ""; } });
function picked(v) {
  const k = picker.value;
  if (k === "group") group.value = v || "month";
  else if (k === "sort") sort.value = v || "new";
  else if (k === "p") { if (v === "custom") { picker.value = ""; openDates(); return; } f.value = { ...f.value, p: v || "all", from: "", to: "" }; }
  else f.value = { ...f.value, [k]: v || "" };
}
const clearChip = (k) => { f.value = k === "p" ? { ...f.value, p: "all", from: "", to: "" } : { ...f.value, [k]: "" }; };

// "Custom range": two dates, with the phone's own date pickers
const dates = ref(null);
const openDates = () => { dates.value = { from: f.value.p === "custom" ? f.value.from : "", to: f.value.p === "custom" ? f.value.to : "" }; };
function applyDates() {
  let { from, to } = dates.value; if (!from) return; to = to || from; if (to < from) [from, to] = [to, from];
  f.value = { ...f.value, p: "custom", from, to }; dates.value = null;
}

// ---- the ⋯ menu: group, sort, export ----
const optsOpen = ref(false);
const optActs = computed(() => [
  { label: t("activity.groupBy"), value: t("phone.activity.groupV." + group.value), run: () => (picker.value = "group") },
  { label: t("activity.sortBy"), value: labelOf(sortOpts.value, sort.value), run: () => (picker.value = "sort") },
  { label: t("txw.a.exp"), run: () => (expOpen.value = true) },
]);

// ---- the sentence: what went out and what came in, for what is shown ----
function sentence(key, vals) {
  // each amount is marked by its name between two \u0001 (names, not numbers: Hebrew texts isolate numbers), then set large
  const marks = Object.fromEntries(Object.keys(vals).map((k) => [k, "\u0001" + k + "\u0001"]));
  return t(key, marks).split("\u0001").map((s, i) => (i % 2 ? { amount: vals[s] } : { text: s })).filter((p) => p.amount != null || p.text);
}
const hero = computed(() => {
  const o = T.value.out >= 1, i = T.value.inc >= 1;
  if (o && i) return sentence("phone.activity.hero", { out: fm(T.value.out), in: fm(T.value.inc) });
  if (i) return sentence("phone.activity.heroIn", { in: fm(T.value.inc) });
  return sentence("phone.activity.heroOut", { out: fm(T.value.out) });
});
const howOpen = ref(false);

// ---- the list ----
const lists = computed(() => visibleGroups.value || [{ key: "", rows: visibleRows.value }]);
const toggle = (g) => { const k = gkey(g), s = new Set(closed.value); s.has(k) ? s.delete(k) : s.add(k); closed.value = s; };
const loading = computed(() => !S.value && data.loading.value);
// where a row's money moved: the account it left or reached
const acct = (x) => String((x.a > 0 ? x.to : x.from) || "").replace(/<[^>]*>/g, "").trim();
// a row's date: day and month this year, with the year before that
const day = (x) => (String(x.d).slice(0, 4) === today.value.slice(0, 4) ? dshort(x.d) : dcell(x.d));
const canCat = (x) => x.upBill != null || !((x.virtual && !x.upInst) || isXf(x));

// change a row's category in a list sheet
const catFor = ref(null);
const catOptions = computed(() => [{ value: "", label: t("activity.uncategorized") }, ...cats.value.map((c) => ({ value: c, label: catLabel(c) }))]);
const catNow = computed(() => (catFor.value && catFor.value.c && catFor.value.c !== "Uncategorized" ? catFor.value.c : ""));
const catOpen = computed({ get: () => !!catFor.value, set: (v) => { if (!v) catFor.value = null; } });
function catPicked(v) { const x = catFor.value; if (!x) return; if (x.upBill != null) setBillCat(x, v || ""); else setCat(x, v || ""); catFor.value = null; }
const swipeActs = (x) => (canCat(x) ? [{ label: t("activity.category"), tone: "acc", run: () => (catFor.value = x) }] : []);

// press and hold (or the context menu): every action of the row in one list
const held = ref(null);
const heldActs = computed(() => {
  const x = held.value; if (!x) return [];
  return [
    { label: t("phone.activity.open"), run: () => openRow(x) },
    ...(canCat(x) ? [{ label: t("phone.activity.changeCat"), run: () => (catFor.value = x) }] : []),
    ...(x.docs?.length ? [{ label: t("txw.a.attachN", { n: x.docs.length }, x.docs.length), run: () => openDocs(x.id) }] : []),
    ...(x.c && !x.balUpd ? [{ label: t("phone.activity.onlyCat"), run: () => goCat(x.c) }] : []),
    ...(x.tags || []).map((g) => ({ label: t("phone.activity.onlyTag", { tag: g }), run: () => goTag(g) })),
  ];
});
const heldOpen = computed({ get: () => !!held.value, set: (v) => { if (!v) held.value = null; } });

// endless list: the next page of rows loads when the end of the list comes into view
const endEl = ref(null);
let io = null;
const watchEnd = () => { io?.disconnect(); if (!endEl.value) return; io = new IntersectionObserver(([e]) => { if (e.isIntersecting && more.value > 0) shownCount.value += PAGE; }, { rootMargin: "600px 0px" }); io.observe(endEl.value); };
watch(endEl, watchEnd);
onMounted(watchEnd); onActivated(watchEnd);
onDeactivated(() => io?.disconnect()); onBeforeUnmount(() => io?.disconnect());

// ---- Needs review ----
const revEmpty = computed(() => !revXf.value.length && !revDups.value.length && !revGaps.value.length);
</script>

<template>
  <PhoneScreen refresh class="ph-actv">
    <template #actions>
      <IconButton :label="t('phone.activity.options')" icon-name="more" @tap="optsOpen = true" />
      <IconButton :label="t('phone.shell.open.activity')" icon-name="add" @tap="openForm('tx')" />
    </template>
    <template #head>
      <div class="ph-actv-head">
        <Segmented v-model="tab" :options="segs" :label="t('activity.title')" />
        <template v-if="tab === 'all'">
          <SearchField v-model="f.q" :placeholder="t('activity.search')" />
          <ChipBar :chips="chipList" @open="picker = $event" @clear="clearChip" />
        </template>
      </div>
    </template>

    <!-- All activity -->
    <template v-if="tab === 'all'">
      <div v-if="focus" class="ph-actv-focus">
        <span class="ph-row-main"><b>{{ t("txw.a.focusN", { n: rows.length }, rows.length) }}</b><span class="ph-row-s ph-wrap">{{ t("txw.a.focusText", { label: focus.label }) }}</span></span>
        <button type="button" class="ph-btn tonal ph-sm" @click="focus = null">{{ t("txw.a.focusAll") }}</button>
      </div>

      <SkeletonRows v-if="loading" :rows="6" />
      <EmptyState v-else-if="!rows.length" icon-name="search" :title="filtered ? t('activity.noMatch') : t('activity.none')" :action="filtered ? t('activity.clear') : t('phone.shell.open.activity')" @action="filtered ? clear() : openForm('tx')" />
      <template v-else>
        <div class="ph-actv-sum">
          <HeroSentence :parts="hero" :link="t('phone.activity.howCounted')" @link="howOpen = true" />
          <div class="ph-actv-facts">
            <span class="ph-actv-fact"><span>{{ t("activity.count", { n: rows.length }, rows.length) }}</span></span>
            <span class="ph-actv-fact" :data-tip="t('activity.netTip')"><span>{{ t("activity.net") }} <b :class="{ neg: T.net < 0 }" dir="ltr">{{ fm(T.net) }}</b></span></span>
            <span v-if="T.back >= 1" class="ph-actv-fact" :data-tip="t('activity.backTip')"><span>{{ t("activity.backT") }} <b dir="ltr">{{ fm(T.back) }}</b></span></span>
            <span v-if="loN" class="ph-actv-fact" :data-tip="sumTip"><span>{{ t("activity.notIn", { n: loN }, loN) }}</span></span>
          </div>
        </div>

        <section v-for="g in lists" :key="g.key" class="ph-actv-g" :class="{ closed: g.label && closed.has(gkey(g)) }">
          <button v-if="g.label" type="button" class="ph-actv-gh" :aria-expanded="String(!closed.has(gkey(g)))" :aria-label="(closed.has(gkey(g)) ? t('phone.activity.groupOpen') : t('phone.activity.groupClose')) + ': ' + groupLabel(g.label)" @click="toggle(g)">
            <span class="ph-actv-gt"><b>{{ groupLabel(g.label) }}</b><span>{{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span></span>
            <PIcon name="chevron" class="ph-actv-gc" />
            <span class="ph-actv-gp"><span v-for="(p, i) in grpParts(g)" :key="i" :class="{ neg: p.neg }" :data-tip="p.tip || undefined">{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></span>
          </button>
          <div v-if="!g.label || !closed.has(gkey(g))" class="ph-group-b">
            <SwipeRow v-for="x in g.rows" :key="x.id" :end="swipeActs(x)" @hold="held = x">
              <button type="button" class="ph-row ph-two ph-txr" :class="{ fut: K.isFut(x) }" @click="openRow(x)">
                <span class="ph-row-lead"><span class="ph-av" :style="avStyle(x)" aria-hidden="true">{{ (name(x) || "?")[0] }}</span></span>
                <span class="ph-row-main">
                  <span class="ph-row-t">{{ name(x) }}</span>
                  <span class="ph-row-s ph-txr-s"><span class="num">{{ day(x) }}</span><span>{{ catLabel(x.c) }}</span><span v-if="acct(x)" class="ph-txr-acc">{{ acct(x) }}</span></span>
                  <span v-if="chips(x).length || x.docs?.length" class="ph-txr-chips">
                    <span v-for="c in chips(x)" :key="c.cls" class="bd pc" :class="c.cls"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span>
                    <span v-if="x.docs?.length" class="bd pc ph-txr-doc"><svg class="pi" viewBox="0 0 24 24"><path d="M20 12l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 18a2 2 0 0 1-3-3l7.5-7.5" /></svg>{{ x.docs.length }}</span>
                  </span>
                </span>
                <span class="ph-row-end ph-txr-end">
                  <b class="ph-txr-a" :class="{ pos: isPos(x), bal: x.balUpd }" dir="ltr">{{ amtText(x) }}</b>
                  <span v-if="x.orig" class="ph-txr-o" dir="ltr">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }} {{ x.orig.cur }}</span>
                </span>
              </button>
            </SwipeRow>
          </div>
        </section>
        <div ref="endEl" class="ph-actv-end" aria-hidden="true"><i v-if="more > 0" class="ph-actv-spin" /></div>
      </template>
    </template>

    <!-- Needs review -->
    <template v-else>
      <EmptyState v-if="revEmpty" icon-name="check" :title="t('phone.activity.allClear')" :text="t('phone.activity.allClearText')" />
      <template v-else>
        <HeroSentence v-if="reviewCount" :parts="[{ text: t('phone.activity.reviewHero', { n: reviewCount }, reviewCount) }]" class="ph-actv-rh" />
        <ListGroup v-if="revXf.length" :title="t('activity.r.xfTitle')">
          <div v-for="r in revXf" :key="r.x.o" class="ph-rv">
            <div class="ph-rv-h"><b>{{ r.o.from }}</b><PIcon name="chevron" dir class="ph-rv-to" /><b>{{ r.i.to }}</b></div>
            <span class="ph-row-s">{{ dstr(r.o.d) }}</span>
            <p class="ph-rv-p"><EmText :text="t('activity.r.xfLine2', { sent: fm(-r.o.a), out: r.o.from, arrived: r.i.orig ? (SYM[r.i.orig.cur] || '') + f0(r.i.orig.amt) + ' (≈ ' + fm(r.i.a) + ')' : fm(r.i.a), in: r.i.to })" :em="[r.o.from, r.i.to]" /></p>
            <span class="bd" :class="r.cost > 0.5 ? 'am2' : 'dn'">{{ r.cost > 0.5 ? t("activity.r.cost2", { amt: fm(r.cost), pc: ((r.cost / -r.o.a) * 100).toFixed(1) }) : t("activity.r.noCost") }}</span>
            <p class="ph-rv-p mu"><EmText :text="r.cost > 0.5 ? t('activity.r.costText') : t('activity.r.noCostText')" :em="['Fees & FX costs']" /></p>
            <div class="ph-rv-b"><button type="button" class="ph-btn ph-sm" @click="run(A.xfOk, r.x.o)">{{ t("activity.r.confirm") }}</button><button type="button" class="ph-btn tonal ph-sm" @click="run(A.xfNo, r.x.o)">{{ t("activity.r.notXf") }}</button></div>
          </div>
        </ListGroup>
        <ListGroup v-if="revDups.length" :title="t('activity.r.dupTitle')">
          <div v-for="x in revDups" :key="x.id" class="ph-rv">
            <div class="ph-rv-h"><b>{{ name(x) }}</b><b class="ph-rv-amt" dir="ltr">{{ fm(x.a) }}</b></div>
            <p class="ph-rv-p mu"><EmText :text="x.from + ', ' + dstr(x.d) + '. ' + t('activity.r.dupWhy')" :em="[x.from]" /></p>
            <div class="ph-rv-b"><button type="button" class="ph-btn ph-sm danger" @click="run(A.dupDel, x.id)">{{ t("activity.r.dupDel") }}</button><button type="button" class="ph-btn tonal ph-sm" @click="run(A.dupKeep, x.id)">{{ t("activity.r.dupKeep") }}</button></div>
          </div>
        </ListGroup>
        <ListGroup v-if="revGaps.length" :title="t('activity.r.gapTitle')" :note="t('activity.r.gapIntro')">
          <div v-for="r in revGaps" :key="r.id" class="ph-rv">
            <div class="ph-rv-h"><b>{{ r.n }}</b><span class="ph-row-s">{{ r.cur }}</span><span class="bd" :class="r.diff < 0 ? 'up' : 'dn'">{{ t("activity.r." + (r.card ? (r.diff < 0 ? "cardMore" : "cardLess") : r.diff < 0 ? "down" : "up")) }}</span></div>
            <p class="ph-rv-big">{{ t(gapKey(r, "activity.r."), { amt: gapAmt(r) }) }}</p>
            <p v-if="gapB(r)" class="ph-rv-p sinfo"><EmText :text="t('txw.a.gapBill', { bill: gapB(r).n, amt: fm(gapB(r).pred), date: dstr(gapB(r).pd) })" :em="[gapB(r).n]" /></p>
            <p class="ph-rv-p mu"><EmText :text="t(gapKey(r, 'txw.a.'), { name: r.n, amt: gapAmt(r), part: gapOrig(r), from: gapWhen(r.from), to: gapWhen(r.to) })" :em="[r.n]" /><template v-if="!(r.card && r.diff > 0)"><br><EmText :text="t('txw.a.gapCauses')" lead /></template></p>
            <div class="ph-rv-b">
              <button type="button" class="ph-btn ph-sm" @click="gapAdd(r)">{{ t("activity.r.gapAdd") }}</button>
              <button v-if="r.diff < 0" type="button" class="ph-btn tonal ph-sm" @click="gapCall(r.id, 'record', t('txw.a.recorded'))">{{ t("activity.r.gapRec") }}</button>
              <button type="button" class="ph-btn tonal ph-sm" @click="gapNote = { id: r.id, note: '' }">{{ t("activity.r.gapRev") }}</button>
            </div>
          </div>
        </ListGroup>
      </template>
    </template>

    <!-- sheets -->
    <PickerSheet v-model:open="pickOpen" :required="picker === 'group' || picker === 'sort'" :title="PICK[picker]?.title || ''" :options="PICK[picker]?.options || []" :model-value="pickVal" @update:model-value="picked" />
    <PickerSheet v-model:open="catOpen" :title="catFor ? name(catFor) : ''" :options="catOptions" :model-value="catNow" @update:model-value="catPicked" />
    <ActionSheet v-model:open="optsOpen" :actions="optActs" />
    <ActionSheet v-model:open="heldOpen" :title="held ? name(held) : ''" :actions="heldActs" />
    <PhoneSheet :open="!!dates" :title="t('phone.activity.custom')" @update:open="(v) => !v && (dates = null)">
      <div v-if="dates" class="ph-actv-dates">
        <label class="fld">{{ t("activity.cal.start") }}<input v-model="dates.from" type="date" /></label>
        <label class="fld">{{ t("activity.cal.end") }}<input v-model="dates.to" type="date" :min="dates.from || undefined" /></label>
      </div>
      <template #foot><button type="button" class="ph-btn" :disabled="!dates?.from" @click="applyDates">{{ t("activity.cal.apply") }}</button></template>
    </PhoneSheet>
    <PhoneSheet v-model:open="howOpen" :title="t('phone.activity.howCounted')">
      <dl class="ph-actv-how">
        <dt>{{ t("activity.in") }}</dt><dd>{{ t("activity.inTip") }}</dd>
        <dt>{{ t("activity.out") }}</dt><dd>{{ t("activity.outTip") }}</dd>
        <dt>{{ t("activity.net") }}</dt><dd>{{ t("activity.netTip") }}</dd>
        <dt>{{ t("activity.backT") }}</dt><dd>{{ t("activity.backTip") }}</dd>
      </dl>
    </PhoneSheet>
    <PhoneSheet v-model:open="expOpen" :title="t('txw.a.exp')" size="large" cls="ph-adopt">
      <ExportPanel :from="exportFrom" :filters="{ ...f, focus: focus ? [...focus.ids] : null }" />
    </PhoneSheet>
    <BaseDialog :open="!!gapNote" :title="t('activity.r.gapRev')" @update:open="(v) => !v && (gapNote = null)">
      <label v-if="gapNote" class="fld">{{ t("activity.r.gapNoteQ") }}<textarea v-model="gapNote.note" rows="3" /></label>
      <template #actions><BaseButton variant="outline" size="small" @click="gapNote = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!gapNote || !gapNote.note.trim()" @click="gapCall(gapNote.id, 'review', t('txw.a.reviewed'), { note: gapNote.note.trim() }); gapNote = null">{{ t("activity.r.gapRevGo") }}</BaseButton></template>
    </BaseDialog>
  </PhoneScreen>
</template>
