// What the Activity page knows and does, without the screen: the filters, the rows and their groups and totals, Needs review
// and its actions. Used by the computer's page (views/Activity.vue) and the phone's screen (phone/screens/ActivityScreen.vue).
import { ref, computed, watch, onMounted } from "vue";
import { useHistoryStep } from "../core/historyStep.js";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { tx } from "../core/heText.js";
import { now, dayOf } from "../core/clock.js";
import { home } from "../core/derived.js";
import { dshort, dcell } from "../dates.js";
import { readJson, weekStart, writeJson, usePref } from "../core/prefs.js";
import { toast } from "../core/toast.js";
import { sendJson } from "../core/http.js";
import { TP } from "../core/tooltip.js";
import { activityGo } from "../core/shell.js";
import { openTx, openPop } from "../core/txwin.js";
import { openForm } from "../core/forms.js";
import { setCategory } from "../core/txact.js";
import { gapReviewed } from "../core/points.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { go } from "../router.js";
import * as A from "../lib/txactions.js";
import { fitChips } from "../lib/fitChips.js";
import { allRows, txChips, SYM } from "../lib/txrows.js";
import { fm, f0 } from "../format.js";
import { RANGES, kinds, counts, totals, leftOut, filterRows, sortRows, groupRows, GROUPS, hasFilters, displayName, allTags, reviewTransfers, duplicateIds, reviewGaps, gapBill } from "../lib/activity.js";

export function useActivity() {
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
  useHistoryStep("txTab", tab);
  const EMPTY = { q: "", src: "", cat: "", type: "", tag: "" };
  // The time frame is remembered in this browser ("moneyRanges", entry "tx").
  const savedRange = (() => { const r = readJson("moneyRanges", {}).tx; return r && (RANGES.includes(r.p) || r.p === "custom") ? r : null; })();
  const f = ref({ ...EMPTY, p: savedRange?.p || "all", from: savedRange?.from || "", to: savedRange?.to || "" });
  watch(() => [f.value.p, f.value.from, f.value.to], () => { const j = readJson("moneyRanges", {}); j.tx = { p: f.value.p, from: f.value.from, to: f.value.to }; writeJson("moneyRanges", j); });
  const group = usePref("moneyGroup", "month"); // remembered in this browser
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
  const groupOpts = computed(() => GROUPS.map((g) => opt(g, tk("activity.group." + g))));
  const sortOpts = computed(() => ["new", "old", "big", "small"].map((s) => opt(s, tk("activity.sort." + s))));
  // money in, its salary part and money back (lib/moneyIn.js), then the rest
  const typeOpts = computed(() => [opt("", t("activity.type.all")), ...["income", "salary", "back", "expense", "transfer", "cardpay", "bill"].map((x) => opt(x, tk("activity.type." + x)))]);
  const cats = computed(() => catNames(S.value).filter((k) => k != "Uncategorized"));
  // the filter lists: your accounts, every category with Uncategorized among them, tags in use with their count
  const catOpts = computed(() => [opt("", t("activity.allCats")), ...[...new Set([...catNames(S.value), "Uncategorized"])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map((c) => opt(c, catLabel(c)))]);
  const srcOpts = computed(() => [opt("", t("activity.allSources")), ...[...new Set((S.value?.accounts || []).filter((a) => a.kind != "pension").map((a) => a.n))].map((a) => opt(a, tx(a)))]); // bank names in the page's language
  const tagOpts = computed(() => [opt("", t("activity.allTags")), ...allTags(S.value).filter(([, n]) => n > 0).map(([g, n]) => opt(g, g + " (" + n + ")"))]);
  watch(tagOpts, (L) => { if (f.value.tag && !L.some((o) => o.value === f.value.tag)) f.value.tag = ""; });

  const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(loc(), o);
  function groupLabel(L) {
    if (L.day) return dcell(L.day) + " · " + dateFmt(L.day, { weekday: "long" });
    if (L.week) return t("activity.weekOf", { date: dcell(L.week) });
    if (L.month) return mname(L.month) + " " + L.month.slice(0, 4);
    if ("cat" in L) return catLabel(L.cat);
    if (L.type) return L.type === "ignored" || L.type === "balance" ? tk("activity.lot." + L.type) : tk("activity.type." + (L.type === "expenses" ? "expense" : L.type === "transfers" ? "transfer" : L.type));
    if ("tag" in L) return L.tag || t("activity.noTag");
    return L.name || t("activity.other");
  }
  // Opening or closing a group (the slide itself is drawn by the page).
  const closing = ref(new Map()); // group → its running slide
  const isXf = (x) => K.value.isXf(x);
  const isPos = (x) => x.a > 0 && !isXf(x);
  const nohtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  const avStyle = (x) => ({ background: `color-mix(in srgb,${catColor(S.value, x.c || "Uncategorized")} 22%,transparent)`, color: catColor(S.value, x.c || "Uncategorized") });
  const chips = (x) => fitChips(txChips(S.value, x, { K: K.value, dup: dup.value, BC: BC.value }));

  // What a click on a row opens: an expected bill opens the bill, a balance update opens the account, the rest the entry window.
  function openRow(x) {
    if (x.upBill != null) {
      const b = (S.value.bills || [])[x.upBill]; if (!b) return;
      const L = (home.value?.rows || []).filter((y) => y.a < 0 && !y.virtual && (y.desc + " " + y.to).toLowerCase().includes(b.match)).sort((p, q) => p.d.localeCompare(q.d));
      if (L.length) openTx(L[L.length - 1].id); else openPop("hist", { title: b.n, rows: [], sub: t("txw.chip.bill"), q: b.match });
      return;
    }
    if (x.upInst) { openTx(x.upInst); return; }
    if (x.balUpd) { go("/accounts?n=" + encodeURIComponent(x.from)); return; }
    openTx(x.id);
  }
  const setCat = (x, c) => setCategory(x.upInst ?? x.id, c); // an expected instalment changes the payment it follows
  // The category of an expected bill: the bill and its latest payment get it (upcat).
  function setBillCat(x, v) {
    data.change((S2) => { const b = S2.bills[x.upBill]; if (!b) return false; b.cat = v || ""; const L = S2.tx.filter((y) => y.a < 0 && !y.virtual && (y.desc + " " + y.to).toLowerCase().includes(b.match)).sort((p, q) => p.d.localeCompare(q.d)), lt = L[L.length - 1]; if (lt && lt.c !== v) lt.c = v; return [["Changed bill category", b.n + " → " + (v || "Uncategorized")]]; });
  }
  const goTag = (g) => reset({ tag: g });
  const goCat = (c) => reset({ cat: c || "Uncategorized" });

  // ---- the totals line and the group headers ----
  // The rows the totals leave out, and why (a tooltip on "84 not in the totals"): one reason per line.
  const LO_KEYS = ["transfers", "cardPays", "upcoming", "balance", "ignored"];
  const loN = computed(() => LO_KEYS.reduce((n, key) => n + (lo.value[key] || 0), 0));
  const sumTip = computed(() => {
    const o = lo.value, k = K.value, cnt = rows.value.filter((x) => counts(x, k)).length;
    return TP(t("activity.notInT"), [], [t("activity.notIntro"), ...LO_KEYS.filter((key) => o[key]).map((key) => "• " + t("activity.notWhy." + key, { n: o[key] })), t("activity.notCounted", { n: cnt })].join("\n"));
  });
  // A group that is all upcoming shows what is expected; one with bills still to come says "Out so far".
  function grpParts(g) {
    if (g.rows.length && g.allFut) return [...(g.E > 0 ? [{ l: t("activity.g.expIn"), v: fm(g.E) }] : []), { l: t("activity.g.expOut"), v: fm(g.P) }, ...(g.E > 0 ? [{ l: t("activity.net"), v: fm(g.E - g.P), neg: g.E - g.P < 0 }] : [])];
    const more = g.P >= 1 || g.E > 0;
    const tip = more ? TP(t("txw.a.stillTitle"), [[t("txw.a.outSoFar"), fm(g.T.out)], ...(g.P >= 1 ? [[t("txw.a.stillOut"), fm(g.P)], [t("txw.a.totalOut"), fm(g.T.out + g.P)]] : []), ...(g.E > 0 ? [[t("txw.a.stillIn"), fm(g.E)]] : []), "---", [t("txw.a.netDone"), fm(g.T.inc + g.E - g.T.out - g.P)]], t("txw.a.stillNote")) : "";
    return [{ l: t("activity.in"), v: fm(g.T.inc) }, { l: more ? t("activity.g.outSoFar") : t("activity.out"), v: fm(g.T.out), tip }, { l: t("activity.net"), v: fm(g.T.net), neg: g.T.net < 0 }];
  }
  // ---- Needs review ----
  const revXf = computed(() => reviewTransfers(S.value));
  const revDups = computed(() => (S.value?.tx || []).filter((x) => dup.value.has(x.id)));
  const revGaps = computed(() => reviewGaps(S.value, BC.value));
  const reviewCount = computed(() => revXf.value.length + revDups.value.length + revGaps.value.filter((r) => r.diff != 0).length);
  const gapWhen = (x) => new Date(x).toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const gapAmt = (r) => (SYM[r.cur] || r.cur + " ") + f0(Math.abs(r.diff));
  // On a card the balance is what you owe, so its texts speak of debt, not of money arriving or leaving.
  const gapKey = (r, at) => at + (r.card ? "card" : "gap") + (r.diff < 0 ? "Out" : "In");
  const gapOrig = (r) => (r.amount != r.diff ? t("txw.a.gapPart", { amt: (SYM[r.cur] || r.cur + " ") + f0(r.amount) }) : "");
  const gapB = (r) => gapBill(r, BC.value);
  async function gapCall(id, what, msg, body) {
    try { await data.api(`/api/gaps/${id}/${what}`, sendJson("POST", body || {})); await data.load(); gapReviewed(id); toast(msg); } catch (e) { toast(e.message, { kind: "err" }); }
  }
  const gapNote = ref(null); // the gap being dismissed, with the user's note
  const gapAdd = (r) => openForm("tx", { gap: { acc: r.n, cur: r.cur, amt: r.diff, date: String(r.to).slice(0, 10) } });

  onMounted(() => data.start());

  return {
    t, tk, PAGE, today, S, K, BC, dup, name, tab, f, group, sort, focus, shownCount, closed, reset, clear, exportFrom, rows0, billOf, rows, T, lo,
    filtered, groups, gkey, visibleGroups, visibleRows, drawn, more, opt, loc, mname, rangeLabel, rangeOpts, groupOpts, sortOpts, typeOpts, cats,
    catOpts, srcOpts, tagOpts, dateFmt, groupLabel, closing, isXf, isPos, nohtml, avStyle, chips, openRow, setCat, setBillCat, goTag, goCat,
    LO_KEYS, loN, sumTip, grpParts, revXf, revDups, revGaps, reviewCount, gapWhen, gapAmt, gapKey, gapOrig, gapB, gapCall, gapNote, gapAdd,
  };
}
