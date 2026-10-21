<script setup>
// Activity: every transaction in one list, with search, filters, grouping, sorting, quick category changes, Needs review and Export.
// A copy of the current app's Activity page (web/js/04-transactions.js renderTx/renderRev, 06-trend-forecast-sync.js fillFilters/resetTx).
// The entry window is the shared one (components/tx/TxWindow.vue); other pages open this page with filters through goActivity().
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now, dayOf } from "../core/clock.js";
import { home } from "../core/derived.js";
import { dshort, dcell, dstr } from "../dates.js";
import { dateFormat, readJson, weekStart, writeJson, usePref } from "../core/prefs.js";
import { toast } from "../core/toast.js";
import { sendJson } from "../core/http.js";
import { TP } from "../core/tooltip.js";
import { activityGo } from "../core/shell.js";
import { openTx, openPop } from "../core/txwin.js";
import { openDocs } from "../core/docs.js";
import { openForm } from "../core/forms.js";
import { run, setCategory } from "../core/txact.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { go } from "../router.js";
import * as A from "../lib/txactions.js";
import { allRows, txChips, amtText, SYM, CHIP_ICON } from "../lib/txrows.js";
import { fm, f0 } from "../format.js";
import PageHeader from "../components/PageHeader.vue";
import BaseDialog from "../components/BaseDialog.vue";
import BaseButton from "../components/BaseButton.vue";
import RangeCal from "./RangeCal.vue";
import ExportPanel from "../components/ExportPanel.vue";
import EmText from "../components/EmText.vue";
import { RANGES, kinds, totals, leftOut, filterRows, sortRows, groupRows, GROUPS, hasFilters, displayName, allTags, reviewTransfers, duplicateIds, reviewGaps, gapBill } from "../lib/activity.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a); // for keys built from a value, like "activity.sort." + "new"
const PAGE = 50;
const today = computed(() => dayOf(now.value));
const S = computed(() => data.state.value);
const K = computed(() => kinds(S.value || {}, today.value));
const BC = computed(() => home.value?.billsAll || []);
const dup = computed(() => duplicateIds(S.value));
const name = (x) => displayName(S.value, x);

// ---- the filters ----
const tab = ref("all");
const EMPTY = { q: "", src: "", cat: "", type: "", tag: "" };
// The time frame is remembered under the same key as the current app ("moneyRanges", entry "tx"), so both apps show the same one.
const savedRange = (() => { const r = readJson("moneyRanges", {}).tx; return r && (RANGES.includes(r.p) || r.p === "custom") ? r : null; })();
const f = ref({ ...EMPTY, p: savedRange?.p || "all", from: savedRange?.from || "", to: savedRange?.to || "" });
watch(() => [f.value.p, f.value.from, f.value.to], () => { const j = readJson("moneyRanges", {}); j.tx = { p: f.value.p, from: f.value.from, to: f.value.to }; writeJson("moneyRanges", j); });
const group = usePref("moneyGroup", "month"); // remembered, like the old GMODE
const sort = ref("new");
const focus = ref(null); // { ids: Set, label }: only these entries, opened from another page
const shownCount = ref(PAGE);
const closed = ref(new Set());
watch([f, group, sort, focus, tab], () => { shownCount.value = PAGE; }, { deep: true });
// Start over with only some filters on (resetTx, goActivity, goTag, goCat, clearF).
function reset(o = {}, keepRange) {
  tab.value = o.tab || "all"; focus.value = o.focus ? { ids: new Set(o.focus), label: o.label || "" } : null;
  const range = keepRange ? { p: f.value.p, from: f.value.from, to: f.value.to } : o.from || o.to ? { p: "custom", from: o.from || "", to: o.to || "" } : { p: "all", from: "", to: "" };
  f.value = { ...EMPTY, ...range, cat: o.cat || "", tag: o.tag || "", type: o.ty || "", q: o.q || "", src: o.src || "" };
  if (!keepRange) { sort.value = "new"; group.value = "month"; }
}
const clear = () => reset();
// Another page opened Activity with filters (goActivity in core/shell.js).
const exportFrom = ref("");
watch(activityGo, (o) => { if (!o) return; reset(o, !!o.keepRange); if (o.tab === "exp") exportFrom.value = o.from || ""; activityGo.value = null; }, { immediate: true });

const rows0 = computed(() => allRows(S.value, BC.value, now.value, today.value));
const billOf = (x) => A.billOf(x, BC.value);
const rows = computed(() => (focus.value ? sortRows(rows0.value.filter((x) => focus.value.ids.has(x.id)), sort.value) : sortRows(filterRows(S.value, rows0.value, { ...f.value, ws: weekStart.value, now: now.value, billOf }, K.value), sort.value)));
const T = computed(() => totals(rows.value, K.value));
const lo = computed(() => leftOut(rows.value, K.value));
const filtered = computed(() => hasFilters(f.value) || !!focus.value);
const groups = computed(() => (group.value === "none" || !GROUPS.includes(group.value) ? null : groupRows(rows.value, group.value, sort.value, K.value, weekStart.value)));
const gkey = (g) => group.value + "|" + g.key;
// A group is drawn whole, so its header and its total always match the rows under it.
const visibleGroups = computed(() => {
  if (!groups.value) return null;
  let room = shownCount.value; const out = [];
  for (const g of groups.value) { if (room <= 0 && out.length) break; out.push(g); if (!closed.value.has(gkey(g))) room -= g.rows.length; }
  return out;
});
const visibleRows = computed(() => rows.value.slice(0, shownCount.value));
const drawn = computed(() => (visibleGroups.value ? visibleGroups.value.reduce((n, g) => n + g.rows.length, 0) : visibleRows.value.length));
const more = computed(() => rows.value.length - Math.min(rows.value.length, drawn.value));

const opt = (v, label) => ({ value: v, label });
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const mname = (m, o = "long") => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: o });
const rangeLabel = () => {
  const { from, to } = f.value;
  if (/^\d{4}-\d{2}-01$/.test(from) && to === from.slice(0, 7) + "-31") return mname(from.slice(0, 7)) + " " + from.slice(0, 4);
  return (from && to && from.slice(0, 4) === to.slice(0, 4) ? dshort(from) : from ? dcell(from) : "…") + " – " + (to ? dcell(to) : "…");
};
const rangeOpts = computed(() => [...RANGES.map((r) => opt(r, tk("activity.range." + r))), opt("custom", f.value.p === "custom" ? rangeLabel() : t("activity.range.custom"))]);
const cal = ref(null); // the calendar for "Custom range…", with the select it opens from
function onRange(e) {
  const v = e.target.value;
  if (v === "custom") { cal.value = { anchor: e.target }; return; }
  f.value = { ...f.value, p: v, from: "", to: "" };
}
function calApply(r) { f.value = { ...f.value, p: "custom", from: r.from, to: r.to }; cal.value = null; }
function calCancel() { const a = cal.value?.anchor; cal.value = null; if (a) a.value = f.value.p; }
const groupOpts = computed(() => GROUPS.map((g) => opt(g, tk("activity.group." + g))));
const sortOpts = computed(() => ["new", "old", "big", "small"].map((s) => opt(s, tk("activity.sort." + s))));
const typeOpts = computed(() => [opt("", t("activity.type.all")), ...["income", "expense", "transfer", "bill", "cardpay"].map((x) => opt(x, tk("activity.type." + x)))]);
const cats = computed(() => catNames(S.value).filter((k) => k != "Uncategorized"));
// the filter lists of the current app (fillFilters, tagFill): your accounts, every category with Uncategorized among them, tags in use with their count
const catOpts = computed(() => [opt("", t("activity.allCats")), ...[...new Set([...catNames(S.value), "Uncategorized"])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map((c) => opt(c, catLabel(c)))]);
const srcOpts = computed(() => [opt("", t("activity.allSources")), ...[...new Set((S.value?.accounts || []).filter((a) => a.kind != "pension").map((a) => a.n))].map((a) => opt(a, a))]);
const tagOpts = computed(() => [opt("", t("activity.allTags")), ...allTags(S.value).filter(([, n]) => n > 0).map(([g, n]) => opt(g, g + " (" + n + ")"))]);
watch(tagOpts, (L) => { if (f.value.tag && !L.some((o) => o.value === f.value.tag)) f.value.tag = ""; });

const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(loc(), o);
function groupLabel(L) {
  if (L.day) return dcell(L.day) + " · " + dateFmt(L.day, { weekday: "long" });
  if (L.week) return t("activity.weekOf", { date: dcell(L.week) });
  if (L.month) return mname(L.month) + " " + L.month.slice(0, 4);
  if ("cat" in L) return catLabel(L.cat);
  if (L.type) return tk("activity.type." + (L.type === "expenses" ? "expense" : L.type === "transfers" ? "transfer" : "income"));
  if ("tag" in L) return L.tag || t("activity.noTag");
  return L.name || t("activity.other");
}
const toggle = (g) => { const key = gkey(g), s = new Set(closed.value); s.has(key) ? s.delete(key) : s.add(key); closed.value = s; };
const isXf = (x) => K.value.isXf(x);
const isPos = (x) => x.a > 0 && !isXf(x);
const nohtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
const avStyle = (x) => ({ background: `color-mix(in srgb,${catColor(S.value, x.c || "Uncategorized")} 22%,transparent)`, color: catColor(S.value, x.c || "Uncategorized") });
const chips = (x) => txChips(S.value, x, { K: K.value, dup: dup.value, BC: BC.value });

// What a click on a row opens (openAT): an expected bill opens the bill, a balance update opens the account, the rest the entry window.
function openRow(x) {
  if (x.upBill != null) {
    const b = (S.value.bills || [])[x.upBill]; if (!b) return;
    const L = (home.value?.rows || []).filter((y) => y.a < 0 && !y.virtual && (y.desc + " " + y.to).toLowerCase().includes(b.match)).sort((p, q) => p.d.localeCompare(q.d));
    if (L.length) openTx(L[L.length - 1].id); else openPop("hist", { title: b.n, rows: [], sub: t("txw.chip.bill"), q: b.match });
    return;
  }
  if (x.balUpd) { go("/accounts?n=" + encodeURIComponent(x.from)); return; }
  openTx(x.id);
}
const setCat = (x, c) => setCategory(x.id, c);
// The category of an expected bill: the bill and its latest payment get it (upcat).
function setBillCat(x, v) {
  data.change((S2) => { const b = S2.bills[x.upBill]; if (!b) return false; b.cat = v || ""; const L = S2.tx.filter((y) => y.a < 0 && !y.virtual && (y.desc + " " + y.to).toLowerCase().includes(b.match)).sort((p, q) => p.d.localeCompare(q.d)), lt = L[L.length - 1]; if (lt && lt.c !== v) lt.c = v; return [["Changed bill category", b.n + " → " + (v || "Uncategorized")]]; });
}
const goTag = (g) => reset({ tag: g });
const goCat = (c) => reset({ cat: c || "Uncategorized" });

// ---- the totals line and the group headers ----
const sumTip = computed(() => {
  const L = rows.value, o = lo.value, k = K.value, cnt = L.filter((x) => !(x.balUpd || k.isXf(x) || k.isIgn(x) || k.isFut(x) || k.isCp(x))).length, ks = ["transfers", "cardPays", "upcoming", "balance", "ignored"];
  return TP(t("activity.sumTitle"), [[t("activity.sumIncluded"), String(cnt)], ...ks.filter((key) => o[key]).map((key) => [tk("activity.lot." + key), String(o[key])])], [t(filtered.value ? "activity.sumFilt" : "activity.sumAll"), ...ks.filter((key) => o[key]).map((key) => tk("activity.sumWhy." + key))].join("\n"));
});
const loText = computed(() => { const o = lo.value; return [o.transfers && t("activity.lo.transfers", { n: o.transfers }, o.transfers), o.cardPays && t("activity.lo.cardPays", { n: o.cardPays }, o.cardPays), o.upcoming && t("activity.lo.upcoming", { n: o.upcoming }, o.upcoming), o.balance && t("activity.lo.balance", { n: o.balance }, o.balance), o.ignored && t("activity.lo.ignored", { n: o.ignored })].filter(Boolean).join(", "); });
// A group that is all upcoming shows what is expected; one with bills still to come says "Out so far" (grpSum).
function grpParts(g) {
  if (g.rows.length && g.allFut) return [...(g.E > 0 ? [{ l: t("activity.g.expIn"), v: fm(g.E) }] : []), { l: t("activity.g.expOut"), v: fm(g.P) }, ...(g.E > 0 ? [{ l: t("activity.net"), v: fm(g.E - g.P), neg: g.E - g.P < 0 }] : [])];
  const more = g.P >= 1 || g.E > 0;
  const tip = more ? TP(t("txw.a.stillTitle"), [[t("txw.a.outSoFar"), fm(g.T.out)], ...(g.P >= 1 ? [[t("txw.a.stillOut"), fm(g.P)], [t("txw.a.totalOut"), fm(g.T.out + g.P)]] : []), ...(g.E > 0 ? [[t("txw.a.stillIn"), fm(g.E)]] : []), "---", [t("txw.a.netDone"), fm(g.T.inc + g.E - g.T.out - g.P)]], t("txw.a.stillNote")) : "";
  return [{ l: t("activity.in"), v: fm(g.T.inc) }, { l: more ? t("activity.g.outSoFar") : t("activity.out"), v: fm(g.T.out), tip }, { l: t("activity.net"), v: fm(g.T.net), neg: g.T.net < 0 }];
}
// The table header sticks to the top of the screen and loses its round corners while stuck, like the current app.
const sent = ref(null), stuck = ref(false);
let io = null;
onMounted(() => { if (typeof IntersectionObserver === "undefined") return; io = new IntersectionObserver(([e]) => { stuck.value = !e.isIntersecting && e.boundingClientRect.top < 0; }); watch(sent, (el) => { io.disconnect(); if (el) io.observe(el); }, { immediate: true }); });
onBeforeUnmount(() => io && io.disconnect());

// ---- Needs review ----
const revXf = computed(() => reviewTransfers(S.value));
const revDups = computed(() => (S.value?.tx || []).filter((x) => dup.value.has(x.id)));
const revGaps = computed(() => reviewGaps(S.value, BC.value));
const reviewCount = computed(() => revXf.value.length + revDups.value.length + revGaps.value.filter((r) => r.diff != 0).length);
const gapWhen = (x) => new Date(x).toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const gapAmt = (r) => (SYM[r.cur] || r.cur + " ") + f0(Math.abs(r.diff));
const gapOrig = (r) => (r.amount != r.diff ? t("txw.a.gapPart", { amt: (SYM[r.cur] || r.cur + " ") + f0(r.amount) }) : "");
const gapB = (r) => gapBill(r, BC.value);
async function gapCall(id, what, msg, body) {
  try { await data.api(`/api/gaps/${id}/${what}`, sendJson("POST", body || {})); await data.load(); toast(msg); } catch (e) { toast(e.message, { kind: "err" }); }
}
const gapNote = ref(null); // the gap being dismissed, with the user's note
const gapAdd = (r) => openForm("tx", { gap: { acc: r.n, cur: r.cur, amt: r.diff, date: String(r.to).slice(0, 10) } });

onMounted(() => data.start());
</script>

<template>
  <PageHeader :title="t('activity.title')" />
  <section id="tx" class="view on">
    <div id="txTabs" class="seg" role="tablist" :aria-label="t('activity.title')">
      <button type="button" role="tab" :aria-selected="tab === 'all'" :class="{ on: tab === 'all' }" @click="tab = 'all'">{{ t("activity.all") }}</button>
      <button type="button" role="tab" :aria-selected="tab === 'rev'" :class="{ on: tab === 'rev' }" :data-tip="t('activity.revTip')" @click="tab = 'rev'">{{ t("activity.review") }}{{ reviewCount ? " (" + reviewCount + ")" : "" }}</button>
      <button type="button" role="tab" :aria-selected="tab === 'exp'" :class="{ on: tab === 'exp' }" :data-tip="t('txw.a.expTip')" @click="tab = 'exp'">{{ t("txw.a.exp") }}</button>
    </div>

    <div v-if="tab === 'all'" id="txMain" class="stk">
      <div class="fcard">
        <div class="fbar">
          <div class="fseg" :class="{ on: f.p !== 'all' }"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg><span class="rng"><select :value="f.p" data-always="1" :aria-label="t('activity.timeFrame')" @change="onRange"><option v-for="o in rangeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></span></div>
          <div class="fseg" :class="{ on: !!f.src }"><svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></svg><select v-model="f.src" :aria-label="t('activity.source')"><option v-for="o in srcOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.cat }"><svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z" /><path d="M7.5 8h.01" /></svg><select v-model="f.cat" :aria-label="t('activity.category')"><option v-for="o in catOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.tag }"><svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" /></svg><select v-model="f.tag" :aria-label="t('activity.tag')"><option v-for="o in tagOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.type }"><svg viewBox="0 0 24 24"><path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" /></svg><select v-model="f.type" :aria-label="t('activity.typeLabel')"><option v-for="o in typeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <button type="button" class="fseg fclr" :class="{ off: !filtered }" @click="clear">{{ t("activity.clear") }}</button>
        </div>
        <div class="txs">
          <div class="txs-l"><span class="txs-c mu" :data-tip="sumTip"><svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-6z" /></svg><template v-if="!rows.length">{{ filtered ? t("activity.noMatch") : t("activity.none") }}</template><template v-else><b>{{ filtered ? t("activity.results") : t("activity.all") }}</b><span>{{ t("activity.count", { n: rows.length }, rows.length) }}</span><span v-if="loText" class="txs-x">{{ t("activity.leftOut", { list: loText }) }}</span></template></span></div>
          <div class="txs-g">
            <div :data-tip="t('activity.inTip')"><span>{{ t("activity.in") }}</span><b class="num" dir="ltr">{{ fm(T.inc) }}</b></div>
            <div :data-tip="t('activity.outTip')"><span>{{ t("activity.out") }}</span><b class="num" dir="ltr">{{ fm(T.out) }}</b></div>
            <div :data-tip="t('activity.netTip')"><span>{{ t("activity.net") }}</span><b class="num" :class="{ neg: T.net < 0 }" dir="ltr">{{ fm(T.net) }}</b></div>
          </div>
        </div>
      </div>
      <div v-if="focus" id="txFocus" class="card"><div class="flex" style="justify-content:space-between;gap:10px"><div><b>{{ t("txw.a.focusN", { n: rows.length }, rows.length) }}</b><div class="sm">{{ t("txw.a.focusText", { label: focus.label }) }}</div></div><button type="button" class="btn o s" @click="focus = null">{{ t("txw.a.focusAll") }}</button></div></div>
      <div class="ttool">
        <span class="tsearch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg><input v-model="f.q" type="search" :placeholder="t('activity.search')" :aria-label="t('activity.search')" /></span>
        <span class="vsels">
          <span class="vsel"><svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" /></svg><select v-model="group" :aria-label="t('activity.groupBy')"><option v-for="o in groupOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></span>
          <span class="vsel"><svg viewBox="0 0 24 24"><path d="M4 7h10M4 12h7M4 17h4M17 5v14M17 19l-3-3M17 19l3-3" /></svg><select v-model="sort" :aria-label="t('activity.sortBy')"><option v-for="o in sortOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></span>
        </span>
        <i id="txSent" ref="sent" aria-hidden="true"></i>
      </div>

      <p v-if="!S && data.loading.value" class="sm" style="padding:20px;text-align:center">{{ t("activity.loading") }}</p>
      <template v-else>
        <table id="txTab" class="dtab" :class="{ stuck }">
          <thead><tr><th>{{ t("activity.th.date") }}</th><th>{{ t("activity.th.desc") }}</th><th>{{ t("activity.th.fromTo") }}</th><th>{{ t("activity.category") }}</th><th>{{ t("activity.th.tags") }}</th><th style="text-align:end">{{ t("activity.th.amount") }}</th><th>{{ t("activity.th.docs") }}</th></tr></thead>
          <tbody v-for="g in visibleGroups || [{ key: '', rows: visibleRows }]" :key="g.key" :class="g.label ? ['grp', { closed: closed.has(gkey(g)) }] : 'gu'">
            <tr v-if="g.label" class="ghead" :class="{ closed: closed.has(gkey(g)) }" @click="toggle(g)"><td colspan="7">
              <span class="gtot"><template v-for="(p, i) in grpParts(g)" :key="i"><span v-if="i" class="gdot">·</span><span :class="{ neg: p.neg }" :data-tip="p.tip || undefined">{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></template></span>
              <span class="gc"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></span> <b>{{ groupLabel(g.label) }}</b><span class="gdot">·</span><span class="sm">{{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span>
            </td></tr>
            <template v-if="!closed.has(gkey(g))">
              <tr v-for="x in g.rows" :key="x.id" :class="{ fut: K.isFut(x) }">
                <td class="sm num" style="white-space:nowrap">{{ dcell(x.d) }}</td>
                <td class="mer" style="cursor:pointer" @click="openRow(x)"><div class="mc"><span class="av" :style="avStyle(x)">{{ (name(x) || "?")[0] }}</span><span class="mt" :title="name(x)">{{ name(x) }}</span><template v-for="c in chips(x)" :key="c.cls"><span class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span> </template></div></td>
                <td class="sm ft" :title="nohtml(x.from) + ' → ' + nohtml(x.to)">{{ nohtml(x.from) }} → {{ nohtml(x.to) }}</td>
                <td><select v-if="x.upBill != null" :value="x.c && x.c !== 'Uncategorized' ? x.c : ''" :aria-label="t('activity.category')" :data-tip="t('txw.a.upcatTip')" @change="setBillCat(x, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ catLabel(c) }}</option></select>
                  <span v-else-if="x.virtual || isXf(x)" class="sm">{{ x.c ? catLabel(x.c) : "—" }}</span>
                  <select v-else :value="x.c && x.c !== 'Uncategorized' ? x.c : ''" :aria-label="t('activity.category')" @change="setCat(x, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ catLabel(c) }}</option></select></td>
                <td><span v-for="g2 in x.tags || []" :key="g2" class="tag catl" @click="goTag(g2)">{{ g2 }}</span></td>
                <td class="am" :class="{ pos: isPos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ amtText(x) }}</span><template v-else>{{ amtText(x) }}</template><div v-if="x.orig" class="sm" style="font-weight:400">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }} {{ x.orig.cur }}</div></td>
                <td><button v-if="x.docs && x.docs.length" type="button" class="chip dchip" :aria-label="t('txw.a.attachN', { n: x.docs.length }, x.docs.length)" @click="openDocs(x.id)">📎 {{ x.docs.length }}</button></td>
              </tr>
            </template>
          </tbody>
        </table>
        <div id="txl" class="txl card" style="padding:4px 12px">
          <template v-for="g in visibleGroups || [{ key: '', rows: visibleRows }]" :key="g.key">
            <div v-if="g.label" class="ghead" :class="{ closed: closed.has(gkey(g)) }" @click="toggle(g)"><div class="gh1"><span class="gl"><span class="gc"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></span><b>{{ groupLabel(g.label) }}</b><span class="gdot">·</span><span class="sm">{{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span></span></div><div class="sm" style="margin-top:3px;padding-inline-start:20px"><template v-for="(p, i) in grpParts(g)" :key="i"><span v-if="i" class="gdot">·</span><span :class="{ neg: p.neg }">{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></template></div></div>
            <div v-if="!closed.has(gkey(g))" class="gbm">
              <div v-for="x in g.rows" :key="x.id" class="txi" :class="{ fut: K.isFut(x) }" @click="openRow(x)"><span class="av" :style="avStyle(x)">{{ (name(x) || "?")[0] }}</span><div style="flex:1;min-width:0"><div class="mer" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ name(x) }}</div><div class="sm"><span class="num">{{ dcell(x.d) }}</span> · <span class="catl" @click.stop="goCat(x.c)">{{ catLabel(x.c) }}</span><template v-if="x.docs && x.docs.length"> · <span class="dchip" @click.stop="openDocs(x.id)">📎 {{ x.docs.length }}</span></template></div><div style="margin-top:3px"><template v-for="c in chips(x)" :key="c.cls"><span class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span> </template></div></div><div style="text-align:end"><b class="num" :class="{ pos: isPos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ amtText(x) }}</span><template v-else>{{ amtText(x) }}</template></b><div v-if="x.orig" class="sm" dir="ltr">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }}</div></div></div>
            </div>
          </template>
          <div v-if="!rows.length" class="sm" style="padding:20px;text-align:center">{{ t("activity.nothing") }}</div>
        </div>
      </template>
      <div class="txm"><button v-if="more > 0" type="button" class="btn o" @click="shownCount += PAGE">{{ t("activity.showMore", { n: Math.min(PAGE, more) }) }} <span class="sm" style="margin-inline-start:6px">{{ t("activity.shownOf", { shown: drawn, total: rows.length }) }}</span></button></div>
    </div>

    <div v-else-if="tab === 'rev'" id="txRev" class="stk">
      <h2 style="margin-top:6px">{{ t("activity.r.xfTitle") }}</h2>
      <div v-for="r in revXf" :key="r.x.o" class="xfc">
        <div class="flex" style="justify-content:space-between;gap:10px"><b>{{ r.o.from }} → {{ r.i.to }}</b><span class="sm">{{ dstr(r.o.d) }}</span></div>
        <div class="sm" style="margin:6px 0"><EmText :text="t('activity.r.xfLine2', { sent: fm(-r.o.a), out: r.o.from, arrived: r.i.orig ? (SYM[r.i.orig.cur] || '') + f0(r.i.orig.amt) + ' (≈ ' + fm(r.i.a) + ')' : fm(r.i.a), in: r.i.to })" :em="[r.o.from, r.i.to]" /></div>
        <div style="margin:8px 0"><span class="bd" :class="r.cost > 0.5 ? 'am2' : 'dn'">{{ r.cost > 0.5 ? t("activity.r.cost2", { amt: fm(r.cost), pc: ((r.cost / -r.o.a) * 100).toFixed(1) }) : t("activity.r.noCost") }}</span></div>
        <div class="sm" style="margin-bottom:10px"><EmText :text="r.cost > 0.5 ? t('activity.r.costText') : t('activity.r.noCostText')" :em="['Fees & FX costs']" /></div>
        <div class="flex" style="gap:8px"><button type="button" class="btn s" @click="run(A.xfOk, r.x.o)">{{ t("activity.r.confirm") }}</button><button type="button" class="btn o s" @click="run(A.xfNo, r.x.o)">{{ t("activity.r.notXf") }}</button></div>
      </div>
      <div v-if="!revXf.length" class="card sm">{{ t("activity.r.xfNone") }}</div>

      <h2>{{ t("activity.r.dupTitle") }}</h2>
      <div v-for="x in revDups" :key="x.id" class="xfc">
        <b>{{ name(x) }} · <span dir="ltr">{{ fm(x.a) }}</span></b>
        <div class="sm" style="margin:4px 0 10px"><EmText :text="x.from + ' · ' + dstr(x.d) + ' · ' + t('activity.r.dupWhy')" :em="[x.from]" /></div>
        <div class="flex" style="gap:8px"><button type="button" class="btn r s" @click="run(A.dupDel, x.id)">{{ t("activity.r.dupDel") }}</button><button type="button" class="btn o s" @click="run(A.dupKeep, x.id)">{{ t("activity.r.dupKeep") }}</button></div>
      </div>
      <div v-if="!revDups.length" class="card sm">{{ t("activity.r.dupNone") }}</div>

      <h2>{{ t("activity.r.gapTitle") }}</h2>
      <div class="sm" style="margin:-4px 2px 12px">{{ t("activity.r.gapIntro") }}</div>
      <div v-for="r in revGaps" :key="r.id" class="card warn" style="margin-bottom:12px">
        <div class="flex" style="justify-content:space-between"><div class="lbl">{{ r.n }} · {{ r.cur }}</div><span class="bd" :class="r.diff < 0 ? 'up' : 'dn'">{{ r.diff < 0 ? t("activity.r.down") : t("activity.r.up") }}</span></div>
        <div style="margin:8px 0;font-size:16px;font-weight:600">{{ r.diff < 0 ? t("activity.r.gapOut", { amt: gapAmt(r) }) : t("activity.r.gapIn", { amt: gapAmt(r) }) }}</div>
        <div v-if="gapB(r)" class="sinfo" style="margin:8px 0"><EmText :text="t('txw.a.gapBill', { bill: gapB(r).n, amt: fm(gapB(r).pred), date: dstr(gapB(r).pd) })" :em="[gapB(r).n]" /></div>
        <div class="sm" style="line-height:1.55"><EmText :text="t(r.diff < 0 ? 'txw.a.gapOut' : 'txw.a.gapIn', { name: r.n, amt: gapAmt(r), part: gapOrig(r), from: gapWhen(r.from), to: gapWhen(r.to) })" :em="[r.n]" /><br><EmText :text="t('txw.a.gapCauses')" lead /></div>
        <div class="flex" style="gap:8px;margin-top:12px;flex-wrap:wrap">
          <button type="button" class="btn s" :data-tip="t('txw.a.gapAddTip')" @click="gapAdd(r)">{{ t("activity.r.gapAdd") }}</button>
          <button v-if="r.diff < 0" type="button" class="btn o s" :data-tip="t('activity.r.gapRecTip')" @click="gapCall(r.id, 'record', t('txw.a.recorded'))">{{ t("activity.r.gapRec") }}</button>
          <button type="button" class="btn o s" :data-tip="t('activity.r.gapRevTip')" @click="gapNote = { id: r.id, note: '' }">{{ t("activity.r.gapRev") }}</button>
        </div>
      </div>
      <div v-if="!revGaps.length" class="card sm">{{ t("activity.r.gapNone") }}</div>
    </div>

    <div v-else id="txExp" class="stk"><ExportPanel :from="exportFrom" :filters="{ ...f, focus: focus ? [...focus.ids] : null }" /></div>

    <RangeCal v-if="cal" :from="f.p === 'custom' ? f.from : ''" :to="f.p === 'custom' ? f.to : ''" :anchor="cal.anchor" :df="dateFormat" :ws="weekStart" @apply="calApply" @cancel="calCancel" />

    <!-- Dismissing a balance change, with a note (the current app asks with the browser's prompt) -->
    <BaseDialog :open="!!gapNote" :title="t('activity.r.gapRev')" @update:open="(v) => !v && (gapNote = null)">
      <label v-if="gapNote" class="fld">{{ t("activity.r.gapNoteQ") }}<textarea v-model="gapNote.note" rows="3" /></label>
      <template #actions><BaseButton variant="outline" size="small" @click="gapNote = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!gapNote || !gapNote.note.trim()" @click="gapCall(gapNote.id, 'review', t('txw.a.reviewed'), { note: gapNote.note.trim() }); gapNote = null">{{ t("activity.r.gapRevGo") }}</BaseButton></template>
    </BaseDialog>
  </section>
</template>
