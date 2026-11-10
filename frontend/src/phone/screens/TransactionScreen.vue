<script setup>
// One transaction (pushed on any tab, ?tx=): the computer's entry window as a screen, in its reading order. The top
// (who, when, the amount, then its kind, category, marks and tags), the details the bank sent; then the window's side
// sections: what the money in is, organise (name, category, tags), the note, what this is, what can be done, its
// documents and its changes; at the end the window's Payment history, Copy details and Attach.
// Everything it knows and does comes from pagelogic/transaction.js, the same code as the computer's entry window.
import { ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { openPop } from "../../core/txwin.js";
import { openDocs } from "../../core/docs.js";
import { tx as heTx } from "../../core/heText.js";
import { catColor, catLabel } from "../../core/cats.js";
import { amtText, SYM, CHIP_ICON, inWhy } from "../../lib/txrows.js";
import { MARKS } from "../../lib/moneyIn.js";
import { prettyKey } from "../../lib/activity.js";
import { f0 } from "../../format.js";
import { dstr } from "../../dates.js";
import { useTransaction } from "../../pagelogic/transaction.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import PIcon from "../components/PIcon.vue";
import TagEditor from "../../components/TagEditor.vue";
import { tagName } from "../../core/polish.js";

const props = defineProps({ id: { type: String, default: null } });
const { t } = useI18n();
const nav = usePhoneNav();
// the computer's window closes itself after some actions; this screen stays and shows the result
const { tk, S, cur, name, nohtml, avStyle, isXf, isPos, chips, kindText, kindCls, cats, goCat, goTag, det, facts, rawFields, factText, setName, setCat, setNote, addTags, removeTag, mi, autoMark, markIn, TIC, rels, hasHist, histOf, tiles, attach, changes, when, copyDetails } = useTransaction(toRef(props, "id"));

// the transaction went away while open (a copy deleted, undo of an add): back to where it was opened from
watch(cur, (x, was) => { if (!x && was) nav.back(); });

// the small windows of this screen
const pick = ref(""); // "cat" | "tags" | "name" | "note"
const shut = () => { pick.value = ""; };
const catOptions = () => [{ value: "", label: t("activity.uncategorized") }, ...cats.value.map((c) => ({ value: c, label: catLabel(c) }))];
const catValue = () => (cur.value?.c && cur.value.c !== "Uncategorized" ? cur.value.c : "");
const pickCat = (v) => setCat(cur.value, v || "");
const COPY_IC = '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>';
// every field the bank sent, opened under the details (the computer's fold-out list)
const rawOpen = ref(false);
watch(() => props.id, () => { rawOpen.value = false; });
// where the money went from and to: each name keeps its own order, and in Hebrew the arrow points the way the line reads
const fromTo = (x) => {
  if (!(x.from && x.to)) return nohtml(x.from || x.to || "");
  const he = document.documentElement.classList.contains("he");
  return "\u2068" + nohtml(x.from) + "\u2069" + (he ? " ← " : " → ") + "\u2068" + nohtml(x.to) + "\u2069";
};
const tone = (r) => (r.cls === "amber" ? "warn" : "acc");
</script>

<template>
  <PhoneScreen :large="false" class="ph-tx">
    <EmptyState v-if="!cur" icon-name="search" :title="t('phone.tx.gone')" :text="t('phone.tx.goneSub')" />
    <template v-else>
      <!-- the window's top: who, when and the amount, then its kind, category, marks and tags (a category or tag lists all with it) -->
      <header class="ph-tx-hero">
        <span class="ph-tx-av" :style="avStyle(cur)" aria-hidden="true">{{ (name(cur) || "?")[0] }}</span>
        <b class="ph-tx-amt" :class="{ pos: isPos(cur) }" dir="ltr">{{ amtText(cur) }}</b>
        <span v-if="cur.orig" class="ph-tx-orig" dir="ltr">{{ SYM[cur.orig.cur] || "" }}{{ f0(cur.orig.amt) }} {{ cur.orig.cur }}</span>
        <h1 class="ph-tx-name">{{ name(cur) }}</h1>
        <p class="ph-tx-when"><span>{{ dstr(cur.d) }}</span><span v-if="fromTo(cur)">{{ fromTo(cur) }}</span></p>
        <div class="ph-tx-chips">
          <span class="tb" :class="kindCls(cur)">{{ kindText(cur) }}</span>
          <button v-if="!cur.virtual && !isXf(cur) && cur.c" type="button" class="chip catl ph-tx-cat" @click="goCat(cur.c)"><span class="dot" :style="{ background: catColor(S, cur.c) }"></span>{{ catLabel(cur.c) }}</button>
          <span v-for="c in chips(cur)" :key="c.cls" class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span>
          <button v-for="g in cur.tags || []" :key="g" type="button" class="tag catl" @click="goTag(g)">{{ tagName(g) }}</button>
        </div>
      </header>

      <!-- the details the bank sent, with every field it sent folded under them -->
      <ListGroup v-if="facts.length || rawFields.length || det === 'load'" :title="t('activity.d.details')">
        <div v-for="r in facts" :key="r.k" class="ph-tx-kv"><span>{{ tk("activity.d." + r.k) }}</span><b :class="{ mono: r.mono }">{{ typeof r.v === "string" ? heTx(r.v) : factText(r.v) }}</b></div>
        <button v-if="rawFields.length" type="button" class="ph-row ph-tx-rawh" :class="{ on: rawOpen }" :aria-expanded="String(rawOpen)" @click="rawOpen = !rawOpen">
          <span class="ph-row-main"><span class="ph-row-t">{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }}</span></span>
          <span class="ph-tx-cnt">{{ rawFields.length }}</span>
          <PIcon name="chevron" class="ph-tx-rawc" />
        </button>
        <template v-if="rawOpen"><div v-for="[a, b] in rawFields" :key="a" class="ph-tx-kv col"><span>{{ prettyKey(a) }}</span><b>{{ b }}</b></div></template>
        <template #note>
          <span v-if="det === 'load'">{{ t("activity.d.loading") }}</span>
          <span v-else-if="!cur.virtual && (!det || (cur.src !== 'manual' && !det.details))">{{ cur.src === "manual" ? t("activity.d.manual") : t("activity.d.old") }}</span>
        </template>
      </ListGroup>

      <ListGroup v-if="mi" :title="t('txw.mi.title')">
        <template #head><span class="ph-tx-cnt">{{ t("txw.mi.k." + mi.mark) }}</span></template>
        <div class="ph-tx-mi">
          <p class="ph-tx-p">{{ t("txw.mi.tip." + mi.mark) }}</p>
          <p class="ph-tx-p"><b>{{ mi.chosen ? t("txw.mi.why.chosen") : inWhy(mi.r) }}</b></p>
          <div class="ph-tx-kinds" role="radiogroup" :aria-label="t('txw.mi.title')">
            <button v-for="m in MARKS" :key="m" type="button" class="ph-chip" :class="{ on: mi.mark === m }" role="radio" :aria-checked="mi.mark === m" @click="markIn(cur, m)"><PIcon v-if="mi.mark === m" name="check" />{{ t("txw.mi.k." + m) }}</button>
            <button v-if="mi.chosen" type="button" class="ph-chip" :data-tip="t('txw.mi.autoTip', { k: t('txw.mi.k.' + autoMark) })" @click="markIn(cur, '')">{{ t("txw.mi.auto") }}</button>
          </div>
        </div>
      </ListGroup>

      <ListGroup v-if="!cur.virtual && !isXf(cur)" :title="t('activity.d.organise')">
        <ListRow :title="t('activity.d.displayName')" :value="S.cfg?.renames?.[cur.id] || ''" link @tap="pick = 'name'" />
        <ListRow :title="t('activity.category')" link @tap="pick = 'cat'">
          <template #end><span class="ph-tx-val"><i class="ph-tx-dot" :style="{ background: catColor(S, cur.c || 'Uncategorized') }" />{{ catLabel(cur.c || "Uncategorized") }}</span></template>
        </ListRow>
        <ListRow :title="t('activity.w.tags')" :value="(cur.tags || []).length ? cur.tags.map(tagName).join(' ') : t('phone.tx.noTags')" link @tap="pick = 'tags'" />
      </ListGroup>

      <ListGroup v-if="!cur.virtual" :title="t('activity.d.note')">
        <template v-if="cur.note && !isXf(cur)" #head><span class="ph-tx-cnt">{{ t("activity.w.added") }}</span></template>
        <button type="button" class="ph-row ph-tx-note" :class="{ empty: !cur.note }" @click="pick = 'note'">
          <span class="ph-row-main"><span class="ph-tx-notet">{{ cur.note || t("activity.d.notePh") }}</span></span>
          <PIcon class="ph-chev" name="chevron" dir />
        </button>
      </ListGroup>

      <ListGroup v-if="rels.length" :title="t('activity.d.whatIs')">
        <template #head><i v-if="rels.some((r) => r.cls === 'amber')" class="ph-tx-flag" :aria-label="t('activity.w.needsLook')" /><span class="ph-tx-cnt">{{ rels.length }}</span></template>
        <div v-for="r in rels" :key="r.title + r.ic" class="ph-tx-rel" :class="r.cls">
          <span class="ph-tile" :style="{ '--tile': `var(--${tone(r)})` }"><PIcon :svg="TIC[r.ic]" /></span>
          <div class="ph-tx-relb">
            <b>{{ r.title }}</b>
            <p v-if="r.text">{{ r.text }}</p>
            <div v-if="r.btns" class="ph-tx-btns"><button v-for="b in r.btns" :key="b.label" type="button" class="ph-tx-btn" :class="b.cls" @click="b.run()">{{ b.label }}</button></div>
          </div>
        </div>
      </ListGroup>

      <ListGroup v-if="tiles.length" class="ph-tx-acts" :title="t('activity.d.actions')">
        <template #head><span class="ph-tx-cnt">{{ tiles.length }}</span></template>
        <ListRow v-for="x in tiles" :key="x.title" :title="x.title" :sub="x.sub" :icon="TIC[x.ic]" :tone="x.hot ? 'pos' : 'acc'" @tap="x.run()" />
      </ListGroup>

      <ListGroup v-if="!cur.virtual && cur.docs?.length" :title="t('activity.w.docs')">
        <template #head><span class="ph-tx-cnt">{{ cur.docs.length }}</span></template>
        <ListRow v-for="(d, i) in cur.docs" :key="i" :title="d" :icon="TIC.clip" link @tap="openDocs(cur.id, i)" />
      </ListGroup>

      <ListGroup v-if="changes.length" :title="t('activity.d.history')">
        <template #head><span class="ph-tx-cnt">{{ changes.length }}</span></template>
        <div v-for="a in changes" :key="a.t + a.action + a.detail" class="ph-tx-hist">
          <div class="ph-tx-histh"><b>{{ heTx(a.action) }}</b><span>{{ when(a.t) }}</span></div>
          <p>{{ heTx(nohtml(a.detail || "")) }}</p>
        </div>
      </ListGroup>

      <!-- the window's buttons at its bottom: the payment history, copy the details, attach a receipt or photo (Done is the top bar's Back) -->
      <div class="ph-tx-foot">
        <button v-if="hasHist" type="button" class="ph-btn tonal" @click="histOf(cur)"><PIcon :svg="TIC.hist" />{{ t("txw.w.payHist") }}</button>
        <button type="button" class="ph-btn tonal" @click="copyDetails"><PIcon :svg="COPY_IC" />{{ t("activity.d.copy") }}</button>
        <label v-if="!cur.virtual" class="ph-btn tonal"><PIcon :svg="TIC.clip" />{{ t("activity.w.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach($event)" /></label>
      </div>
    </template>

    <PickerSheet v-if="cur" :open="pick === 'cat'" required :title="t('activity.category')" :options="catOptions()" :model-value="catValue()" @update:open="shut" @update:model-value="pickCat" />

    <PhoneSheet v-if="cur" :open="pick === 'tags'" :title="t('activity.w.tags')" @update:open="shut">
      <div class="fld ph-tx-tags"><TagEditor :tags="cur.tags || []" @add="(L) => addTags(cur, L)" @remove="(i) => removeTag(cur, cur.tags[i])" @go="(g) => { shut(); goTag(g); }" /></div>
      <template #foot><button type="button" class="ph-btn" @click="shut">{{ t("activity.d.done") }}</button></template>
    </PhoneSheet>

    <PhoneSheet v-if="cur" :open="pick === 'name'" :title="t('activity.d.displayName')" @update:open="shut">
      <div class="fld"><input :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="name(cur)" maxlength="80" :aria-label="t('activity.d.displayName')" @change="setName(cur, $event.target.value)" /></div>
      <button type="button" class="ph-btn tonal ph-tx-wide" @click="shut(); openPop('nameRule', { id: cur.id })">{{ t("activity.w.nrRule") }}</button>
      <template #foot><button type="button" class="ph-btn" @click="shut">{{ t("activity.d.done") }}</button></template>
    </PhoneSheet>

    <PhoneSheet v-if="cur" :open="pick === 'note'" :title="t('activity.d.note')" @update:open="shut">
      <div class="fld"><textarea rows="4" :placeholder="t('activity.d.notePh')" :value="cur.note || ''" :aria-label="t('activity.d.note')" @change="setNote(cur, $event.target.value)" /></div>
      <template #foot><button type="button" class="ph-btn" @click="shut">{{ t("activity.d.done") }}</button></template>
    </PhoneSheet>

  </PhoneScreen>
</template>
