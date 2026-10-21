<script setup>
// Activity: every transaction in one list, with search, filters, grouping, sorting, and quick category and tag changes.
// A copy of the current app's Activity page. It reads the shared data store and saves changes with PUT /api/state, like the old page.
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home } from "../core/derived.js";
import { dshort, dcell } from "../dates.js";
import { dateFormat, readJson, weekStart, writeJson } from "../core/prefs.js";
import { toast } from "../core/toast.js";
import { request, sendJson } from "../core/http.js";
import PageHeader from "../components/PageHeader.vue";
import BaseButton from "../components/BaseButton.vue";
import BaseChip from "../components/BaseChip.vue";
import BaseTooltip from "../components/BaseTooltip.vue";
import BaseDialog from "../components/BaseDialog.vue";
import RangeCal from "./RangeCal.vue";
import BaseSheet from "../components/BaseSheet.vue";
import MoneyAmount from "../components/MoneyAmount.vue";
import { RANGES, rmOf, instOf, NFIELDS, nameField, nameHit, kinds, totals, leftOut, filterRows, sortRows, groupRows, GROUPS, hasFilters, displayName, allTags, normTag, categoryNames, accountNames, tagOffer, tagSimilar, applyTagRule, reviewTransfers, duplicateIds, reviewGaps, detailRows, flat, prettyKey, cardOf } from "./activity.js";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a); // for keys built from a value, like "activity.sort." + "new"
const PAGE = 50;
const today = new Date().toISOString().slice(0, 10);
const S = computed(() => data.state.value);

const tab = ref("all");
// The time frame is remembered in the browser under the same key as the current app ("moneyRanges", entry "tx"), so both apps show the same one.
const savedRange = (() => { try { const r = readJson("moneyRanges", {}).tx; return r && (RANGES.includes(r.p) || r.p === "custom") ? r : null; } catch { return null; } })();
const f = ref({ q: "", src: "", cat: "", type: "", tag: "", p: savedRange?.p || "all", from: savedRange?.from || "", to: savedRange?.to || "" });
watch(() => [f.value.p, f.value.from, f.value.to], () => { try { const j = readJson("moneyRanges", {}); j.tx = { p: f.value.p, from: f.value.from, to: f.value.to }; writeJson("moneyRanges", (j)); } catch { /* the browser may not allow saving */ } });
const group = ref("month");
const sort = ref("new");
const shownCount = ref(PAGE);
const closed = ref(new Set());
const open = ref(null); // the transaction whose tags are being edited
const tagText = ref("");

watch([f, group, sort], () => { shownCount.value = PAGE; }, { deep: true });

const k = computed(() => kinds(S.value, today));
const rows = computed(() => sortRows(filterRows(S.value, S.value?.tx || [], { ...f.value, ws: weekStart.value }, k.value), sort.value));
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
const rangeLabel = () => {
  const { from, to } = f.value;
  if (/^\d{4}-\d{2}-01$/.test(from) && to === from.slice(0, 7) + "-31") return mname(from.slice(0, 7)) + " " + from.slice(0, 4);
  const short = dshort;
  return (from && to && from.slice(0, 4) === to.slice(0, 4) ? short(from) : from ? dcell(from) : "…") + " – " + (to ? dcell(to) : "…");
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
const cats = computed(() => categoryNames(S.value));
const catLabel = (c) => (!c || c === "Uncategorized" ? t("activity.uncategorized") : c);
const catOpts = computed(() => [opt("", t("activity.allCats")), opt("Uncategorized", t("activity.uncategorized")), ...cats.value.map((c) => opt(c, c))]);
const srcOpts = computed(() => [opt("", t("activity.allSources")), ...accountNames(S.value).map((a) => opt(a, a))]);
const tagOpts = computed(() => [opt("", t("activity.allTags")), ...allTags(S.value).map(([g]) => opt(g, g))]);

const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", o);
const day = (d) => dateFmt(d, { day: "numeric", month: "short" });
function groupLabel(L) {
  if (L.day) return dcell(L.day) + " · " + dateFmt(L.day, { weekday: "long" });
  if (L.week) return t("activity.weekOf", { date: dcell(L.week) });
  if (L.month) return mname(L.month) + " " + L.month.slice(0, 4);
  if ("cat" in L) return catLabel(L.cat);
  if (L.type) return tk("activity.type." + (L.type === "expenses" ? "expense" : L.type === "transfers" ? "transfer" : "income"));
  if ("tag" in L) return L.tag || t("activity.noTag");
  return L.name || t("activity.other");
}
const toggle = (key) => { const s = new Set(closed.value); s.has(key) ? s.delete(key) : s.add(key); closed.value = s; };
const clear = () => { f.value = { q: "", src: "", cat: "", type: "", tag: "", p: "all", from: "", to: "" }; };
const plainAmount = (x) => x.balUpd || k.value.isXf(x);
const canEditCat = (x) => !x.virtual && !k.value.isXf(x) && x.upBill == null;

// The way the current app writes things: dates as 05/10/2026 (or 10/05/2026 when the user chose month first), money as ₪1,250 or −₪80.
const f0 = (n) => Math.abs(n).toLocaleString("en-IL", { maximumFractionDigits: 0 });
const fm = (n) => (n < 0 ? "−" : "") + "₪" + f0(n);
const SYM = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
const amtT = (x) => (x.upBill != null ? "≈ " : "") + (x.a > 0 ? "+" : "−") + "₪" + f0(x.a);
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const mname = (m, o = "long") => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: o });
// The colored first letter in front of each name, in its category's color.
const catColor = (c) => { const n = c || "Uncategorized", i = S.value?.cats?.[n]; return n === "Income" || i === 99 ? "var(--pos)" : `var(--c${(i == null ? 6 : i) % 7})`; };
const avStyle = (x) => ({ background: `color-mix(in srgb,${catColor(x.c)} 22%,transparent)`, color: catColor(x.c) });
const initial = (x) => (displayName(S.value, x) || "?")[0];
const isPos = (x) => x.a > 0 && !k.value.isXf(x);
const inst = instOf;
// The small colored labels after a name, the same ones and in the same order as the current app.
function chips(x) {
  const out = [], K = k.value, add = (cls, label, tip, icon) => out.push({ cls, label, tip, icon });
  if (x.balUpd) add("p-bal", t("activity.chip.bal"), t("activity.chip.balTip"));
  if (x.jar) { const j = (S.value.jars || []).find((y) => y.id == x.jar.id); if (j) add("p-jar", t("activity.chip.jar", { n: j.n }), t("activity.chip.jarTip", { n: j.n })); }
  { const i = inst(x); if (i && x.a < 0) add("p-inst", i.n + "/" + i.total, i.total > i.n ? t("activity.chip.instTip", { n: i.n, total: i.total, more: i.total - i.n }, i.total - i.n) : t("activity.chip.instLast", { n: i.n, total: i.total })); }
  if (rmOf(x) && !x.virtual) { const m = rmOf(x), lab = mname(m, "short") + " " + m.slice(0, 4); add("p-mv", t(m > String(x.d).slice(0, 7) ? "activity.chip.pushed" : "activity.chip.moved", { m: lab }), t("activity.chip.movedTip", { d: dcell(x.d), m: mname(m) + " " + m.slice(0, 4) })); }
  if (x.pending && !x.virtual) add("p-pend", t("activity.chip.pending"), t("activity.chip.pendingTip"));
  if (K.isIgn(x)) add("p-ign", t("activity.chip.ignored"), t("activity.chip.ignoredTip"));
  if (K.isCp(x)) add("p-card", t("activity.chip.cardpay"), t("activity.chip.cardpayTip", { card: cardOf(x, K.ci) || t("activity.chip.card") }));
  if (x.upBill == null && K.isFut(x)) add("p-up", t("activity.chip.upcoming"), t("activity.chip.upcomingTip", { d: dcell(x.d) }));
  if (K.isXf(x)) add("p-xf", t("activity.chip.xf"), t("activity.chip.xfTip"), "xf");
  if (dupSet.value.has(x.id)) add("p-dup", t("activity.chip.dup"), t("activity.chip.dupTip"));
  if (x.virtual && x.upBill == null) add("p-auto", t("activity.chip.auto"), t("activity.chip.autoTip"));
  if (x.note) add("p-note", "", String(x.note).slice(0, 600), "note");
  return out;
}
// The "How In, Out and Net are counted" tooltip.
const sumTip = computed(() => {
  const L = rows.value, o = lo.value, cnt = L.length - L.filter((x) => x.balUpd || k.value.isXf(x) || k.value.isIgn(x) || k.value.isFut(x) || k.value.isCp(x)).length;
  const parts = [t("activity.sumTitle") + ".", t("activity.sumIncluded") + ": " + cnt + "."];
  for (const key of ["transfers", "cardPays", "upcoming", "balance", "ignored"]) if (o[key]) parts.push(tk("activity.lot." + key) + ": " + o[key] + ".");
  parts.push(t(filtered.value ? "activity.sumFilt" : "activity.sumAll"));
  for (const key of ["transfers", "cardPays", "upcoming", "balance", "ignored"]) if (o[key]) parts.push(tk("activity.sumWhy." + key));
  return parts.join(" ");
});
const loText = computed(() => { const o = lo.value; return [o.transfers && t("activity.lo.transfers", { n: o.transfers }, o.transfers), o.cardPays && t("activity.lo.cardPays", { n: o.cardPays }, o.cardPays), o.upcoming && t("activity.lo.upcoming", { n: o.upcoming }), o.balance && t("activity.lo.balance", { n: o.balance }, o.balance), o.ignored && t("activity.lo.ignored", { n: o.ignored })].filter(Boolean).join(", "); });
// A group header's numbers. A group that is all upcoming shows what is expected; one with bills still to come says "Out so far".
function grpParts(g) {
  if (g.rows.length && g.allFut) return [...(g.E > 0 ? [{ l: t("activity.g.expIn"), v: fm(g.E) }] : []), { l: t("activity.g.expOut"), v: fm(g.P) }, ...(g.E > 0 ? [{ l: t("activity.net"), v: fm(g.E - g.P), neg: g.E - g.P < 0 }] : [])];
  const more = g.P >= 1 || g.E > 0;
  const tip = more ? [t("activity.g.title") + ".", t("activity.g.outSoFar") + ": " + fm(g.T.out) + ".", ...(g.P >= 1 ? [t("activity.g.stillOut") + ": " + fm(g.P) + ".", t("activity.g.totalOut") + ": " + fm(g.T.out + g.P) + "."] : []), ...(g.E > 0 ? [t("activity.g.stillIn") + ": " + fm(g.E) + "."] : []), t("activity.g.netDone") + ": " + fm(g.T.inc + g.E - g.T.out - g.P) + ".", t("activity.g.note")].join(" ") : "";
  return [{ l: t("activity.in"), v: fm(g.T.inc) }, { l: more ? t("activity.g.outSoFar") : t("activity.out"), v: fm(g.T.out), tip }, { l: t("activity.net"), v: fm(g.T.net), neg: g.T.net < 0 }];
}
// The table header sticks to the top of the screen and loses its round corners while stuck, like the current app.
const sent = ref(null), stuck = ref(false);
let io = null;
onMounted(() => { if (typeof IntersectionObserver === "undefined") return; io = new IntersectionObserver(([e]) => { stuck.value = !e.isIntersecting && e.boundingClientRect.top < 0; }); watch(sent, (el) => { io.disconnect(); if (el) io.observe(el); }, { immediate: true }); });
onBeforeUnmount(() => io && io.disconnect());

// Saving: change a copy, send the whole state like the old page, then load the fresh copy. 409 means a sync changed the data first.
// Saving goes through the data store (stores/data.js), which shows "Saved" or "Not saved" by itself.
function save(edit, action, detail, undo) {
  data.change((next) => (edit(next) === false ? false : [[action, detail, undo]]));
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
const say = (m, kind = "ok") => toast(m, { kind }); // the toasts at the bottom of the page (core/toast.js)
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
const revGaps = computed(() => reviewGaps(S.value, home.value?.billsAll));
const reviewCount = computed(() => revXf.value.length + revDups.value.length + revGaps.value.length);
const xfOk = (r) => save((n) => { n.xf.find((x) => x.o === r.x.o).st = "ok"; }, "Transfer confirmed", r.o.from + " → " + r.i.to);
const xfNo = (o) => save((n) => { n.xf.find((x) => x.o === o).st = "rej"; }, "Not a transfer", "");
const dupDel = (x) => save((n) => { n.tx = n.tx.filter((y) => y.id !== x.id); }, "Deleted duplicate", x.desc + " on " + x.d);
const dupKeep = (x) => save((n) => { n.dupOk = { ...(n.dupOk || {}), [x.id]: 1 }; }, "Kept both transactions", x.desc);
async function gapCall(id, what, body) {
  try { await data.api(`/api/gaps/${id}/${what}`, sendJson("POST", body || {})); } catch { say(t("activity.saveFailed"), "err"); }
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
  request("/api/transactions/" + x.id + "/details", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((j) => { details.value = { ...details.value, [x.id]: j || { details: null } }; });
}
const det = computed(() => (cur.value ? details.value[cur.value.id] : null));
const facts = computed(() => (cur.value ? detailRows(S.value, cur.value, det.value === "load" ? null : det.value) : []));
const rawFields = computed(() => (det.value && det.value !== "load" ? flat(det.value.details || {}).filter(([k]) => k !== "account") : []));
const factText = (v) => {
  if (v && typeof v === "object") {
    if (v.date) return dateFmt(v.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    if (v.key) return tk("activity.d." + v.key);
    if (v.amtDir != null) return (v.amtDir < 0 ? "−" : "") + "₪" + f0(v.amtDir) + " " + (v.amtDir < 0 ? t("activity.d.amtOut") : t("activity.d.amtIn"));
    if (v.inst) return v.inst.total > v.inst.n ? t("activity.d.instRowLeft", { n: v.inst.n, total: v.inst.total, rest: v.inst.total - v.inst.n }) : t("activity.d.instRowLast", { n: v.inst.n, total: v.inst.total });
  }
  return v;
};
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
  const lines = [displayName(S.value, x), ...facts.value.map((r) => tk("activity.d." + r.k) + ": " + factText(r.v))];
  navigator.clipboard?.writeText(lines.join("\n")).then(() => say(t("activity.d.copied")), () => {});
}

// The transaction window's pieces, the same as the current app's openTx (web/js/04-transactions.js).
const TIC = { hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', jar: '<path d="M8 3h8M9 3v3M15 3v3M6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>', off: '<path d="M3 3l18 18M10.6 6.2A9.5 9.5 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.3 6.3C3.8 8 2 12 2 12s4 6 10 6a9 9 0 0 0 3.5-.7"/>', swap: '<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>', warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.01"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>', inst: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h2"/>' };
const sec = ref({}); // which sections of the window are open
watch(() => txOpen.value, () => { sec.value = {}; });
const toggleSec = (key, ev) => { sec.value = { ...sec.value, [key]: ev.target.open }; };
const kindCls = (x) => (k.value.isXf(x) ? "tf" : k.value.isCp(x) ? "cpm" : x.a > 0 ? "in" : "out");
const goCat = (c) => { txOpen.value = null; tab.value = "all"; f.value = { ...f.value, cat: c }; };
const goTag = (g) => { txOpen.value = null; tab.value = "all"; f.value = { ...f.value, tag: g }; };
const monYr = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x.toLocaleDateString(loc(), { month: "short", year: "numeric" }); };
const tagOpen = ref(false);
const tagPicks = (x) => { const cur = (x.tags || []).map((g) => g.toLowerCase()), q = tagText.value.trim().replace(/^#+/, "").toLowerCase(); return allTags(S.value).filter(([g]) => !cur.includes(g.toLowerCase()) && (!q || g.toLowerCase().includes(q))).slice(0, 40); };
const tagNew = (x) => { const q = tagText.value.trim().replace(/^#+/, ""); return q && !allTags(S.value).some(([g]) => g.toLowerCase() === q.toLowerCase()) && !(x.tags || []).some((g) => g.toLowerCase() === q.toLowerCase()); };
const onTagBlur = (x) => { if (tagText.value.trim()) addTags(x, tagText.value); setTimeout(() => { tagOpen.value = false; }, 150); };
const rels = computed(() => {
  const x = cur.value; if (!x) return [];
  const K = k.value, out = [], real = !x.virtual, pair = K.isXf(x) ? pairOf(x) : null, add = (ic, title, text, btns, cls) => out.push({ ic, title, text, btns, cls });
  const i = inst(x);
  if (i && x.a < 0) { const left = i.total - i.n; add("inst", t("activity.w.instTitle", { n: i.n, total: i.total }), left > 0 ? t("activity.w.instLeft", { left, amt: fm(left * Math.abs(x.a)), when: monYr(x.d, left) }, left) : t("activity.w.instDone")); }
  if (K.isFut(x)) add("cal", t("activity.upcoming"), t("activity.d.futText"));
  if (!real || K.isXf(x)) { /* auto rows and transfers have no store history */ } else if (sameStore(x).length > 1) add("hist", t("activity.w.before"), t("activity.w.beforeText", { n: sameStore(x).length }), [{ label: t("activity.w.beforeBtn", { n: sameStore(x).length }), run: () => histOpen(x) }]);
  if (rmOf(x) && real) add("cal", t("activity.w.movedTitle"), t("activity.w.movedText", { d: dcell(x.d), m: mname(rmOf(x)) + " " + rmOf(x).slice(0, 4) }), [{ label: t("activity.w.mChange"), run: () => monthOpen(x) }, { label: t("activity.w.mResetBtn"), run: () => monthReset(x) }], "amber");
  if (K.isIgn(x)) add("off", t("activity.d.ignTitle"), t("activity.d.ignText"), [{ label: t("activity.d.ignOff"), run: () => ignOff(x) }]);
  if (K.isCp(x)) add("card", t("activity.type.cardpay"), cardOf(x, K.ci) ? t("activity.d.cpText", { card: cardOf(x, K.ci) }) : t("activity.d.cpTextAny"), [{ label: t("activity.d.cpCount"), run: () => cpCount(x) }]);
  else if (S.value.ccOverride?.[x.id] == 1) add("card", t("activity.d.counted1"), t("activity.d.counted1Text"), [{ label: t("activity.d.cpUncount"), run: () => cpUncount(x) }]);
  if (pair) { const o = (S.value.tx || []).find((y) => y.id === pair.o), i2 = (S.value.tx || []).find((y) => y.id === pair.i), cost = o && i2 ? -o.a - i2.a : 0; add("swap", t("activity.type.transfer"), t("activity.w.xfText", { cost: cost > 0.5 ? t("activity.w.xfCost", { amt: fm(cost) }) : t("activity.w.xfNoCost") }), [{ label: t("activity.r.notXf"), run: () => xfNoAsk(x) }]); }
  if (dupSet.value.has(x.id)) add("warn", t("activity.d.dupTitle"), t("activity.d.dupText"), [{ label: t("activity.r.dupDel"), cls: "r", run: () => dupDelAsk(x) }, { label: t("activity.r.dupKeep"), run: () => dupKeep(x) }], "amber");
  return out;
});
const tiles = computed(() => {
  const x = cur.value; if (!x) return [];
  const K = k.value, real = !x.virtual, xf = K.isXf(x), cp = K.isCp(x), ign = K.isIgn(x), out = [];
  if (x.a < 0 && real && !xf && !cp) out.push({ ic: "card", title: t("activity.d.cpMark"), sub: t("activity.w.tCpSub"), run: () => cpMark(x) });
  if (real && !xf && !cp && !ign) out.push({ ic: "cal", title: t("activity.w.mTile"), sub: rmOf(x) ? t("activity.w.mTileIn", { m: mk(rmOf(x)) }) : t("activity.w.mTileSub"), run: () => monthOpen(x) });
  if (real && !xf && !cp && !ign) out.push({ ic: "off", title: t("activity.d.ignOn"), sub: t("activity.w.tIgnSub"), run: () => ignOn(x) });
  return out;
});
const openDoc = (x, i) => { const id = (x.docIds || [])[i]; if (id != null) window.open("/api/documents/" + id, "_blank"); };
async function attach(e) {
  const x = cur.value, files = [...e.target.files]; e.target.value = "";
  if (!x || !files.length) return;
  try {
    const ups = [];
    for (const fl of files) ups.push(await data.api(`/api/transactions/${x.id}/documents`, { method: "POST", headers: { "x-filename": encodeURIComponent(fl.name), "content-type": fl.type || "application/octet-stream" }, body: fl }));
    await change(x.id, (tx) => { tx.docs = [...(tx.docs || []), ...ups.map((u) => u.filename)]; tx.docIds = [...(tx.docIds || []), ...ups.map((u) => u.id)]; tx.docHas = [...(tx.docHas || []), ...ups.map(() => true)]; }, "Attached document", x.desc + ": " + ups.map((u) => u.filename).join(", "));
  } catch { say(t("activity.w.uploadFail"), "err"); }
}

// "Count in another month", "Name rule" and "Payment history": the current app's three pop-ups, with the same words and layout.
const pop = ref(null); // { kind: "month" | "rule" | "hist", ... }
const popClose = () => { pop.value = null; };
const sameStore = (x) => { const key = String(x.desc || "").trim().toLowerCase(); return key ? (S.value?.tx || []).filter((y) => !y.virtual && (y.a < 0) === (x.a < 0) && String(y.desc || "").trim().toLowerCase() === key) : []; };
const addMonth = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const mk = (m) => mname(m) + " " + m.slice(0, 4);
function monthOpen(x) { txOpen.value = null; pop.value = { kind: "month", id: x.id, pick: rmOf(x) || String(x.d).slice(0, 7) }; }
const monthTx = computed(() => (pop.value?.kind === "month" ? (S.value?.tx || []).find((y) => y.id === pop.value.id) : null));
function monthSet(x, m) {
  if (!/^\d{4}-\d{2}$/.test(m || "")) { say(t("activity.w.mPickFirst"), "err"); return; }
  const own = String(x.d).slice(0, 7), v = m === own ? undefined : m;
  if (v === x.rm) return;
  change(x.id, (tx) => { if (v) tx.rm = v; else delete tx.rm; }, "Counted in another month", x.desc + ": " + (v ? mk(v) : "its own month"));
  popClose(); say(v ? t("activity.w.mNow", { m: mk(v) }) : t("activity.w.mBack"));
}
const monthReset = (x) => confirm(t("activity.w.mResetQ"), t("activity.w.mResetText"), () => { change(x.id, (tx) => { delete tx.rm; }, "Counted in another month", x.desc + ": back to its own month"); popClose(); say(t("activity.w.mBack")); });
function nameRuleFrom(x) { txOpen.value = null; const f0 = x.memo ? "memo" : "desc"; pop.value = { kind: "rule", id: x.id, f: f0, m: "in", k: nameField(x, f0) || "", n: S.value?.cfg?.renames?.[x.id] || "" }; }
watch(() => pop.value?.f, (v) => { const p = pop.value; if (p?.kind === "rule" && v !== "any") { const x = (S.value?.tx || []).find((y) => y.id === p.id); p.k = (x && nameField(x, v)) || ""; } });
async function ruleSave() {
  const p = pop.value, kw = p.k.trim(), nm = p.n.trim();
  if (!kw || !nm) { say(t("activity.w.nrNeed"), "err"); return; }
  await save((next) => { next.cfg = next.cfg || {}; next.cfg.nameRules = [...(next.cfg.nameRules || []), { k: kw, n: nm, f: p.f, m: p.m }]; }, "Added name rule", '"' + kw + '" → ' + nm);
  popClose(); say(t("activity.w.nrAdded") + ": “" + kw + "” → “" + nm + "”");
}
function histOpen(x) {
  const L = sameStore(x).sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
  if (!L.length) { say(t("activity.w.hNone"), "err"); return; }
  txOpen.value = null; pop.value = { kind: "hist", title: displayName(S.value, x), rows: L, q: displayName(S.value, x) };
}
const hist = computed(() => {
  const p = pop.value; if (p?.kind !== "hist") return null;
  const L = p.rows, abs = L.map((x) => Math.abs(x.a)), tot = abs.reduce((a, b) => a + b, 0), mx = Math.max(...abs), mn = Math.min(...abs);
  let lastY = "";
  return { L, abs, tot, avg: tot / L.length, mx, mn, items: L.map((x, i) => { const y = x.d.slice(0, 4), head = y !== lastY ? y : ""; lastY = y; const nx = L[i + 1], d = nx ? abs[i] - abs[i + 1] : 0; return { x, head, d: Math.abs(d) > 0.5 ? d : 0 }; }) };
});
const monShort = (d) => new Date(d + "T12:00:00").toLocaleDateString(loc(), { month: "short" });
function histShow() { const q = pop.value.q; popClose(); tab.value = "all"; f.value = { q, src: "", cat: "", type: "", tag: "", p: "all", from: "", to: "" }; }

onMounted(() => data.start());
</script>

<template>
  <div class="activity actv">
    <PageHeader :title="t('activity.title')" />
    <div id="txTabs" class="seg" role="tablist" :aria-label="t('activity.title')">
      <button type="button" role="tab" :aria-selected="tab === 'all'" :class="{ on: tab === 'all' }" @click="tab = 'all'">{{ t("activity.all") }}</button>
      <BaseTooltip :text="t('activity.revTip')"><button type="button" role="tab" :aria-selected="tab === 'rev'" :class="{ on: tab === 'rev' }" @click="tab = 'rev'">{{ t("activity.review") }}{{ reviewCount ? " (" + reviewCount + ")" : "" }}</button></BaseTooltip>
    </div>

    <div v-if="tab === 'all'" id="txMain" class="stk">
      <div class="fcard">
        <div class="fbar">
          <div class="fseg" :class="{ on: f.p !== 'all' }"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg><span class="rng"><select :value="f.p" :aria-label="t('activity.timeFrame')" @change="onRange"><option v-for="o in rangeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></span></div>
          <div class="fseg" :class="{ on: !!f.src }"><svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></svg><select v-model="f.src" :aria-label="t('activity.source')"><option v-for="o in srcOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.cat }"><svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z" /><path d="M7.5 8h.01" /></svg><select v-model="f.cat" :aria-label="t('activity.category')"><option v-for="o in catOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.tag }"><svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" /></svg><select v-model="f.tag" :aria-label="t('activity.tag')"><option v-for="o in tagOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <div class="fseg" :class="{ on: !!f.type }"><svg viewBox="0 0 24 24"><path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" /></svg><select v-model="f.type" :aria-label="t('activity.typeLabel')"><option v-for="o in typeOpts" :key="o.value" :value="o.value">{{ o.label }}</option></select></div>
          <button type="button" class="fseg fclr" :class="{ off: !filtered }" @click="clear">{{ t("activity.clear") }}</button>
        </div>
        <div class="txs">
          <div class="txs-l"><BaseTooltip :text="sumTip"><span class="txs-c mu"><svg viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-6z" /></svg><template v-if="!rows.length">{{ filtered ? t("activity.noMatch") : t("activity.none") }}</template><template v-else><b>{{ filtered ? t("activity.results") : t("activity.all") }}</b><span>{{ t("activity.count", { n: rows.length }, rows.length) }}</span><span v-if="loText" class="txs-x">{{ t("activity.leftOut", { list: loText }) }}</span></template></span></BaseTooltip></div>
          <div class="txs-g">
            <BaseTooltip :text="t('activity.inTip')"><div><span>{{ t("activity.in") }}</span><b class="num" dir="ltr">{{ fm(T.inc) }}</b></div></BaseTooltip>
            <BaseTooltip :text="t('activity.outTip')"><div><span>{{ t("activity.out") }}</span><b class="num" dir="ltr">{{ fm(T.out) }}</b></div></BaseTooltip>
            <BaseTooltip :text="t('activity.netTip')"><div><span>{{ t("activity.net") }}</span><b class="num" :class="{ neg: T.net < 0 }" dir="ltr">{{ fm(T.net) }}</b></div></BaseTooltip>
          </div>
        </div>
      </div>
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
          <tbody v-for="g in visibleGroups || [{ key: '', rows: visibleRows }]" :key="g.key" :class="g.label ? ['grp', { closed: closed.has(g.key) }] : 'gu'">
            <tr v-if="g.label" class="ghead" :class="{ closed: closed.has(g.key) }" @click="toggle(g.key)"><td colspan="7">
              <span class="gtot"><template v-for="(p, i) in grpParts(g)" :key="i"><span v-if="i" class="gdot">·</span><BaseTooltip v-if="p.tip" :text="p.tip"><span>{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></BaseTooltip><span v-else :class="{ neg: p.neg }">{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></template></span>
              <span class="gc"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></span> <b>{{ groupLabel(g.label) }}</b><span class="gdot">·</span><span class="sm">{{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span>
            </td></tr>
            <template v-if="!closed.has(g.key)">
              <tr v-for="x in g.rows" :key="x.id" :class="{ fut: k.isFut(x) }">
                <td class="sm num" style="white-space:nowrap">{{ dcell(x.d) }}</td>
                <td class="mer" style="cursor:pointer" @click="openTx(x)"><div class="mc"><span class="av" :style="avStyle(x)">{{ initial(x) }}</span><span class="mt">{{ displayName(S, x) }}</span><template v-for="c in chips(x)" :key="c.cls"><BaseTooltip :text="c.tip"><span class="bd pc" :class="c.cls"><svg v-if="c.icon === 'xf'" class="pi" viewBox="0 0 24 24"><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" /></svg><svg v-else-if="c.icon === 'note'" class="pi" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>{{ c.label }}</span></BaseTooltip></template></div></td>
                <td class="sm ft">{{ x.from }} → {{ x.to }}</td>
                <td><select v-if="canEditCat(x)" :value="x.c && x.c !== 'Uncategorized' ? x.c : ''" :aria-label="t('activity.category')" @change="setCat(x, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select><span v-else class="sm">{{ x.c || "—" }}</span></td>
                <td><span v-for="g2 in x.tags || []" :key="g2" class="tag catl" @click="f.tag = g2">{{ g2 }}</span></td>
                <td class="am" :class="{ pos: isPos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ t("activity.balance") }} {{ x.a >= 0 ? "+" : "−" }}₪{{ f0(x.a) }}</span><template v-else>{{ amtT(x) }}</template><div v-if="x.orig" class="sm" style="font-weight:400">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }} {{ x.orig.cur }}</div></td>
                <td><button v-if="x.docs && x.docs.length" type="button" class="chip dchip" @click="openTx(x)">📎 {{ x.docs.length }}</button></td>
              </tr>
            </template>
          </tbody>
        </table>
        <div id="txl" class="txl card" style="padding:4px 12px">
          <template v-for="g in visibleGroups || [{ key: '', rows: visibleRows }]" :key="g.key">
            <div v-if="g.label" class="ghead" :class="{ closed: closed.has(g.key) }" @click="toggle(g.key)"><div class="gh1"><span class="gl"><span class="gc"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></span><b>{{ groupLabel(g.label) }}</b><span class="gdot">·</span><span class="sm">{{ t("activity.count", { n: g.rows.length }, g.rows.length) }}</span></span></div><div class="sm" style="margin-top:3px;padding-inline-start:20px"><template v-for="(p, i) in grpParts(g)" :key="i"><span v-if="i" class="gdot">·</span><span :class="{ neg: p.neg }">{{ p.l }} <b dir="ltr">{{ p.v }}</b></span></template></div></div>
            <div v-if="!closed.has(g.key)" class="gbm">
              <div v-for="x in g.rows" :key="x.id" class="txi" :class="{ fut: k.isFut(x) }" @click="openTx(x)"><span class="av" :style="avStyle(x)">{{ initial(x) }}</span><div style="flex:1;min-width:0"><div class="mer" style="font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ displayName(S, x) }}</div><div class="sm"><span class="num">{{ dcell(x.d) }}</span> · <span class="catl" @click.stop="f.cat = x.c || 'Uncategorized'">{{ x.c && x.c !== "Uncategorized" ? x.c : t("activity.uncategorized") }}</span><template v-if="x.docs && x.docs.length"> · <span class="dchip">📎 {{ x.docs.length }}</span></template></div><div style="margin-top:3px"><template v-for="c in chips(x)" :key="c.cls"><span class="bd pc" :class="c.cls"><svg v-if="c.icon === 'xf'" class="pi" viewBox="0 0 24 24"><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" /></svg><svg v-else-if="c.icon === 'note'" class="pi" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>{{ c.label }}</span> </template></div></div><div style="text-align:end"><b class="num" :class="{ pos: isPos(x) }" dir="ltr"><span v-if="x.balUpd" class="sm" style="font-weight:500">{{ t("activity.balance") }} {{ x.a >= 0 ? "+" : "−" }}₪{{ f0(x.a) }}</span><template v-else>{{ amtT(x) }}</template></b><div v-if="x.orig" class="sm" dir="ltr">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }}</div></div></div>
            </div>
          </template>
          <div v-if="!rows.length" class="sm" style="padding:20px;text-align:center">{{ t("activity.nothing") }}</div>
        </div>
      </template>
      <div class="txm"><button v-if="more > 0" type="button" class="btn o" @click="shownCount += PAGE">{{ t("activity.showMore", { n: Math.min(PAGE, more) }) }} <span class="sm" style="margin-inline-start:6px">{{ t("activity.shownOf", { shown: drawn, total: rows.length }) }}</span></button></div>
    </div>

    <div v-else id="txRev">
      <h2 style="margin-top:6px">{{ t("activity.r.xfTitle") }}</h2>
      <div v-for="r in revXf" :key="r.x.o" class="xfc">
        <div class="flex" style="justify-content:space-between;gap:10px"><b>{{ r.o.from }} → {{ r.i.to }}</b><span class="sm num">{{ dcell(r.o.d) }}</span></div>
        <div class="sm" style="margin:6px 0">{{ t("activity.r.xfLine2", { sent: fm(-r.o.a), out: r.o.from, arrived: r.i.orig ? (SYM[r.i.orig.cur] || "") + f0(r.i.orig.amt) + " (≈ " + fm(r.i.a) + ")" : fm(r.i.a), in: r.i.to }) }}</div>
        <div style="margin:8px 0"><span class="bd" :class="r.cost > 0.5 ? 'am2' : 'dn'">{{ r.cost > 0.5 ? t("activity.r.cost2", { amt: fm(r.cost), pc: (r.cost / -r.o.a * 100).toFixed(1) }) : t("activity.r.noCost") }}</span></div>
        <div class="sm" style="margin-bottom:10px">{{ r.cost > 0.5 ? t("activity.r.costText") : t("activity.r.noCostText") }}</div>
        <div class="flex" style="gap:8px"><button type="button" class="btn s" @click="xfOk(r)">{{ t("activity.r.confirm") }}</button><button type="button" class="btn o s" @click="xfNo(r.x.o)">{{ t("activity.r.notXf") }}</button></div>
      </div>
      <div v-if="!revXf.length" class="card sm">{{ t("activity.r.xfNone") }}</div>

      <h2>{{ t("activity.r.dupTitle") }}</h2>
      <div v-for="x in revDups" :key="x.id" class="xfc">
        <b>{{ displayName(S, x) }} · <span dir="ltr">{{ fm(x.a) }}</span></b>
        <div class="sm" style="margin:4px 0 10px">{{ x.from }} · <span class="num">{{ dcell(x.d) }}</span> · {{ t("activity.r.dupWhy") }}</div>
        <div class="flex" style="gap:8px"><button type="button" class="btn r s" @click="dupDel(x)">{{ t("activity.r.dupDel") }}</button><button type="button" class="btn o s" @click="dupKeep(x)">{{ t("activity.r.dupKeep") }}</button></div>
      </div>
      <div v-if="!revDups.length" class="card sm">{{ t("activity.r.dupNone") }}</div>

      <h2>{{ t("activity.r.gapTitle") }}</h2>
      <div class="sm" style="margin:-4px 2px 12px">{{ t("activity.r.gapIntro") }}</div>
      <div v-for="r in revGaps" :key="r.id" class="card warn" style="margin-bottom:12px">
        <div class="flex" style="justify-content:space-between"><div class="lbl">{{ r.n }} · {{ r.cur }}</div><span class="bd" :class="r.diff < 0 ? 'up' : 'dn'">{{ r.diff < 0 ? t("activity.r.down") : t("activity.r.up") }}</span></div>
        <div style="margin:8px 0;font-size:16px;font-weight:600">{{ r.diff < 0 ? t("activity.r.gapOut", { amt: gapAmt(r) }) : t("activity.r.gapIn", { amt: gapAmt(r) }) }}</div>
        <div class="sm" style="line-height:1.55">{{ t(r.diff < 0 ? "activity.r.gapTextOut" : "activity.r.gapTextIn", { name: r.n, amt: gapAmt(r), from: gapWhen(r.from), to: gapWhen(r.to) }) }}</div>
        <div class="flex" style="gap:8px;margin-top:12px;flex-wrap:wrap">
          <a class="btn s" href="/activity">{{ t("activity.r.gapAdd") }}</a>
          <BaseTooltip v-if="r.diff < 0" :text="t('activity.r.gapRecTip')"><button type="button" class="btn o s" @click="gapCall(r.id, 'record')">{{ t("activity.r.gapRec") }}</button></BaseTooltip>
          <BaseTooltip :text="t('activity.r.gapRevTip')"><button type="button" class="btn o s" @click="gapNote = { id: r.id, note: '' }">{{ t("activity.r.gapRev") }}</button></BaseTooltip>
        </div>
      </div>
      <div v-if="!revGaps.length" class="card sm">{{ t("activity.r.gapNone") }}</div>
    </div>

    <RangeCal v-if="cal" :from="f.p === 'custom' ? f.from : ''" :to="f.p === 'custom' ? f.to : ''" :anchor="cal.anchor" :df="dateFormat" :ws="weekStart" @apply="calApply" @cancel="calCancel" />

    <!-- "Tag more like this?" -->
    <BaseDialog :open="!!offer" :title="t('activity.offer.title')" @update:open="(v) => !v && (offer = null)">
      <template v-if="offer">{{ offer.n ? t("activity.offer.text", { n: offer.n, kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }, offer.n) : t("activity.offer.none", { kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }) }}</template>
      <template #actions><BaseButton variant="outline" size="small" @click="offer = null">{{ t("activity.offer.no") }}</BaseButton><BaseButton @click="openRule">{{ t("activity.offer.yes") }}</BaseButton></template>
    </BaseDialog>
    <BaseDialog :open="!!rule" :title="t('activity.offer.ruleTitle')" @update:open="(v) => !v && (rule = null)">
      <template v-if="rule">
        <p>{{ t("activity.offer.ruleText", { tags: rule.tags.map((g) => "#" + g).join(" ") }) }}</p>
        <label class="fld">{{ t("activity.offer.contains") }}<input v-model="rule.kw" autocomplete="off" /></label>
        <label class="chk"><input v-model="rule.all" type="checkbox" :disabled="!ruleMatches.length" /><span>{{ ruleMatches.length ? t("activity.offer.alsoTag", { n: ruleMatches.length }, ruleMatches.length) : t("activity.offer.noMatches") }}</span></label>
        <p v-if="ruleMatches.length" class="sm">{{ ruleMatches.slice(0, 3).map((x) => displayName(S, x)).join(", ") }}{{ ruleMatches.length > 3 ? ", …" : "" }}</p>
      </template>
      <template #actions><BaseButton variant="outline" size="small" @click="rule = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!rule || rule.kw.trim().length < 2" @click="saveRule">{{ t("activity.offer.create") }}</BaseButton></template>
    </BaseDialog>

    <!-- Dismissing a balance change, with a note -->
    <BaseDialog :open="!!gapNote" :title="t('activity.r.gapRev')" @update:open="(v) => !v && (gapNote = null)">
      <label v-if="gapNote" class="fld">{{ t("activity.r.gapNoteQ") }}<textarea v-model="gapNote.note" rows="3" /></label>
      <template #actions><BaseButton variant="outline" size="small" @click="gapNote = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!gapNote || !gapNote.note.trim()" @click="gapCall(gapNote.id, 'review', { note: gapNote.note.trim() }); gapNote = null">{{ t("activity.r.gapRevGo") }}</BaseButton></template>
    </BaseDialog>

    <!-- The transaction window: the same layout, fields and wording as the current app -->
    <BaseSheet :open="!!cur" cls="txw" @close="txOpen = null">
      <div class="txp">
        <div class="txgrid2">
          <div class="txmain">
            <div class="txh2"><span class="av" :style="avStyle(cur)">{{ initial(cur) }}</span>
              <div class="tt"><h3>{{ displayName(S, cur) }}</h3><div class="sm">{{ dcell(cur.d) }}{{ cur.from && cur.to ? " · " + cur.from + " → " + cur.to : cur.from || cur.to ? " · " + (cur.from || cur.to) : "" }}</div></div>
              <div class="txam"><b class="num" :class="{ pos: isPos(cur) }" dir="ltr"><span v-if="cur.balUpd" class="sm" style="font-weight:500">{{ t("activity.balance") }} {{ cur.a >= 0 ? "+" : "−" }}₪{{ f0(cur.a) }}</span><template v-else>{{ amtT(cur) }}</template></b><div v-if="cur.orig" class="sm" dir="ltr">{{ SYM[cur.orig.cur] || "" }}{{ f0(cur.orig.amt) }} {{ cur.orig.cur }}</div></div>
            </div>
            <div class="txchips"><span class="tb" :class="kindCls(cur)">{{ tk("activity.d.kind." + kindOf(cur)) }}</span>
              <span v-if="!cur.virtual && !k.isXf(cur) && cur.c" class="chip catl" @click="goCat(cur.c)"><span class="dot" :style="{ background: catColor(cur.c) }"></span>{{ cur.c }}</span>
              <template v-for="c in chips(cur)" :key="c.cls"><BaseTooltip :text="c.tip"><span class="bd pc" :class="c.cls"><svg v-if="c.icon === 'xf'" class="pi" viewBox="0 0 24 24"><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" /></svg><svg v-else-if="c.icon === 'note'" class="pi" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>{{ c.label }}</span></BaseTooltip> </template>
              <span v-for="g in cur.tags || []" :key="g" class="tag catl" @click="goTag(g)">{{ g }}</span></div>
            <div class="kvc">
              <div class="kv"><div v-for="r in facts" :key="r.k" class="kvr"><span class="k">{{ tk("activity.d." + r.k) }}</span><span class="v" :class="{ mono: r.mono }" :title="factText(r.v)">{{ factText(r.v) }}</span></div></div>
              <details v-if="rawFields.length" class="kvd"><summary><span>{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }}</span><em>{{ rawFields.length }}</em></summary><div v-for="[a, b] in rawFields" :key="a" class="kvr"><span class="k">{{ prettyKey(a) }}</span><span class="v" :title="b">{{ b }}</span></div></details>
              <div v-if="det === 'load'" class="kvn"><i class="spinner"></i> {{ t("activity.d.loading") }}</div>
              <div v-else-if="!det || (cur.src !== 'manual' && !det.details)" class="kvn">{{ cur.src === "manual" ? t("activity.d.manual") : t("activity.d.old") }}</div>
            </div>
          </div>
          <aside class="txside">
            <details v-if="!cur.virtual && !k.isXf(cur)" class="txs2" data-s="org" :open="!!sec.org" @toggle="toggleSec('org', $event)"><summary><span class="sct">{{ t("activity.d.organise") }}</span></summary><div class="sbd">
              <div class="fld"><label>{{ t("activity.d.displayName") }}</label><div style="display:flex;gap:6px"><input :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="displayName(S, cur)" maxlength="80" style="flex:1;min-width:0" @change="setName(cur, $event.target.value)" /><button type="button" class="btn o s" @click="nameRuleFrom(cur)">{{ t("activity.w.nrRule") }}</button></div></div>
              <div class="two"><div class="fld"><label>{{ t("activity.category") }}</label><select :value="cur.c && cur.c !== 'Uncategorized' ? cur.c : ''" @change="setCat(cur, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select></div>
                <div class="fld"><label>{{ t("activity.w.tags") }}</label><div class="tbox"><div class="tcs"><span v-for="g in cur.tags || []" :key="g" class="tchip"><span class="catl" @click="goTag(g)">{{ g }}</span><button type="button" class="tx2" :aria-label="t('activity.removeTag')" @click="removeTag(cur, g)">×</button></span><input v-model="tagText" class="tin" :placeholder="cur.tags?.length ? t('activity.addMore') : t('activity.addTag')" autocomplete="off" @focus="tagOpen = true" @blur="onTagBlur(cur)" @keydown="onTagKey($event, cur)" /></div>
                  <div class="tsug" :hidden="!tagOpen || !tagPicks(cur).length && !tagNew(cur)"><button v-for="[g, n] in tagPicks(cur)" :key="g" type="button" class="tpick" @mousedown.prevent="addTags(cur, g)"><span>{{ g }}</span><small>{{ n }}</small></button><button v-if="tagNew(cur)" type="button" class="tpick new" @mousedown.prevent="addTags(cur, tagText)">{{ t("activity.createTag", { tag: tagText.trim() }) }}</button></div></div></div></div>
            </div></details>
            <details v-if="!cur.virtual" class="txs2" data-s="note" :open="!!sec.note" @toggle="toggleSec('note', $event)"><summary><span class="sct">{{ t("activity.d.note") }}</span><em v-if="cur.note">{{ t("activity.w.added") }}</em></summary><div class="sbd"><div class="fld"><label>{{ t("activity.d.note") }}</label><textarea rows="2" :placeholder="t('activity.d.notePh')" :value="cur.note || ''" @change="setNote(cur, $event.target.value)" /></div></div></details>
            <div v-else class="sm">{{ t("activity.w.autoNote") }}</div>
            <details v-if="rels.length" class="txs2" data-s="rel" :open="!!sec.rel" @toggle="toggleSec('rel', $event)"><summary><span class="sct">{{ t("activity.d.counted") }}</span><i v-if="rels.some((r) => r.cls === 'amber')" class="tfl" :title="t('activity.w.needsLook')"></i><em>{{ rels.length }}</em></summary><div class="sbd"><div class="rels">
              <div v-for="r in rels" :key="r.title" class="rel" :class="r.cls"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[r.ic]"></svg></span><div class="rb"><b>{{ r.title }}</b><div v-if="r.text" class="sm">{{ r.text }}</div><div v-if="r.btns" class="ra"><button v-for="b in r.btns" :key="b.label" type="button" class="btn s" :class="b.cls || 'o'" @click="b.run()">{{ b.label }}</button></div></div></div>
            </div></div></details>
            <details v-if="tiles.length" class="txs2" data-s="act" :open="!!sec.act" @toggle="toggleSec('act', $event)"><summary><span class="sct">{{ t("activity.d.actions") }}</span><em>{{ tiles.length }}</em></summary><div class="sbd"><div class="tiles">
              <button v-for="x in tiles" :key="x.title" type="button" class="atile" @click="x.run()"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[x.ic]"></svg></span><span class="at"><b>{{ x.title }}</b><small>{{ x.sub }}</small></span></button>
            </div></div></details>
            <details v-if="!cur.virtual && cur.docs && cur.docs.length" class="txs2" data-s="doc" :open="!!sec.doc" @toggle="toggleSec('doc', $event)"><summary><span class="sct">{{ t("activity.w.docs") }}</span><em>{{ cur.docs.length }}</em></summary><div class="sbd"><div class="docrow"><button v-for="(d, i) in cur.docs" :key="i" type="button" class="chip dchip" @click="openDoc(cur, i)"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg>{{ d }}</button></div></div></details>
            <details v-if="changes.length" class="txs2" data-s="hist" :open="!!sec.hist" @toggle="toggleSec('hist', $event)"><summary><span class="sct">{{ t("activity.d.history") }}</span><em>{{ changes.length }}</em></summary><div class="sbd"><div class="hlist"><div v-for="a in changes" :key="a.t + a.action" class="hrow"><div class="hh"><b>{{ a.action }}</b><span class="hw">{{ gapWhen(a.t) }}</span></div><div class="hdt">{{ a.detail }}</div></div></div></div></details>
          </aside>
        </div>
        <div class="txfoot"><button type="button" class="btn o" @click="copyDetails">{{ t("activity.d.copy") }}</button>
          <label v-if="!cur.virtual" class="btn o upl" style="margin-inline-end:auto"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg> {{ t("activity.w.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach($event)" /></label><span v-else style="margin-inline-end:auto"></span>
          <button type="button" class="btn" @click="txOpen = null">{{ t("activity.d.done") }}</button></div>
      </div>
    </BaseSheet>

    <BaseSheet :open="!!(pop?.kind === 'month' && monthTx)" @close="popClose">
      <h3>{{ t("activity.w.mTitle") }}</h3>
      <div class="sm" style="margin-bottom:12px;line-height:1.55"><b>{{ displayName(S, monthTx) }}</b> · {{ dcell(monthTx.d) }}<br><span>{{ t("activity.w.mText") }}</span></div>
      <div class="stk" style="gap:8px"><button type="button" class="btn o" @click="monthSet(monthTx, addMonth(rmOf(monthTx) || String(monthTx.d).slice(0, 7), -1))"><span>{{ t("activity.w.mPrev") }}</span> · {{ mk(addMonth(rmOf(monthTx) || String(monthTx.d).slice(0, 7), -1)) }}</button><button type="button" class="btn o" @click="monthSet(monthTx, addMonth(rmOf(monthTx) || String(monthTx.d).slice(0, 7), 1))"><span>{{ t("activity.w.mNext") }}</span> · {{ mk(addMonth(rmOf(monthTx) || String(monthTx.d).slice(0, 7), 1)) }}</button></div>
      <div class="fld" style="margin-top:14px"><label>{{ t("activity.w.mOr") }}</label><div class="flex" style="gap:8px"><input v-model="pop.pick" type="month" style="flex:1" /><button type="button" class="btn s" @click="monthSet(monthTx, pop.pick)">{{ t("activity.w.mUse") }}</button></div></div>
      <div class="flex" style="justify-content:space-between;margin-top:14px;gap:8px"><button v-if="rmOf(monthTx)" type="button" class="btn o s" @click="monthReset(monthTx)">{{ t("activity.w.mReset", { m: mk(String(monthTx.d).slice(0, 7)) }) }}</button><span v-else></span><button type="button" class="btn" @click="popClose">{{ t("activity.d.cancel") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="!!(pop?.kind === 'rule')" @close="popClose">
      <h3>{{ t("activity.w.nrTitle") }}</h3>
      <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("activity.w.nrText") }}</div>
      <div class="fld"><label>{{ t("activity.w.nrLook") }}</label><select v-model="pop.f"><option v-for="n in NFIELDS" :key="n" :value="n">{{ tk("activity.w.f." + n) }}</option></select></div>
      <div class="fld"><label>{{ t("activity.w.nrMatch") }}</label><select v-model="pop.m"><option value="in">{{ t("activity.w.nrContains") }}</option><option value="eq">{{ t("activity.w.nrEq") }}</option></select></div>
      <div class="fld"><label>{{ t("activity.w.nrTxt") }}</label><input v-model="pop.k" /></div>
      <div class="fld"><label>{{ t("activity.w.nrCall") }}</label><input v-model="pop.n" maxlength="80" :placeholder="t('activity.w.nrPh')" /></div>
      <div class="flex" style="gap:8px;margin-top:14px"><button type="button" class="btn" @click="ruleSave">{{ t("activity.w.nrAdd") }}</button><button type="button" class="btn o" @click="popClose">{{ t("activity.d.cancel") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="!!hist" @close="popClose">
      <div class="txh"><h3>{{ pop.title }}</h3><div class="sm">{{ t("activity.w.hAll") }} · {{ t("activity.w.hTo", { a: dcell(hist.L[hist.L.length - 1].d), b: dcell(hist.L[0].d) }) }}</div></div>
      <div class="phs"><div><span>{{ t("activity.w.hPayments") }}</span><b>{{ hist.L.length }}</b></div><div><span>{{ t("activity.w.hTotal") }}</span><b>{{ fm(hist.tot) }}</b></div><div><span>{{ t("activity.w.hAvg") }}</span><b>{{ fm(hist.avg) }}</b></div></div>
      <div v-if="hist.L.length > 2" class="phb" aria-hidden="true"><i v-for="x in [...hist.L].reverse().slice(-40)" :key="x.id" :style="{ height: Math.max(8, Math.abs(x.a) / hist.mx * 100) + '%' }" :title="dcell(x.d) + ': ' + fm(Math.abs(x.a))"></i></div>
      <div v-if="hist.mx - hist.mn > 0.5" class="phr"><span>{{ t("activity.w.hLow") }} <b>{{ fm(hist.mn) }}</b></span><span>{{ t("activity.w.hHigh") }} <b>{{ fm(hist.mx) }}</b></span></div>
      <div class="phl"><template v-for="it in hist.items" :key="it.x.id"><div v-if="it.head" class="phy">{{ it.head }}</div>
        <div class="phi" @click="pop = null; openTx(it.x)"><div class="phd"><span>{{ monShort(it.x.d) }}</span><b>{{ +it.x.d.slice(8, 10) }}</b></div><div class="phm"><div class="pht">{{ displayName(S, it.x) || pop.title }}</div><div class="sm">{{ it.x.from || "" }}{{ it.x.c ? " · " + it.x.c : "" }}</div></div><div class="pha"><b class="num" :class="{ pos: it.x.a > 0 }" dir="ltr">{{ it.x.a < 0 ? "" : "+" }}{{ fm(Math.abs(it.x.a)) }}</b><span v-if="it.d" class="bd" :class="it.d > 0 ? 'up' : 'dn'">{{ it.d > 0 ? "▲" : "▼" }} {{ fm(Math.abs(it.d)) }}</span></div></div></template></div>
      <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:14px"><button type="button" class="btn o" @click="histShow">{{ t("activity.w.hShow") }}</button><button type="button" class="btn" @click="popClose">{{ t("activity.d.done") }}</button></div>
    </BaseSheet>

    <BaseDialog :open="!!ask" :title="ask ? ask.title : ''" @update:open="(v) => !v && (ask = null)">
      <template v-if="ask">{{ ask.text }}</template>
      <template #actions><BaseButton variant="outline" @click="ask = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :variant="ask && ask.danger ? 'danger' : 'filled'" @click="askYes">{{ t("activity.d.yes") }}</BaseButton></template>
    </BaseDialog>
  </div>
</template>
