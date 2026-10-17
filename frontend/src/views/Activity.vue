<script setup>
// Activity: every transaction in one list, with search, filters, grouping, sorting, and quick category and tag changes.
// A copy of the current app's Activity page. It reads the shared data store and saves changes with PUT /api/state, like the old page.
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import BaseCard from "../components/BaseCard.vue";
import PageHeader from "../components/PageHeader.vue";
import BaseTabs from "../components/BaseTabs.vue";
import BaseSelect from "../components/BaseSelect.vue";
import BaseButton from "../components/BaseButton.vue";
import BaseChip from "../components/BaseChip.vue";
import BaseTooltip from "../components/BaseTooltip.vue";
import BaseDialog from "../components/BaseDialog.vue";
import EmptyState from "../components/EmptyState.vue";
import MoneyAmount from "../components/MoneyAmount.vue";
import { kinds, totals, leftOut, filterRows, sortRows, groupRows, GROUPS, hasFilters, displayName, allTags, normTag, categoryNames, accountNames, tagOffer, tagSimilar, applyTagRule, reviewTransfers, duplicateIds, reviewGaps, detailRows, flat, prettyKey, cardOf } from "./activity.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a); // for keys built from a value, like "activity.sort." + "new"
const PAGE = 50;
const today = new Date().toISOString().slice(0, 10);
const S = computed(() => data.state.value);

const tab = ref("all");
const tabs = computed(() => [{ value: "all", label: t("activity.all") }, { value: "rev", label: t("activity.review") + (reviewCount.value ? " · " + reviewCount.value : "") }]);
const f = ref({ q: "", src: "", cat: "", type: "", tag: "" });
const group = ref("month");
const sort = ref("new");
const shownCount = ref(PAGE);
const closed = ref(new Set());
const open = ref(null); // the transaction whose tags are being edited
const tagText = ref("");

watch([f, group, sort], () => { shownCount.value = PAGE; }, { deep: true });

const k = computed(() => kinds(S.value, today));
const rows = computed(() => sortRows(filterRows(S.value, S.value?.tx || [], f.value, k.value), sort.value));
const T = computed(() => totals(rows.value, k.value));
const lo = computed(() => leftOut(rows.value, k.value));
const filtered = computed(() => hasFilters(f.value));
const groups = computed(() => (group.value === "none" ? null : groupRows(rows.value, group.value, sort.value, k.value)));
// Groups are drawn whole, so a group's total always matches the rows under it.
const visibleGroups = computed(() => {
  if (!groups.value) return null;
  let room = shownCount.value; const out = [];
  for (const g of groups.value) { if (room <= 0 && out.length) break; out.push(g); if (!closed.value.has(g.key)) room -= g.rows.length; }
  return out;
});
const visibleRows = computed(() => rows.value.slice(0, shownCount.value));
const drawn = computed(() => (visibleGroups.value ? visibleGroups.value.reduce((n, g) => n + g.rows.length, 0) : visibleRows.value.length));
const more = computed(() => rows.value.length - Math.min(rows.value.length, drawn.value));

const opt = (v, label) => ({ value: v, label });
const groupOpts = computed(() => GROUPS.map((g) => opt(g, tk("activity.group." + g))));
const sortOpts = computed(() => ["new", "old", "big", "small"].map((s) => opt(s, tk("activity.sort." + s))));
const typeOpts = computed(() => [opt("", t("activity.type.all")), ...["income", "expense", "transfer", "bill", "cardpay"].map((x) => opt(x, tk("activity.type." + x)))]);
const cats = computed(() => categoryNames(S.value));
const catLabel = (c) => (!c || c === "Uncategorized" ? t("activity.uncategorized") : c);
const catOpts = computed(() => [opt("", t("activity.allCats")), opt("Uncategorized", t("activity.uncategorized")), ...cats.value.map((c) => opt(c, c))]);
const srcOpts = computed(() => [opt("", t("activity.allSources")), ...accountNames(S.value).map((a) => opt(a, a))]);
const tagOpts = computed(() => [opt("", t("activity.allTags")), ...allTags(S.value).map(([g]) => opt(g, g))]);

const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", o);
const day = (d) => dateFmt(d, { day: "numeric", month: "short" });
function groupLabel(L) {
  if (L.day) return day(L.day) + " · " + dateFmt(L.day, { weekday: "long" });
  if (L.week) return t("activity.weekOf", { date: day(L.week) });
  if (L.month) return dateFmt(L.month + "-15", { month: "long", year: "numeric" });
  if ("cat" in L) return catLabel(L.cat);
  if (L.type) return tk("activity.type." + (L.type === "expenses" ? "expense" : L.type === "transfers" ? "transfer" : "income"));
  if ("tag" in L) return L.tag || t("activity.noTag");
  return L.name || t("activity.other");
}
const toggle = (key) => { const s = new Set(closed.value); s.has(key) ? s.delete(key) : s.add(key); closed.value = s; };
const clear = () => { f.value = { q: "", src: "", cat: "", type: "", tag: "" }; };
const plainAmount = (x) => x.balUpd || k.value.isXf(x);
const canEditCat = (x) => !x.virtual && !k.value.isXf(x) && x.upBill == null;

// Saving: change a copy, send the whole state like the old page, then load the fresh copy. 409 means a sync changed the data first.
const saveError = ref("");
async function save(edit, action, detail) {
  const next = structuredClone(S.value);
  if (edit(next) === false) return;
  next.audit = [{ t: new Date().toISOString(), who: "You", action, detail, undo: null }, ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  try {
    const r = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    saveError.value = r.ok ? "" : r.status === 409 ? t("activity.stale") : t("activity.saveFailed");
  } catch { saveError.value = t("activity.saveFailed"); }
  await data.load();
}
const change = (id, edit, action, detail) => save((next) => { const tx = next.tx.find((x) => x.id === id); if (!tx) return false; edit(tx); }, action, detail);
const setCat = (x, c) => change(x.id, (tx) => { tx.c = c || "Uncategorized"; }, "Edited category", x.desc + ": " + (x.c || "—") + " → " + (c || "—"));
function addTags(x, val) {
  const add = String(val).split(",").map((v) => normTag(S.value, v)).filter((g) => g && !(x.tags || []).includes(g));
  tagText.value = "";
  if (!add.length) return;
  change(x.id, (tx) => { tx.tags = [...(tx.tags || []), ...add]; }, "Added tag", x.desc + ": " + add.join(", "));
  offer.value = tagOffer(S.value, { ...x, tags: [...(x.tags || []), ...add] }, add, k.value.ci);
}
const removeTag = (x, g) => change(x.id, (tx) => { tx.tags = (tx.tags || []).filter((y) => y !== g); }, "Removed tag", x.desc + ": " + g);
const tagSuggest = (x) => allTags(S.value).map(([g]) => g).filter((g) => !(x.tags || []).includes(g) && g.toLowerCase().includes(tagText.value.trim().replace(/^#+/, "").toLowerCase())).slice(0, 8);
function onTagKey(e, x) {
  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTags(x, tagText.value); }
  else if (e.key === "Backspace" && !tagText.value && x.tags?.length) removeTag(x, x.tags[x.tags.length - 1]);
  else if (e.key === "Escape") open.value = null;
}

// "Tag more like this?": after a tag is added, offer a rule that tags similar transactions now and in the future (like the current app).
const offer = ref(null); // { id, tags, kw, n }
const rule = ref(null); // the rule window: { id, tags, kw, all }
const ruleMatches = computed(() => (rule.value ? tagSimilar(S.value, rule.value.kw.trim().toLowerCase(), rule.value.id, rule.value.tags) : []));
const toast = ref("");
let toastTimer = null;
const say = (m) => { toast.value = m; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = ""; }, 4000); };
function openRule() { rule.value = { ...offer.value, all: true }; offer.value = null; }
async function saveRule() {
  const r = rule.value, kw = r.kw.trim().toLowerCase();
  if (kw.length < 2) return;
  let res;
  await save((next) => { res = applyTagRule(next, kw, r.tags, r.id, r.all); }, "Added tag rule", `"${kw}" → ${r.tags.join(",")}`);
  rule.value = null;
  say(res.n ? t("activity.ruleDone", { n: res.n }, res.n) : t("activity.ruleDoneNew"));
}

// Needs review: the same three lists as the current app.
const revXf = computed(() => reviewTransfers(S.value));
const dupSet = computed(() => duplicateIds(S.value));
const revDups = computed(() => (S.value?.tx || []).filter((x) => dupSet.value.has(x.id)));
const revGaps = computed(() => reviewGaps(S.value));
const reviewCount = computed(() => revXf.value.length + revDups.value.length + revGaps.value.length);
const xfOk = (r) => save((n) => { n.xf.find((x) => x.o === r.x.o).st = "ok"; }, "Transfer confirmed", r.o.from + " → " + r.i.to);
const xfNo = (o) => save((n) => { n.xf.find((x) => x.o === o).st = "rej"; }, "Not a transfer", "");
const dupDel = (x) => save((n) => { n.tx = n.tx.filter((y) => y.id !== x.id); }, "Deleted duplicate", x.desc + " on " + x.d);
const dupKeep = (x) => save((n) => { n.dupOk = { ...(n.dupOk || {}), [x.id]: 1 }; }, "Kept both transactions", x.desc);
async function gapCall(id, what, body) {
  try { const r = await fetch(`/api/gaps/${id}/${what}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }); if (!r.ok) throw 0; } catch { saveError.value = t("activity.saveFailed"); }
  await data.load();
}
const gapNote = ref(null); // the gap being dismissed, with the user's note
const gapWhen = (x) => new Date(x).toLocaleString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const gapAmt = (r) => Math.abs(r.diff).toLocaleString(locale.value === "he" ? "he-IL" : "en-US", { maximumFractionDigits: 2 }) + " " + r.cur;

// Asking before a change, like the current app's "Yes, do it" box.
const ask = ref(null); // { title, text, danger, run }
const confirm = (title, text, run, danger) => { ask.value = { title, text, run, danger }; };
const askYes = () => { const a = ask.value; ask.value = null; a.run(); };

// The transaction window.
const txOpen = ref(null); // the id
const details = ref({}); // id → what the bank sent, or "load"
const cur = computed(() => (S.value?.tx || []).find((x) => x.id === txOpen.value) || null);
function openTx(x) {
  txOpen.value = x.id;
  if (!x.hasDet) { details.value = { ...details.value, [x.id]: details.value[x.id] || { details: null } }; return; }
  if (details.value[x.id]) return;
  details.value = { ...details.value, [x.id]: "load" };
  fetch("/api/transactions/" + x.id + "/details", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((j) => { details.value = { ...details.value, [x.id]: j || { details: null } }; });
}
const det = computed(() => (cur.value ? details.value[cur.value.id] : null));
const facts = computed(() => (cur.value ? detailRows(S.value, cur.value, det.value === "load" ? null : det.value) : []));
const rawFields = computed(() => (det.value && det.value !== "load" ? flat(det.value.details || {}).filter(([k]) => k !== "account") : []));
const factText = (v) => (v && typeof v === "object" ? (v.date ? dateFmt(v.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : v.key ? tk("activity.d." + v.key) : v) : v);
const kindOf = (x) => (k.value.isXf(x) ? "transfer" : k.value.isCp(x) ? "cardpay" : x.a > 0 ? "income" : "expense");
const canMark = (x) => x.a < 0 && !x.virtual && !k.value.isXf(x) && !k.value.isCp(x);
const pairOf = (x) => (S.value?.xf || []).find((p) => p.st !== "rej" && (p.o === x.id || p.i === x.id));
const setName = (x, v) => save((n) => { n.cfg = n.cfg || {}; n.cfg.renames = { ...(n.cfg.renames || {}) }; if (v.trim()) n.cfg.renames[x.id] = v.trim(); else delete n.cfg.renames[x.id]; }, "Renamed", x.desc + " → " + (v.trim() || "—"));
const setNote = (x, v) => { if ((x.note || "") !== v) change(x.id, (tx) => { tx.note = v; }, "Edited note", x.desc + ": " + (v.slice(0, 40) || "—")); };
const cpMark = (x) => confirm(t("activity.d.cpMarkQ"), t("activity.d.cpMarkText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}), [x.id]: 2 }; }, "Marked as a card payment", x.desc));
const cpCount = (x) => confirm(t("activity.d.cpCountQ"), t("activity.d.cpCountText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}), [x.id]: 1 }; }, "Counted card payment as spending", x.desc));
const cpUncount = (x) => confirm(t("activity.d.cpUncountQ"), t("activity.d.cpUncountText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}) }; delete n.ccOverride[x.id]; }, "Treated as a card payment again", x.desc));
const ignOn = (x) => confirm(t("activity.d.ignOnQ"), t("activity.d.ignOnText"), () => save((n) => { n.txIgnore = { ...(n.txIgnore || {}), [x.id]: 1 }; }, "Left out of totals", x.desc));
const ignOff = (x) => confirm(t("activity.d.ignOffQ"), t("activity.d.ignOffText"), () => save((n) => { n.txIgnore = { ...(n.txIgnore || {}) }; delete n.txIgnore[x.id]; }, "Counted again", x.desc));
const xfNoAsk = (x) => confirm(t("activity.d.xfNoQ"), t("activity.d.xfNoText"), () => xfNo(pairOf(x).o));
const dupDelAsk = (x) => confirm(t("activity.d.dupDelQ"), t("activity.d.dupDelText"), () => { txOpen.value = null; dupDel(x); }, true);
const changes = computed(() => (cur.value ? (S.value?.audit || []).filter((a) => a.undo?.id === cur.value.id || (a.detail || "").startsWith(cur.value.desc)).slice(0, 6) : []));
function copyDetails() {
  const x = cur.value; if (!x) return;
  const lines = [displayName(S.value, x), ...facts.value.map((r) => tk("activity.d." + r.k) + ": " + (r.v?.money != null ? x.a : factText(r.v)))];
  navigator.clipboard?.writeText(lines.join("\n")).then(() => say(t("activity.d.copied")), () => {});
}

onMounted(() => data.start());
</script>

<template>
  <div class="activity">
    <PageHeader :title="t('activity.title')" />
    <BaseTabs v-model="tab" :options="tabs" :label="t('activity.title')" />

    <template v-if="tab === 'all'">
      <div class="tools">
        <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input v-model="f.q" type="search" :placeholder="t('activity.search')" :aria-label="t('activity.search')" /></label>
        <BaseSelect v-model="group" :options="groupOpts" :label="t('activity.groupBy')" />
        <BaseSelect v-model="sort" :options="sortOpts" :label="t('activity.sortBy')" />
      </div>
      <div class="filters">
        <BaseSelect v-model="f.src" :options="srcOpts" :label="t('activity.source')" />
        <BaseSelect v-model="f.cat" :options="catOpts" :label="t('activity.category')" />
        <BaseSelect v-model="f.type" :options="typeOpts" :label="t('activity.typeLabel')" />
        <BaseSelect v-model="f.tag" :options="tagOpts" :label="t('activity.tag')" />
        <BaseButton v-if="filtered" variant="text" @click="clear">{{ t("activity.clear") }}</BaseButton>
      </div>

      <BaseCard class="sum">
        <div class="sum-l">
          <b>{{ !rows.length ? (filtered ? t("activity.noMatch") : t("activity.none")) : filtered ? t("activity.results") : t("activity.all") }}</b>
          <span v-if="rows.length">{{ t("activity.count", { n: rows.length }, rows.length) }}</span>
          <span v-if="lo.transfers + lo.cardPays + lo.upcoming + lo.balance + lo.ignored" class="muted small">{{ t("activity.leftOut", { list: [lo.transfers && t("activity.lo.transfers", { n: lo.transfers }, lo.transfers), lo.cardPays && t("activity.lo.cardPays", { n: lo.cardPays }, lo.cardPays), lo.upcoming && t("activity.lo.upcoming", { n: lo.upcoming }), lo.balance && t("activity.lo.balance", { n: lo.balance }, lo.balance), lo.ignored && t("activity.lo.ignored", { n: lo.ignored })].filter(Boolean).join(", ") }) }}</span>
        </div>
        <div class="sum-g">
          <BaseTooltip :text="t('activity.inTip')"><span class="lab">{{ t("activity.in") }}</span><MoneyAmount :value="T.inc" /></BaseTooltip>
          <BaseTooltip :text="t('activity.outTip')"><span class="lab">{{ t("activity.out") }}</span><MoneyAmount :value="T.out" /></BaseTooltip>
          <BaseTooltip :text="t('activity.netTip')"><span class="lab">{{ t("activity.net") }}</span><MoneyAmount :value="T.net" :class="{ neg: T.net < 0 }" /></BaseTooltip>
        </div>
      </BaseCard>
      <p v-if="saveError" class="err" role="alert">{{ saveError }}</p>

      <BaseCard v-if="!S && data.loading.value"><p class="muted center">{{ t("activity.loading") }}</p></BaseCard>
      <BaseCard v-else-if="!rows.length"><EmptyState :title="filtered ? t('activity.noMatch') : t('activity.none')" :text="filtered ? t('activity.noMatchText') : t('activity.noneText')"><template v-if="filtered" #action><BaseButton variant="tonal" @click="clear">{{ t("activity.clear") }}</BaseButton></template></EmptyState></BaseCard>
      <BaseCard v-else class="list">
        <template v-for="g in visibleGroups || [{ key: '', rows: visibleRows }]" :key="g.key">
          <button v-if="g.label" type="button" class="ghead" :aria-expanded="!closed.has(g.key)" @click="toggle(g.key)">
            <svg class="gc" :class="{ shut: closed.has(g.key) }" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            <b>{{ groupLabel(g.label) }}</b><span class="muted small">· {{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span>
            <span class="gtot small"><span v-if="g.T.inc">{{ t("activity.in") }} <MoneyAmount :value="g.T.inc" size="small" /></span> <span v-if="g.T.out">{{ t("activity.out") }} <MoneyAmount :value="g.T.out" size="small" /></span></span>
          </button>
          <template v-if="!closed.has(g.key)">
            <div v-for="x in g.rows" :key="x.id" class="tx" :class="{ fut: k.isFut(x) }">
              <div class="main">
                <button type="button" class="name" @click="openTx(x)">{{ displayName(S, x) }}</button>
                <div class="muted small"><span dir="ltr" class="num">{{ day(x.d) }}</span> · {{ x.from }} → {{ x.to }}</div>
                <div class="chips">
                  <BaseChip v-for="g2 in x.tags || []" :key="g2" kind="tint">#{{ g2 }}<button type="button" class="rm" :aria-label="t('activity.removeTag')" @click="removeTag(x, g2)">×</button></BaseChip>
                  <BaseChip v-if="k.isXf(x)" kind="info">{{ t("activity.type.transfer") }}</BaseChip>
                  <BaseChip v-if="k.isCp(x)" kind="info">{{ t("activity.type.cardpay") }}</BaseChip>
                  <BaseChip v-if="k.isFut(x)">{{ t("activity.upcoming") }}</BaseChip>
                  <button v-if="open !== x.id" type="button" class="addtag" @click="open = x.id; tagText = ''">{{ x.tags?.length ? t("activity.addMore") : t("activity.addTag") }}</button>
                </div>
                <div v-if="open === x.id" class="tagbox">
                  <input v-model="tagText" class="tin" :placeholder="t('activity.addTag')" :aria-label="t('activity.addTag')" autocomplete="off" @keydown="onTagKey($event, x)" @blur="tagText.trim() && addTags(x, tagText)" />
                  <div class="sug">
                    <BaseChip v-for="s in tagSuggest(x)" :key="s" clickable @click="addTags(x, s)">{{ s }}</BaseChip>
                    <BaseChip v-if="tagText.trim() && !tagSuggest(x).some((s) => s.toLowerCase() === tagText.trim().toLowerCase())" clickable kind="tint" @click="addTags(x, tagText)">{{ t("activity.createTag", { tag: tagText.trim() }) }}</BaseChip>
                    <BaseButton variant="text" @click="open = null">{{ t("common.close") }}</BaseButton>
                  </div>
                </div>
              </div>
              <div class="end">
                <select v-if="canEditCat(x)" class="cat" :value="x.c && x.c !== 'Uncategorized' ? x.c : ''" :aria-label="t('activity.category')" @change="setCat(x, $event.target.value)">
                  <option value="">{{ t("activity.uncategorized") }}</option>
                  <option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
                </select>
                <span v-else class="muted small">{{ catLabel(x.c) }}</span>
                <MoneyAmount :value="x.a" sign :tone="plainAmount(x) ? 'plain' : 'auto'" />
                <span v-if="x.orig" class="muted small" dir="ltr">{{ x.orig.amt }} {{ x.orig.cur }}</span>
              </div>
            </div>
          </template>
        </template>
      </BaseCard>
      <div v-if="more > 0" class="more"><BaseButton variant="outline" @click="shownCount += PAGE">{{ t("activity.showMore", { n: Math.min(PAGE, more) }) }} <span class="muted small">{{ t("activity.shownOf", { shown: drawn, total: rows.length }) }}</span></BaseButton></div>
    </template>

    <template v-else>
      <p v-if="saveError" class="err" role="alert">{{ saveError }}</p>
      <h2>{{ t("activity.r.xfTitle") }}</h2>
      <BaseCard v-for="r in revXf" :key="r.x.o" class="rv">
        <div class="rvh"><b>{{ r.o.from }} → {{ r.i.to }}</b><span class="muted small num">{{ day(r.o.d) }}</span></div>
        <div class="muted small">{{ t("activity.r.xfLine", { out: r.o.from, in: r.i.to }) }} <MoneyAmount :value="-r.o.a" size="small" /> → <MoneyAmount :value="r.i.a" size="small" /></div>
        <div><BaseChip :kind="r.cost > 0.5 ? 'bad' : 'good'">{{ r.cost > 0.5 ? t("activity.r.cost", { pc: (r.cost / -r.o.a * 100).toFixed(1) }) : t("activity.r.noCost") }}<MoneyAmount v-if="r.cost > 0.5" :value="r.cost" size="small" /></BaseChip></div>
        <p class="muted small">{{ r.cost > 0.5 ? t("activity.r.costText") : t("activity.r.noCostText") }}</p>
        <div class="row"><BaseButton @click="xfOk(r)">{{ t("activity.r.confirm") }}</BaseButton><BaseButton variant="outline" @click="xfNo(r.x.o)">{{ t("activity.r.notXf") }}</BaseButton></div>
      </BaseCard>
      <BaseCard v-if="!revXf.length"><p class="muted small">{{ t("activity.r.xfNone") }}</p></BaseCard>

      <h2>{{ t("activity.r.dupTitle") }}</h2>
      <BaseCard v-for="x in revDups" :key="x.id" class="rv">
        <b>{{ displayName(S, x) }} · <MoneyAmount :value="x.a" /></b>
        <div class="muted small">{{ x.from }} · <span class="num">{{ day(x.d) }}</span> · {{ t("activity.r.dupWhy") }}</div>
        <div class="row"><BaseButton variant="danger" @click="dupDel(x)">{{ t("activity.r.dupDel") }}</BaseButton><BaseButton variant="outline" @click="dupKeep(x)">{{ t("activity.r.dupKeep") }}</BaseButton></div>
      </BaseCard>
      <BaseCard v-if="!revDups.length"><p class="muted small">{{ t("activity.r.dupNone") }}</p></BaseCard>

      <h2>{{ t("activity.r.gapTitle") }}</h2>
      <p class="muted small intro">{{ t("activity.r.gapIntro") }}</p>
      <BaseCard v-for="r in revGaps" :key="r.id" class="rv warn">
        <div class="rvh"><span class="muted small">{{ r.n }} · {{ r.cur }}</span><BaseChip :kind="r.diff < 0 ? 'bad' : 'good'">{{ r.diff < 0 ? t("activity.r.down") : t("activity.r.up") }}</BaseChip></div>
        <b class="big">{{ r.diff < 0 ? t("activity.r.gapOut", { amt: gapAmt(r) }) : t("activity.r.gapIn", { amt: gapAmt(r) }) }}</b>
        <p class="muted small">{{ t(r.diff < 0 ? "activity.r.gapTextOut" : "activity.r.gapTextIn", { name: r.n, amt: gapAmt(r), from: gapWhen(r.from), to: gapWhen(r.to) }) }}</p>
        <div class="row">
          <a class="btnlink" href="/activity">{{ t("activity.r.gapAdd") }}</a>
          <BaseTooltip v-if="r.diff < 0" :text="t('activity.r.gapRecTip')"><BaseButton variant="outline" @click="gapCall(r.id, 'record')">{{ t("activity.r.gapRec") }}</BaseButton></BaseTooltip>
          <BaseTooltip :text="t('activity.r.gapRevTip')"><BaseButton variant="outline" @click="gapNote = { id: r.id, note: '' }">{{ t("activity.r.gapRev") }}</BaseButton></BaseTooltip>
        </div>
      </BaseCard>
      <BaseCard v-if="!revGaps.length"><p class="muted small">{{ t("activity.r.gapNone") }}</p></BaseCard>
    </template>

    <p v-if="toast" class="toast" role="status">{{ toast }}</p>

    <!-- "Tag more like this?" -->
    <BaseDialog :open="!!offer" :title="t('activity.offer.title')" @update:open="(v) => !v && (offer = null)">
      <template v-if="offer">{{ offer.n ? t("activity.offer.text", { n: offer.n, kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }, offer.n) : t("activity.offer.none", { kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }) }}</template>
      <template #actions><BaseButton variant="text" @click="offer = null">{{ t("activity.offer.no") }}</BaseButton><BaseButton @click="openRule">{{ t("activity.offer.yes") }}</BaseButton></template>
    </BaseDialog>
    <BaseDialog :open="!!rule" :title="t('activity.offer.ruleTitle')" @update:open="(v) => !v && (rule = null)">
      <template v-if="rule">
        <p>{{ t("activity.offer.ruleText", { tags: rule.tags.map((g) => "#" + g).join(" ") }) }}</p>
        <label class="fld">{{ t("activity.offer.contains") }}<input v-model="rule.kw" class="tin" autocomplete="off" /></label>
        <label class="chk"><input v-model="rule.all" type="checkbox" :disabled="!ruleMatches.length" /><span>{{ ruleMatches.length ? t("activity.offer.alsoTag", { n: ruleMatches.length }, ruleMatches.length) : t("activity.offer.noMatches") }}</span></label>
        <p v-if="ruleMatches.length" class="muted small">{{ ruleMatches.slice(0, 3).map((x) => displayName(S, x)).join(", ") }}{{ ruleMatches.length > 3 ? ", …" : "" }}</p>
      </template>
      <template #actions><BaseButton variant="text" @click="rule = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!rule || rule.kw.trim().length < 2" @click="saveRule">{{ t("activity.offer.create") }}</BaseButton></template>
    </BaseDialog>

    <!-- Dismissing a balance change, with a note -->
    <BaseDialog :open="!!gapNote" :title="t('activity.r.gapRev')" @update:open="(v) => !v && (gapNote = null)">
      <label v-if="gapNote" class="fld">{{ t("activity.r.gapNoteQ") }}<textarea v-model="gapNote.note" class="tin" rows="3" /></label>
      <template #actions><BaseButton variant="text" @click="gapNote = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!gapNote || !gapNote.note.trim()" @click="gapCall(gapNote.id, 'review', { note: gapNote.note.trim() }); gapNote = null">{{ t("activity.r.gapRevGo") }}</BaseButton></template>
    </BaseDialog>

    <!-- The transaction window -->
    <BaseDialog :open="!!cur" :title="cur ? displayName(S, cur) : ''" class="txw" @update:open="(v) => !v && (txOpen = null)">
      <template v-if="cur">
        <div class="txh">
          <span class="muted small"><span class="num">{{ day(cur.d) }}</span> · {{ cur.from }} → {{ cur.to }}</span>
          <MoneyAmount :value="cur.a" sign size="big" :tone="plainAmount(cur) ? 'plain' : 'auto'" />
        </div>
        <div class="chips">
          <BaseChip :kind="kindOf(cur) === 'income' ? 'good' : 'info'">{{ tk("activity.d.kind." + kindOf(cur)) }}</BaseChip>
          <BaseChip v-if="!k.isXf(cur) && cur.c" kind="tint">{{ catLabel(cur.c) }}</BaseChip>
          <BaseChip v-for="g in cur.tags || []" :key="g">#{{ g }}</BaseChip>
        </div>

        <h3>{{ t("activity.d.counted") }}</h3>
        <div class="rels">
          <div v-if="k.isCp(cur)" class="rel"><b>{{ t("activity.type.cardpay") }}</b><span class="small">{{ cardOf(cur, k.ci) ? t("activity.d.cpText", { card: cardOf(cur, k.ci) }) : t("activity.d.cpTextAny") }}</span><BaseButton variant="outline" @click="cpCount(cur)">{{ t("activity.d.cpCount") }}</BaseButton></div>
          <div v-else-if="S.ccOverride?.[cur.id] == 1" class="rel"><b>{{ t("activity.d.counted1") }}</b><span class="small">{{ t("activity.d.counted1Text") }}</span><BaseButton variant="outline" @click="cpUncount(cur)">{{ t("activity.d.cpUncount") }}</BaseButton></div>
          <div v-if="pairOf(cur)" class="rel"><b>{{ t("activity.type.transfer") }}</b><span class="small">{{ t("activity.d.xfText") }}</span><BaseButton variant="outline" @click="xfNoAsk(cur)">{{ t("activity.r.notXf") }}</BaseButton></div>
          <div v-if="k.isIgn(cur)" class="rel"><b>{{ t("activity.d.ignTitle") }}</b><span class="small">{{ t("activity.d.ignText") }}</span><BaseButton variant="outline" @click="ignOff(cur)">{{ t("activity.d.ignOff") }}</BaseButton></div>
          <div v-if="k.isFut(cur)" class="rel"><b>{{ t("activity.upcoming") }}</b><span class="small">{{ t("activity.d.futText") }}</span></div>
          <div v-if="dupSet.has(cur.id)" class="rel amber"><b>{{ t("activity.d.dupTitle") }}</b><span class="small">{{ t("activity.d.dupText") }}</span><div class="row"><BaseButton variant="danger" @click="dupDelAsk(cur)">{{ t("activity.r.dupDel") }}</BaseButton><BaseButton variant="outline" @click="dupKeep(cur)">{{ t("activity.r.dupKeep") }}</BaseButton></div></div>
          <p v-if="!k.isCp(cur) && S.ccOverride?.[cur.id] != 1 && !pairOf(cur) && !k.isIgn(cur) && !k.isFut(cur) && !dupSet.has(cur.id)" class="muted small">{{ cur.a > 0 ? t("activity.d.normalIn") : t("activity.d.normalOut") }}</p>
        </div>

        <template v-if="!cur.virtual && !k.isXf(cur)">
          <h3>{{ t("activity.d.organise") }}</h3>
          <label class="fld">{{ t("activity.d.displayName") }}<input class="tin" :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="displayName(S, cur)" maxlength="80" @change="setName(cur, $event.target.value)" /></label>
          <label class="fld">{{ t("activity.category") }}<select class="tin" :value="cur.c && cur.c !== 'Uncategorized' ? cur.c : ''" @change="setCat(cur, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select></label>
          <div class="fld">{{ t("activity.tag") }}
            <div class="chips"><BaseChip v-for="g in cur.tags || []" :key="g" kind="tint">#{{ g }}<button type="button" class="rm" :aria-label="t('activity.removeTag')" @click="removeTag(cur, g)">×</button></BaseChip></div>
            <input v-model="tagText" class="tin" :placeholder="t('activity.addTag')" :aria-label="t('activity.addTag')" autocomplete="off" @keydown="onTagKey($event, cur)" />
            <div v-if="tagText.trim()" class="sug"><BaseChip v-for="s in tagSuggest(cur)" :key="s" clickable @click="addTags(cur, s)">{{ s }}</BaseChip><BaseChip v-if="!tagSuggest(cur).some((s) => s.toLowerCase() === tagText.trim().toLowerCase())" clickable kind="tint" @click="addTags(cur, tagText)">{{ t("activity.createTag", { tag: tagText.trim() }) }}</BaseChip></div>
          </div>
        </template>
        <label v-if="!cur.virtual" class="fld">{{ t("activity.d.note") }}<textarea class="tin" rows="2" :value="cur.note || ''" :placeholder="t('activity.d.notePh')" @change="setNote(cur, $event.target.value)" /></label>

        <template v-if="canMark(cur) || (!cur.virtual && !k.isXf(cur) && !k.isCp(cur) && !k.isIgn(cur))">
          <h3>{{ t("activity.d.actions") }}</h3>
          <div class="row">
            <BaseButton v-if="canMark(cur)" variant="outline" @click="cpMark(cur)">{{ t("activity.d.cpMark") }}</BaseButton>
            <BaseButton v-if="!cur.virtual && !k.isXf(cur) && !k.isCp(cur) && !k.isIgn(cur)" variant="outline" @click="ignOn(cur)">{{ t("activity.d.ignOn") }}</BaseButton>
          </div>
        </template>

        <h3>{{ t("activity.d.details") }}</h3>
        <dl class="kv">
          <template v-for="r in facts" :key="r.k"><dt>{{ tk("activity.d." + r.k) }}</dt><dd :class="{ mono: r.mono }"><MoneyAmount v-if="r.v && r.v.money != null" :value="r.v.money" sign /><template v-else>{{ factText(r.v) }}</template></dd></template>
        </dl>
        <p v-if="det === 'load'" class="muted small">{{ t("activity.d.loading") }}</p>
        <p v-else-if="cur.src === 'manual'" class="muted small">{{ t("activity.d.manual") }}</p>
        <p v-else-if="!det?.details" class="muted small">{{ t("activity.d.old") }}</p>
        <details v-if="rawFields.length" class="raw"><summary>{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }} ({{ rawFields.length }})</summary>
          <dl class="kv"><template v-for="[a, b] in rawFields" :key="a"><dt>{{ prettyKey(a) }}</dt><dd>{{ b }}</dd></template></dl>
        </details>

        <template v-if="changes.length">
          <h3>{{ t("activity.d.history") }}</h3>
          <div v-for="a in changes" :key="a.t + a.action" class="small"><b>{{ a.action }}</b> <span class="muted">{{ gapWhen(a.t) }}</span><div class="muted">{{ a.detail }}</div></div>
        </template>
      </template>
      <template #actions><BaseButton variant="outline" @click="copyDetails">{{ t("activity.d.copy") }}</BaseButton><a class="btnlink" href="/activity">{{ t("activity.d.more") }}</a><BaseButton @click="txOpen = null">{{ t("activity.d.done") }}</BaseButton></template>
    </BaseDialog>

    <BaseDialog :open="!!ask" :title="ask ? ask.title : ''" @update:open="(v) => !v && (ask = null)">
      <template v-if="ask">{{ ask.text }}</template>
      <template #actions><BaseButton variant="outline" @click="ask = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :variant="ask && ask.danger ? 'danger' : 'filled'" @click="askYes">{{ t("activity.d.yes") }}</BaseButton></template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.activity { display: flex; flex-direction: column; gap: var(--sp4); }
.activity > header { margin-bottom: 6px; }
.tools, .filters { display: grid; gap: var(--sp3); grid-template-columns: 2fr 1fr 1fr; align-items: end; }
.filters { grid-template-columns: repeat(4, 1fr) auto; }
.search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--ol); border-radius: 14px; background: var(--s1); padding-inline: 12px; min-height: 42px; }
.search svg { width: 18px; height: 18px; fill: none; stroke: var(--tx2); stroke-width: 2; flex: none; }
.search input { border: 0; background: none; color: var(--tx); font-size: var(--fs); flex: 1; min-width: 0; outline: none; }
.sum :deep(*) { box-sizing: border-box; }
.sum { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--sp3); }
.sum-l { display: flex; flex-direction: column; gap: 2px; }
.sum-g { display: flex; gap: var(--sp5, 24px); }
.sum-g > * { display: flex; flex-direction: column; cursor: default; }
.lab { font-size: 12px; color: var(--tx2); margin-inline-end: 4px; }
.neg { color: var(--neg); }
.muted { color: var(--tx2); }
.small { font-size: var(--fs-sm); }
.center { text-align: center; }
.err { color: var(--neg); margin: 0; }
.ghead { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; width: 100%; padding: 12px 4px; border: 0; background: none; color: inherit; cursor: pointer; text-align: start; border-block-end: 1px solid var(--ol); }
.ghead:focus-visible { outline: 2px solid var(--acc); }
.gc { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; transition: transform .15s; }
.gc.shut { transform: rotate(-90deg); }
:global(html.he .gc.shut) { transform: rotate(90deg); }
.gtot { margin-inline-start: auto; color: var(--tx2); }
.tx { display: flex; gap: 12px; padding: 12px 4px; border-block-end: 1px solid var(--ol); }
.tx.fut { opacity: .7; }
.main { flex: 1; min-width: 0; }
.name { display: block; max-width: 100%; border: 0; background: none; color: inherit; font: inherit; font-weight: 600; padding: 0; text-align: start; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name:hover { color: var(--acc); }
.name:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
h2 { font-size: 18px; font-weight: 600; margin: var(--sp2) 0 0; }
h3 { font-size: 14px; font-weight: 600; margin: var(--sp4) 0 var(--sp2); color: var(--tx); }
.rv { display: flex; flex-direction: column; gap: var(--sp2); }
.rv p { margin: 0; }
.rvh { display: flex; justify-content: space-between; align-items: center; gap: var(--sp3); }
.big { font-size: 16px; }
.intro { margin: -8px 2px 0; }
.row { display: flex; flex-wrap: wrap; gap: var(--sp2); align-items: center; }
.btnlink { display: inline-flex; align-items: center; min-height: 40px; padding: 0 var(--sp4); border-radius: var(--pill); border: 1px solid var(--ol); color: var(--acc); text-decoration: none; font-weight: 600; }
.toast { position: fixed; inset-inline: 0; bottom: calc(90px + var(--sb)); margin: 0 auto; width: fit-content; max-width: 90vw; padding: 10px 18px; border-radius: var(--pill); background: var(--tx); color: var(--bg); z-index: 30; }
.fld { display: grid; gap: 4px; margin-bottom: var(--sp3); color: var(--tx); font-size: 13px; }
.chk { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--tx); }
.txh { display: flex; justify-content: space-between; align-items: center; gap: var(--sp3); flex-wrap: wrap; }
.rels { display: grid; gap: var(--sp2); }
.rel { display: grid; gap: 4px; justify-items: start; padding: var(--sp3); border-radius: var(--r-md); background: var(--s1); color: var(--tx); }
.rel.amber { background: color-mix(in srgb, var(--warn) 14%, var(--bg)); }
.kv { display: grid; grid-template-columns: minmax(7rem, auto) 1fr; gap: 6px var(--sp3); margin: 0; font-size: 13px; }
.kv dt { color: var(--tx2); }
.kv dd { margin: 0; color: var(--tx); overflow-wrap: anywhere; }
.mono { font-family: ui-monospace, monospace; direction: ltr; unicode-bidi: isolate; text-align: start; }
.raw { margin-top: var(--sp3); }
.raw summary { cursor: pointer; color: var(--acc); font-size: 13px; margin-bottom: var(--sp2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.rm { border: 0; background: none; color: inherit; cursor: pointer; padding: 0 0 0 2px; font-size: 14px; line-height: 1; }
.addtag { border: 1px dashed var(--ol); border-radius: 10px; background: none; color: var(--tx2); font-size: 12px; padding: 4px 10px; cursor: pointer; }
.tagbox { margin-top: 8px; display: grid; gap: 6px; }
.tin { font-size: var(--fs); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--ol); background: var(--s1); color: var(--tx); }
.sug { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
.cat { font-size: 13px; padding: 4px 8px; border-radius: 10px; border: 1px solid var(--ol); background: var(--s1); color: var(--tx); max-width: 11rem; cursor: pointer; }
.more { display: flex; justify-content: center; }
.back { color: var(--acc); }
@media (max-width: 760px) {
  .tools { grid-template-columns: 1fr 1fr; } .search { grid-column: 1 / -1; }
  .filters { grid-template-columns: 1fr 1fr; }
  .search input, .tin { font-size: 16px; }
  .cat { max-width: 8rem; }
}
</style>
