<script setup>
// "Add a report or payment" / "Change a report or payment" (Taxes and reports): one item the person reports or pays, for
// example a VAT report or a tax advance. Its name, its dates, the money that counts, the amount, the papers each
// transaction needs and when it applies (a business type, or money in this year over a limit). The business types can be
// changed here too; they are saved together with the item, as one change.
// openForm("tax") adds, openForm("tax", { id }) changes an item, openForm("tax", { start }) adds one that starts from
// these fields (a ready-made example). Moving one date and marking a period done are on the page, not here.
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { now, dayOf } from "../../core/clock.js";
import { REPEAT_EVERY, AMOUNT_KINDS, PAPER_NEEDS, NEAR_PCT, EXAMPLE_TYPES, addTaxItem, editTaxItem, setBizTypes, formCats } from "../../lib/taxReports.js";
import { allTags } from "../../lib/categories.js";
import { fm } from "../../lib/bills.js";
import { categoryName } from "../../catnames.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import { ask } from "../../core/ask.js";
import BaseDialog from "../BaseDialog.vue";
import BaseButton from "../BaseButton.vue";
import MoneyInput from "../MoneyInput.vue";
import TagEditor from "../TagEditor.vue";
import SlideOpen from "../SlideOpen.vue";

const props = defineProps({ id: { type: [Number, String], default: null }, start: { type: Object, default: null } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t, te, locale } = useI18n();
const S = computed(() => data.state.value);
const old = computed(() => (props.id != null ? (S.value?.taxItems || []).find((x) => x.id == props.id) || null : null));
const tk = (k) => (k && te(k) ? t(k) : "");

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = computed(() => DAYS.slice(0, 12).map((m) => ({ v: m, l: new Date(2026, m - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { month: "long" }) })));
const COVERS = [1, 2, 3, "year", "since"];
// "Money from" when not chosen: the months of the repeat, last year for a yearly one, since the date before for set dates.
const coversFor = (rep) => (rep == "dates" ? "since" : rep == "12" ? "year" : +rep || "");
const blank = (v) => (v == null ? "" : String(v));
const paperF = (p) => ({ need: p?.need || "none", over: p?.over ? p.over : "", note: p?.note || "" });

// The item as form fields (strings for the boxes and lists).
function fields(x) {
  const r = x.repeat, rep = !r ? (x.id || x.n || x.nk ? "none" : "1") : Array.isArray(r.dates) ? "dates" : String(r.every || 1);
  const m = x.money || {}, a = x.amount || null, w = x.when || {};
  return {
    n: x.n || tk(x.nk), rep, month: r?.month || 1, day: r?.day || 31,
    dates: Array.isArray(r?.dates) ? r.dates.map((d) => ({ m: +d.slice(0, 2), d: +d.slice(3, 5) })) : [{ m: 4, d: 15 }],
    covers: x.covers != null ? String(x.covers) : String(coversFor(rep)), want: blank(x.want),
    inOn: !!m.in, inCats: [...(m.in?.cats || [])], salary: !!m.in?.salary, outOn: !!m.out, outCats: [...(m.out?.cats || [])],
    tags: [...(m.tags || [])], part: Object.entries(m.tagPct || {}).map(([tag, pct]) => ({ tag, pct: blank(pct) })),
    papers: { in: paperF(x.papers?.in), out: paperF(x.papers?.out) },
    amt: a?.kind || "", pct: blank(a?.pct), vatRate: blank(a?.vatRate ?? 18), inclVat: a ? a.inclVat !== false : true, value: blank(a?.value),
    type: w.type || "", over: blank(w.over), near: blank(w.nearPct),
  };
}
const base = () => structuredClone(old.value || props.start || { money: { in: { cats: [], salary: false }, out: null, tags: [], add: [], skip: [], tagPct: {} } });
const f = ref(fields(base()));
// The business types, as the person edits them here (name, since).
const typeName = (x) => x.n || tk(x.nk) || tk("taxes.type." + x.id) || x.id;
const types0 = () => (S.value?.bizTypes || []).map((x) => ({ id: x.id, nk: x.nk, name: typeName(x), from: x.from }));
const types = ref(types0());
const typesShown = computed(() => types.value.filter((x) => x.name.trim()));
// A business type's name for the screen: the person's own, a ready-made one, or one saved before; "" when none is known
// (never the id).
const typeLabel = (id) => typeOpts.value.find((x) => x.id == id)?.name || ((y) => y && (y.n || tk(y.nk) || tk("taxes.type." + y.id)))((S.value?.bizTypes || []).find((x) => x.id == id)) || "";

// Folded parts: open when they hold something, so nothing set is hidden.
const fold = ref({ part: f.value.part.length > 0, papers: ["in", "out"].some((s) => f.value.papers[s].need != "none"), when: !!(f.value.type || f.value.over), types: false });
const err = ref("");

// When "How often" changes, "Money from" follows, unless the person chose something else for it.
watch(() => f.value.rep, (rep, was) => { if (f.value.covers === String(coversFor(was))) f.value.covers = String(coversFor(rep)); });
// The business types to choose from: the person's own, then the ready-made ones not in their list yet.
const typeOpts = computed(() => [...typesShown.value.map((x) => ({ id: x.id, name: x.name })), ...EXAMPLE_TYPES.filter((e) => !typesShown.value.some((x) => x.id == e.id)).map((e) => ({ id: e.id, name: typeName(e) }))]);
// The chosen business type is not one of the person's yet, so the item would never show: say so, and offer to add it.
const typeMissing = computed(() => !!f.value.type && !typesShown.value.some((x) => x.id == f.value.type));
function addMine() {
  const e = EXAMPLE_TYPES.find((x) => x.id == f.value.type);
  types.value.push({ id: f.value.type, nk: e?.nk, name: typeLabel(f.value.type), from: dayOf(now.value).slice(0, 4) + "-01-01" });
  fold.value.types = true;
}
// Removing a business type that items still use: say first that those items stop showing.
function dropType(i) {
  const x = types.value[i];
  const n = (S.value?.taxItems || []).filter((it) => it.id != props.id && it.when?.type == x.id).length + (f.value.type == x.id ? 1 : 0);
  const go = () => { const j = types.value.indexOf(x); if (j >= 0) types.value.splice(j, 1); };
  if (!n || !x.name.trim()) return go();
  ask(t("taxes.form.typeUsedAsk", { name: x.name.trim() }), t("taxes.form.typeUsedText", { n }, n), go, { danger: true, yes: t("taxes.form.removeType") });
}

const cats = computed(() => ({ in: formCats(S.value, "in"), out: formCats(S.value, "out") }));
const left = (side) => cats.value[side].filter((k) => !f.value[side + "Cats"].includes(k));
const addCat = (side, e) => { const k = e.target.value; if (k && !f.value[side + "Cats"].includes(k)) f.value[side + "Cats"].push(k); e.target.value = ""; };
const dropCat = (side, i) => f.value[side + "Cats"].splice(i, 1);
const addTags = (L) => { for (const g of L) if (!f.value.tags.some((x) => x.toLowerCase() == g.toLowerCase())) f.value.tags.push(g); };
const tagList = computed(() => allTags(S.value || { tx: [] }).map(([g]) => g));
const partTags = (row) => tagList.value.filter((g) => g == row.tag || !f.value.part.some((p) => p.tag == g));

// The months of an "every 2 / 3 months" repeat, for the line under "First month".
const dueMonths = computed(() => {
  const k = +f.value.rep; if (k != 2 && k != 3) return "";
  return MONTHS.value.filter((m) => (((m.v - f.value.month) % k) + k) % k == 0).map((m) => m.l).join(", ");
});
const coversLabel = (c) => t("taxes.form.cov." + c);
const partSum = computed(() => (f.value.part.length ? t("taxes.form.partSum", { n: f.value.part.length }, f.value.part.length) : ""));
const papersSum = computed(() => {
  const L = ["in", "out"].filter((s) => f.value.papers[s].need != "none").map((s) => t("taxes.form.papers" + (s == "in" ? "In" : "Out")) + ": " + t("taxes.form.need." + f.value.papers[s].need));
  return L.length ? L.join(" · ") : t("taxes.form.papersNone");
});
const whenSum = computed(() => {
  const ty = f.value.type && (typeLabel(f.value.type) || t("taxes.form.typeGone"));
  const L = [ty, +f.value.over > 0 ? t("taxes.form.overSum", { amount: fm(+f.value.over) }) : ""].filter(Boolean);
  return L.length ? L.join(" · ") : t("taxes.form.always");
});

const num = (v) => (v === "" || v == null || !Number.isFinite(+v) ? null : +v);
const p2 = (n) => String(n).padStart(2, "0");
// The form fields as an item (lib/taxReports.js); fields the form does not show (an example's name key and note, the
// transactions added or left out by hand) stay as they were.
function item() {
  const x = f.value, b = base(), out = { ...b };
  delete out.id; delete out.done; delete out.moved;
  const name = x.n.trim();
  if (b.nk && name == tk(b.nk)) delete out.n; else out.n = name;
  out.repeat = x.rep == "none" ? null : x.rep == "dates" ? { dates: [...new Set(x.dates.map((d) => p2(d.m) + "-" + p2(d.d)))].sort() } : { every: +x.rep, month: +x.rep == 1 ? 1 : +x.month, day: +x.day };
  if (x.rep == "none") delete out.covers; else out.covers = num(x.covers) ?? x.covers;
  if (num(x.want) != null && x.rep != "none") out.want = +x.want; else delete out.want;
  const pct = Object.fromEntries(x.part.filter((p) => p.tag).map((p) => [p.tag, num(p.pct)]));
  out.money = { ...(b.money || {}), in: x.inOn ? { cats: [...x.inCats], salary: !!x.salary } : null, out: x.outOn ? { cats: [...x.outCats] } : null, tags: [...x.tags], add: b.money?.add || [], skip: b.money?.skip || [], tagPct: x.outOn ? pct : {} };
  const paper = (p) => ({ need: p.need, ...(p.need != "none" && num(p.over) > 0 ? { over: +p.over } : {}), ...(p.need != "none" && p.note.trim() ? { note: p.note.trim() } : {}) });
  out.papers = { in: paper(x.papers.in), out: paper(x.papers.out) };
  const k = x.amt;
  out.amount = !k ? null : k == "fixed" ? { kind: k, value: num(x.value) } : k == "vat" ? { kind: k, vatRate: num(x.vatRate) ?? 18, inclVat: !!x.inclVat } : { kind: k, pct: num(x.pct) };
  const w = { ...(x.type ? { type: x.type } : {}), ...(num(x.over) > 0 ? { over: +x.over, ...(num(x.near) != null ? { nearPct: +x.near } : {}) } : {}) };
  out.when = Object.keys(w).length ? w : null;
  return out;
}
// The business types as saved (S.bizTypes): a ready-made name stays a text key until the person renames it.
function bizTypes() {
  let k = 0;
  return typesShown.value.map((x) => {
    const name = x.name.trim(), keep = x.nk && name == tk(x.nk);
    return { id: x.id || "t" + Date.now() + "-" + k++, ...(keep ? { nk: x.nk } : { n: name }), from: x.from || dayOf(now.value) };
  });
}
const typesChanged = () => JSON.stringify(bizTypes()) != JSON.stringify((S.value?.bizTypes || []).map(({ id, n, nk, from }) => ({ id, ...(nk && !n ? { nk } : { n: n || typeName({ id, nk }) }), from })));

// A percent box: empty, or a number from 0 to 100.
const badPct = (v) => v !== "" && v != null && !(Number.isFinite(+v) && +v >= 0 && +v <= 100);
function save() {
  const x = f.value;
  if (!x.n.trim()) { err.value = "name"; document.getElementById("txfN")?.focus(); return; }
  if (x.rep == "dates" && !x.dates.length) { err.value = "dates"; return; }
  // only the percent boxes on the screen are checked; a folded one opens so its message shows
  const bad = x.outOn && x.part.some((p) => badPct(p.pct)) ? "part" : ["in", "out", "net"].includes(x.amt) && badPct(x.pct) ? "pct"
    : x.amt == "vat" && badPct(x.vatRate) ? "vat" : num(x.over) > 0 && badPct(x.near) ? "near" : "";
  if (bad) {
    err.value = bad;
    if (bad == "part") fold.value.part = true;
    if (bad == "near") fold.value.when = true;
    nextTick(() => document.querySelector(".txf [aria-invalid=true]")?.focus());
    return;
  }
  // a business type added here gets its id now, so the item can point to it
  const T = typesChanged() ? bizTypes() : null;
  const it = item(), id = props.id;
  close();
  data.change((N) => {
    const L = [...((T && setBizTypes(N, T)) || []), ...((id != null ? editTaxItem(N, id, it) : addTaxItem(N, it)) || [])];
    return L.length ? L : false;
  });
}
// A new business type's id: never one in the list or saved, even when added twice in the same millisecond.
function newTypeId() {
  const used = new Set([...types.value, ...(S.value?.bizTypes || [])].map((x) => String(x.id)));
  let n = Date.now();
  while (used.has("t" + n)) n++;
  return "t" + n;
}
const addType = () => { types.value.push({ id: newTypeId(), name: "", from: dayOf(now.value) }); };
</script>

<template>
  <BaseDialog :open="open" cls="xw txf" :title="id != null ? t('taxes.form.edit') : t('taxes.form.add')" @update:open="(v) => !v && close()">
    <p v-if="id == null" class="sm txf-intro">{{ t("taxes.form.intro") }}</p>
    <div class="fld">
      <label for="txfN">{{ t("taxes.form.name") }}</label>
      <input id="txfN" v-model="f.n" :placeholder="t('taxes.form.nameEx')" autocomplete="off" :aria-invalid="err == 'name' && !f.n.trim()" @input="err = ''">
      <div v-if="err == 'name' && !f.n.trim()" class="sm txf-err" role="alert">{{ t("taxes.form.nameErr") }}</div>
    </div>

    <!-- dates: how often, the last day, the day I want to do it, and which months of money it counts -->
    <section class="txf-s">
      <h4>{{ t("taxes.form.secDates") }}</h4>
      <div class="fld"><label for="txfR">{{ t("taxes.form.repeat") }}</label>
        <select id="txfR" v-model="f.rep"><option v-for="k in [...REPEAT_EVERY.map(String), 'dates', 'none']" :key="k" :value="k">{{ t("taxes.form.rep." + k) }}</option></select>
      </div>
      <p v-if="f.rep == 'none'" class="sm txf-hint">{{ t("taxes.form.noneHint") }}</p>
      <template v-else>
        <div v-if="f.rep == 'dates'" class="fld">
          <label>{{ t("taxes.form.dates") }}</label>
          <div v-for="(d, i) in f.dates" :key="i" class="txf-row">
            <select v-model.number="d.d" :aria-label="t('taxes.form.dayOf')"><option v-for="n in DAYS" :key="n" :value="n">{{ n }}</option></select>
            <select v-model.number="d.m" :aria-label="t('taxes.form.monthOf')"><option v-for="m in MONTHS" :key="m.v" :value="m.v">{{ m.l }}</option></select>
            <button type="button" class="ib txf-x" :aria-label="t('taxes.form.removeDate')" :data-tip="t('taxes.form.removeDate')" @click="f.dates.splice(i, 1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          </div>
          <button type="button" class="btn o s txf-add" @click="f.dates.push({ m: 1, d: 15 }); err = ''">{{ t("taxes.form.addDate") }}</button>
          <div v-if="err == 'dates' && !f.dates.length" class="sm txf-err" role="alert">{{ t("taxes.form.datesErr") }}</div>
        </div>
        <div class="two">
          <div v-if="f.rep != 'dates'" class="fld"><label for="txfD">{{ t("taxes.form.last") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.last')" :data-tip="t('taxes.form.lastTip')" /></label>
            <select id="txfD" v-model.number="f.day"><option v-for="n in DAYS.slice(0, 30)" :key="n" :value="n">{{ n }}</option><option :value="31">{{ t("taxes.form.monthEnd") }}</option></select>
          </div>
          <div v-if="+f.rep > 1" class="fld"><label for="txfM">{{ f.rep == "12" ? t("taxes.form.month") : t("taxes.form.first") }}</label>
            <select id="txfM" v-model.number="f.month"><option v-for="m in MONTHS" :key="m.v" :value="m.v">{{ m.l }}</option></select>
            <div v-if="dueMonths" class="sm txf-due">{{ t("taxes.form.dueIn", { months: dueMonths }) }}</div>
          </div>
          <div class="fld"><label for="txfW">{{ t("taxes.form.want") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.want')" :data-tip="t('taxes.form.wantTip')" /></label>
            <select id="txfW" v-model="f.want"><option value="">{{ t("taxes.form.wantNone") }}</option><option v-for="n in DAYS" :key="n" :value="String(n)">{{ n }}</option></select>
          </div>
          <div class="fld txf-cov"><label for="txfC">{{ t("taxes.form.covers") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.covers')" :data-tip="t('taxes.form.coversTip')" /></label>
            <select id="txfC" v-model="f.covers"><option v-for="c in COVERS" :key="c" :value="String(c)">{{ coversLabel(c) }}</option></select>
          </div>
        </div>
      </template>
    </section>

    <!-- the money that counts: money in and money out by category, only some tags, and money out that counts in part -->
    <section class="txf-s">
      <h4>{{ t("taxes.form.secMoney") }}</h4>
      <template v-for="side in ['in', 'out']" :key="side">
        <label class="tg"><span>{{ t("taxes.form." + side + "On") }}</span><input v-model="f[side + 'On']" type="checkbox"></label>
        <SlideOpen :open="f[side + 'On']">
          <div class="fld txf-cats">
            <label :for="'txfA' + side">{{ t("taxes.form." + side + "Cats") }}<i v-if="side == 'out'" class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.outCats')" :data-tip="t('taxes.form.outTip')" /></label>
            <div class="tcs">
              <span v-for="(k, i) in f[side + 'Cats']" :key="k" class="tchip"><span>{{ categoryName(k, locale) }}</span><button type="button" class="tx2" :aria-label="t('taxes.form.removeCat', { cat: categoryName(k, locale) })" @click="dropCat(side, i)">×</button></span>
              <select :id="'txfA' + side" class="txf-pick" @change="addCat(side, $event)"><option value="">{{ t("taxes.form.addCat") }}</option><option v-for="k in left(side)" :key="k" :value="k">{{ categoryName(k, locale) }}</option></select>
            </div>
            <div v-if="!f[side + 'Cats'].length" class="sm">{{ t("taxes.form.noCats") }}</div>
          </div>
          <label v-if="side == 'in'" class="tg txf-sub"><span>{{ t("taxes.form.salary") }}</span><input v-model="f.salary" type="checkbox"></label>
        </SlideOpen>
      </template>
      <div class="fld txf-tags"><label>{{ t("taxes.form.tags") }}</label>
        <TagEditor :tags="f.tags" @add="addTags" @remove="(i) => f.tags.splice(i, 1)" />
        <div class="sm">{{ t("taxes.form.tagsHint") }}</div>
      </div>
      <template v-if="f.outOn">
        <button type="button" class="txf-fh" :aria-expanded="fold.part" @click="fold.part = !fold.part"><span>{{ t("taxes.form.part") }}</span><span class="sm">{{ partSum }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
        <SlideOpen :open="fold.part">
          <div class="txf-fb">
            <p class="sm txf-hint">{{ t("taxes.form.partHint") }}</p>
            <div v-for="(p, i) in f.part" :key="i" class="txf-row">
              <select v-model="p.tag" :aria-label="t('taxes.form.partTag')"><option value="">{{ t("taxes.form.partChoose") }}</option><option v-for="g in partTags(p)" :key="g" :value="g">{{ g }}</option></select>
              <input v-model="p.pct" class="txf-pct" type="number" inputmode="decimal" min="0" max="100" :aria-label="t('taxes.form.partPct')" :placeholder="t('taxes.form.partPct')" :aria-invalid="err == 'part' && badPct(p.pct)">
              <button type="button" class="ib txf-x" :aria-label="t('taxes.form.removePart')" :data-tip="t('taxes.form.removePart')" @click="f.part.splice(i, 1)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <div v-if="err == 'part' && f.part.some((p) => badPct(p.pct))" class="sm txf-err txf-err-row" role="alert">{{ t("taxes.form.pctErr") }}</div>
            <button type="button" class="btn o s txf-add" @click="f.part.push({ tag: '', pct: '' })">{{ t("taxes.form.addPart") }}</button>
          </div>
        </SlideOpen>
      </template>
    </section>

    <!-- the amount to pay -->
    <section class="txf-s">
      <h4>{{ t("taxes.form.secAmount") }}</h4>
      <div class="two">
        <div class="fld"><label for="txfK">{{ t("taxes.form.amount") }}</label>
          <select id="txfK" v-model="f.amt"><option value="">{{ t("taxes.form.amt.none") }}</option><option v-for="k in AMOUNT_KINDS" :key="k" :value="k">{{ t("taxes.form.amt." + k) }}</option></select>
        </div>
        <div v-if="['in', 'out', 'net'].includes(f.amt)" class="fld"><label for="txfP">{{ t("taxes.form.pct") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.pct')" :data-tip="t('taxes.form.pctTip')" /></label>
          <input id="txfP" v-model="f.pct" type="number" inputmode="decimal" min="0" max="100" :placeholder="t('taxes.form.pctAll')" :aria-invalid="err == 'pct' && badPct(f.pct)">
          <div v-if="err == 'pct' && badPct(f.pct)" class="sm txf-err" role="alert">{{ t("taxes.form.pctErr") }}</div>
        </div>
        <div v-else-if="f.amt == 'fixed'" class="fld"><label for="txfV">{{ t("taxes.form.value") }}</label><MoneyInput id="txfV" v-model="f.value" /></div>
        <div v-else-if="f.amt == 'vat'" class="fld"><label for="txfVr">{{ t("taxes.form.vatRate") }}</label><input id="txfVr" v-model="f.vatRate" type="number" inputmode="decimal" min="0" max="100" :aria-invalid="err == 'vat' && badPct(f.vatRate)">
          <div v-if="err == 'vat' && badPct(f.vatRate)" class="sm txf-err" role="alert">{{ t("taxes.form.pctErr") }}</div>
        </div>
      </div>
      <template v-if="f.amt == 'vat'">
        <label class="tg"><span>{{ t("taxes.form.inclVat") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.inclVat')" :data-tip="t('taxes.form.inclTip')" /></span><input v-model="f.inclVat" type="checkbox"></label>
        <p class="sm txf-hint">{{ t("taxes.form.vatHint") }}</p>
      </template>
    </section>

    <!-- papers each transaction needs, folded -->
    <section class="txf-s">
      <button type="button" class="txf-fh" :aria-expanded="fold.papers" @click="fold.papers = !fold.papers"><span>{{ t("taxes.form.papers") }}</span><span class="sm">{{ papersSum }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
      <SlideOpen :open="fold.papers">
        <div class="txf-fb">
          <p class="sm txf-hint">{{ t("taxes.form.papersHint") }}</p>
          <div v-for="side in ['in', 'out']" :key="side" class="txf-pap">
            <div class="two">
              <div class="fld"><label :for="'txfN' + side">{{ t("taxes.form.papers" + (side == "in" ? "In" : "Out")) }}</label>
                <select :id="'txfN' + side" v-model="f.papers[side].need"><option v-for="k in PAPER_NEEDS" :key="k" :value="k">{{ t("taxes.form.need." + k) }}</option></select>
              </div>
              <div v-if="f.papers[side].need != 'none'" class="fld"><label :for="'txfO' + side">{{ t("taxes.form.over") }}</label><MoneyInput :id="'txfO' + side" v-model="f.papers[side].over" :placeholder="t('taxes.form.overAny')" /></div>
            </div>
            <div v-if="f.papers[side].need != 'none'" class="fld"><label :for="'txfT' + side">{{ t("taxes.form.note") }}</label><input :id="'txfT' + side" v-model="f.papers[side].note" maxlength="200" :placeholder="t('taxes.form.noteEx')" autocomplete="off"></div>
          </div>
        </div>
      </SlideOpen>
    </section>

    <!-- only when: a business type and/or money in this year over a limit, folded -->
    <section class="txf-s">
      <button type="button" class="txf-fh" :aria-expanded="fold.when" @click="fold.when = !fold.when"><span>{{ t("taxes.form.when") }}</span><span class="sm">{{ whenSum }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
      <SlideOpen :open="fold.when">
        <div class="txf-fb">
          <p class="sm txf-hint">{{ t("taxes.form.whenHint") }}</p>
          <div class="fld"><label for="txfY">{{ t("taxes.form.type") }}</label>
            <select id="txfY" v-model="f.type"><option value="">{{ t("taxes.form.anyType") }}</option><option v-for="x in typeOpts" :key="x.id" :value="x.id">{{ x.name }}</option><option v-if="f.type && !typeOpts.some((x) => x.id == f.type)" :value="f.type">{{ typeLabel(f.type) || t("taxes.form.typeGone") }}</option></select>
          </div>
          <div v-if="typeMissing" class="txf-miss"><p class="sm">{{ t("taxes.form.typeNotYet") }}</p><button type="button" class="btn o s" @click="addMine">{{ t("taxes.form.addMine") }}</button></div>
          <button type="button" class="txf-fh txf-fh2" :aria-expanded="fold.types" @click="fold.types = !fold.types"><span>{{ t("taxes.form.editTypes") }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
          <SlideOpen :open="fold.types">
            <div class="txf-fb">
              <p class="sm txf-hint">{{ t("taxes.form.typesHint") }}</p>
              <div v-for="(x, i) in types" :key="x.id" class="txf-row">
                <input v-model="x.name" :aria-label="t('taxes.form.typeName')" :placeholder="t('taxes.form.typeEx')" autocomplete="off">
                <input v-model="x.from" class="txf-from" type="date" :aria-label="t('taxes.form.typeFrom')">
                <button type="button" class="ib txf-x" :aria-label="t('taxes.form.removeType')" :data-tip="t('taxes.form.removeType')" @click="dropType(i)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
              </div>
              <button type="button" class="btn o s txf-add" @click="addType">{{ t("taxes.form.addType") }}</button>
            </div>
          </SlideOpen>
          <div class="two txf-lim">
            <div class="fld"><label for="txfL">{{ t("taxes.form.limit") }}</label><MoneyInput id="txfL" v-model="f.over" :placeholder="t('taxes.form.noLimit')" /></div>
            <div v-if="+f.over > 0" class="fld"><label for="txfNr">{{ t("taxes.form.near") }}<i class="tinfo" tabindex="0" role="button" :aria-label="t('taxes.form.near')" :data-tip="t('taxes.form.nearTip')" /></label><input id="txfNr" v-model="f.near" type="number" inputmode="numeric" min="0" max="100" :placeholder="String(NEAR_PCT)" :aria-invalid="err == 'near' && badPct(f.near)">
              <div v-if="err == 'near' && badPct(f.near)" class="sm txf-err" role="alert">{{ t("taxes.form.pctErr") }}</div>
            </div>
          </div>
        </div>
      </SlideOpen>
    </section>

    <template #actions>
      <BaseButton variant="outline" @click="close">{{ t("taxes.form.cancel") }}</BaseButton>
      <BaseButton @click="save">{{ id != null ? t("taxes.form.saveEdit") : t("taxes.form.saveAdd") }}</BaseButton>
    </template>
  </BaseDialog>
</template>
