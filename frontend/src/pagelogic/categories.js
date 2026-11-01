// What the Categories and tags page knows and does, without the screen: the open tab, the months looked at (3, 6 or 12,
// saved in this browser), the numbers per category and per tag (lib/catStats.js, counted like Reports), the shown columns
// and the sort, the change against the months before, the month-by-month bars, and adding, renaming, merging and deleting
// (lib/categories.js). Used by the computer's page (views/Categories.vue) and the phone's Categories and tags screens,
// so both show the same numbers.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home } from "../core/derived.js";
import { now } from "../core/clock.js";
import { usePref } from "../core/prefs.js";
import { toast } from "../core/toast.js";
import { goActivity } from "../core/shell.js";
import { openTx } from "../core/txwin.js";
import { go } from "../router.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { searches, useRowSearch } from "../core/rowSearch.js";
import { fm, formatMoney } from "../format.js";
import { dcell } from "../dates.js";
import { displayName } from "../lib/activity.js";
import { catStats, shownCols, toggleCol, colValue, moneyCell, totalCell, CAT_COLS, CAT_COLS_START } from "../lib/catStats.js";
import { nextSort, ariaSort, sortRows } from "../lib/sortRows.js";
import { openForm } from "../core/forms.js";
import { useHistoryStep } from "../core/historyStep.js";
import { openSettingsTab } from "../views/settings/tab.js";
import { catTab } from "../views/categories/state.js";
import * as C from "../lib/categories.js";
import { ask as askYes } from "../core/ask.js";

export function useCategories() {
  const { t, locale } = useI18n();
  const S = computed(() => data.state.value);
  onMounted(() => { data.start(); });

  // Every change goes through the data store; true when something changed.
  const save = (edit) => data.change(edit).length > 0;
  const err = (m) => toast(m, { kind: "err" });
  const ok = (m, o = {}) => toast(m, { kind: "ok", ...o });

  const setTab = (k) => { catTab.value = k; };
  useHistoryStep("catTab", catTab);
  const TABS = [
    ["cats", '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
    ["tags", '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>'],
  ];
  // Opens a section of Settings → Automatic sorting (crules: category rules, trules: tag rules, ai: set up with an AI).
  const goRules = (id) => { openSettingsTab(id); go("/settings"); };

  // ---- the time looked at: the last 3, 6 or 12 full months (remembered in this browser) ----
  const months = usePref("moneyCatMonths", "6");
  const MONTHS = [3, 6, 12], MLABEL = { 3: "cats.period.m3", 6: "cats.period.m6", 12: "cats.period.m12" };
  const nM = computed(() => (MONTHS.includes(+months.value) ? +months.value : 6));
  const ST = computed(() => (S.value && home.value ? catStats(S.value, home.value.rows, now.value, nM.value) : null));
  const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
  const monthName = (m, o) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, o);
  // the period in words, for the card's line and the column tips: { n: 6, from: "Apr 2026", to: "Sept 2026" }
  const periodWords = computed(() => (ST.value ? { n: nM.value, from: monthName(ST.value.from, { month: "short", year: "numeric" }), to: monthName(ST.value.to, { month: "short", year: "numeric" }) } : {}));
  // money with its sign: + in, − out (lib/catStats.js moneyCell says which and the colour)
  const signed = (v) => formatMoney(v, { sign: true });

  // ---- one row ----
  // The change against the months before: an arrow and the amount; more spending (or less income) shows in red.
  function change(r) {
    if (!ST.value.hasPrev) return { text: t("cats.chg.none"), cls: "" };
    const before = r.main == "in" ? r.prevIn : r.prevOut, nowV = before + r.change;
    if (!before && !nowV) return { text: "", cls: "" };
    if (Math.abs(r.change) < Math.max(1, before * 0.02)) return { text: t("cats.chg.same"), cls: "same" };
    const good = r.main == "in" ? r.change > 0 : r.change < 0;
    return { text: fm(Math.abs(r.change)), cls: good ? "good" : "bad", up: r.change > 0 }; // the column title and its tip say what it is compared with
  }
  // The month-by-month bars of the open row: the money out (for income, the money in), the tallest bar full height.
  function bars(r) {
    const v = r.main == "in" ? r.inM : r.outM, mx = Math.max(...v, 1);
    return ST.value.months.map((m, i) => ({ m, h: (v[i] / mx) * 100, label: monthName(m, { month: "short" }), tip: t("cats.open.monthTip", { m: monthName(m, { month: "long", year: "numeric" }), out: fm(r.outM[i]), in: fm(r.inM[i]) }) }));
  }
  const txName = (x) => displayName(S.value, x);
  const openEntry = (x) => { if (!x.virtual) openTx(x.id); };

  // Any number of rows can be open at once ("cats:Food", "tags:trip").
  const open = ref([]);
  const isOpen = (id) => open.value.includes(id);
  const toggle = (id) => { open.value = isOpen(id) ? open.value.filter((x) => x != id) : [...open.value, id]; };

  // The ⋯ menu of a row: { kind: "cat" | "tag", k, btn }.
  const menu = ref(null);
  const toggleMenu = (kind, k, ev) => { menu.value = menu.value && menu.value.k == k && menu.value.kind == kind ? null : { kind, k, btn: ev.currentTarget }; };
  const menuRename = () => { const m = menu.value; menu.value = null; renOpen(m.kind, m.k); };
  const menuDel = () => { const m = menu.value; menu.value = null; if (m.kind == "tag") tagDel(m.k); else catDel(m.k); };

  // ---- the search bars: hide the rows whose words do not contain the search ----
  const catBox = ref(null), tagBox = ref(null);
  const noneCats = useRowSearch(catBox, "cats"), noneTags = useRowSearch(tagBox, "tags");

  // ---- the columns: which are shown (remembered like the months), their widths, and the order of the rows ----
  const colPref = usePref("moneyCatCols", CAT_COLS_START);
  const cols = computed(() => shownCols(colPref.value));
  const colMenu = ref(null);
  const flipCol = (c) => { colPref.value = toggleCol(cols.value, c); };
  const COLW = { change: "minmax(84px, .8fr)", budget: "minmax(104px, 1.1fr)", last: "minmax(84px, .8fr)", n: "minmax(56px, .5fr)", rules: "minmax(56px, .5fr)" };
  // tags have no budget, so the Tags tab leaves that column out
  const colsOf = (tab) => (tab == "tags" ? cols.value.filter((c) => c != "budget") : cols.value);
  const grid = (tab) => ["36px", "minmax(140px, 1.6fr)", ...colsOf(tab).map((c) => COLW[c] || "minmax(68px, .8fr)"), "34px"].join(" ");
  // a column's title and tip; the period columns name the months picked above
  const colHead = (c) => t("cats.col." + c, { n: nM.value });
  const colTip = (c) => t("cats.tip." + c, periodWords.value);
  // one sort per tab, not remembered; a column that is hidden is no longer sorted by
  const sorts = ref({ cats: null, tags: null });
  const sortBy = (tab, key) => { sorts.value[tab] = nextSort(sorts.value[tab], key); };
  function sorted(tab) {
    const s = sorts.value[tab], L = LISTS.value[tab];
    if (s && s.key != "name" && !colsOf(tab).includes(s.key)) return L.L.rows;
    return sortRows(L.L.rows, s, (r, c) => (c == "name" ? L.name(r.k) : colValue(r, c)), new Intl.Collator(loc.value, { sensitivity: "base", numeric: true }));
  }
  const sortIs = (tab, key) => { const s = sorts.value[tab]; return s && s.key == key ? s.ord : ""; };
  // a new budget starts at the row's usual month (rounded like suggested budgets); it can be changed before saving
  const setBudget = (r) => openForm("budget", { k: r.k, a: r.sugBudget });

  // ---- Categories ----
  const names = computed(() => (S.value ? catNames(S.value) : []));
  const noCats = computed(() => !S.value || !Object.keys(S.value.cats || {}).some((k) => k != "Uncategorized"));
  const newCat = ref("");
  function catAdd() {
    const c = C.addCategoryCheck(S.value, newCat.value);
    if (c.err) return err(c.err == "empty" ? t("cats.typeName") : t("cats.c.dup", { k: catLabel(c.ex) }));
    if (save((n) => C.addCategory(n, c.n))) newCat.value = "";
  }
  // the category or tag in Activity; with a month ("2026-09"), only that month
  const span = (m) => (m ? { from: m + "-01", to: m + "-31" } : {});
  const goCat = (k, m) => goActivity({ cat: k, ...span(m) });
  const ren = ref(null), renName = ref(""), renIn = ref(null);
  function renOpen(kind, k) { ren.value = { kind, k }; renName.value = kind == "tag" ? k : catLabel(k); setTimeout(() => { renIn.value?.focus(); renIn.value?.select(); }, 60); }
  function renGo() {
    const { kind, k } = ren.value;
    if (kind == "tag") return tagRenameGo(k);
    // the box shows the name in the page's language: a name typed the way a category is shown means that category
    const v = renName.value.trim(), shown = names.value.find((x) => catLabel(x).toLowerCase() == v.toLowerCase());
    const c = C.renameCheck(S.value, k, shown || v);
    if (c.err) return err(c.err == "empty" ? t("cats.typeName") : t("cats.c.reserved"));
    if (c.same) { ren.value = null; return; }
    const doIt = () => { save((n) => C.renameCategory(n, k, c.tg)); ren.value = null; ok(t("cats.c.renamed", { n: catLabel(c.tg) })); };
    if (c.ex) askYes(t("cats.c.mergeQ", { ex: catLabel(c.ex), k: catLabel(k) }), "", doIt); else doIt();
  }
  function catDel(k) { askYes(t("cats.c.delQ", { k: catLabel(k) }), "", () => save((n) => C.deleteCategory(n, k)), { danger: true }); }
  // ---- Tags ----
  const newTag = ref("");
  function tagAdd() {
    const c = C.addTagCheck(S.value, newTag.value);
    if (c.err) return err(c.err == "empty" ? t("cats.typeName") : t("cats.g.dup", { g: c.ex }));
    if (save((n) => C.addTag(n, c.g))) newTag.value = "";
  }
  const goTag = (g, m) => goActivity({ tag: g, ...span(m) });
  function tagRenameGo(g) {
    const n = C.normTag(S.value, renName.value);
    if (!n) return err(t("cats.typeName"));
    if (n == g) { ren.value = null; return; }
    save((x) => C.renameTag(x, g, n));
    ren.value = null;
    ok(t("cats.g.renamed", { n }));
  }
  function tagDel(g) { const n = C.tagUses(S.value, g); askYes(t("cats.g.delQ", { g, n }, n), "", () => save((x) => C.deleteTag(x, g)), { danger: true }); }

  // What each tab lists: its rows, how a row is named and coloured, and where its rules and its activity are.
  const LISTS = computed(() => (ST.value ? {
    cats: { L: ST.value.cats, kind: "cat", head: t("cats.col.cat"), name: catLabel, color: (k) => catColor(S.value, k), letter: (k) => (Array.from(k)[0] || "?").toUpperCase(), rules: "crules", act: goCat, edit: (k) => k != "Uncategorized" },
    tags: { L: ST.value.tags, kind: "tag", head: t("cats.col.tag"), name: (g) => "#" + g, color: () => "var(--acc)", letter: () => "#", rules: "trules", act: goTag, edit: () => true },
  } : null));

  return {
    t, locale, S, save, err, ok, setTab, TABS, goRules, months, MONTHS, MLABEL, nM, ST, loc, monthName, periodWords, signed,
    change, bars, txName, openEntry, open, isOpen, toggle, menu, toggleMenu, menuRename, menuDel, catBox, tagBox, noneCats, noneTags,
    colPref, cols, colMenu, flipCol, COLW, colsOf, grid, colHead, colTip, sorts, sortBy, sorted, sortIs, setBudget,
    names, noCats, newCat, catAdd, span, goCat, ren, renName, renIn, renOpen, renGo, catDel, newTag, tagAdd, goTag, tagRenameGo, tagDel, LISTS,
    catTab, searches, go, fm, dcell, ariaSort, moneyCell, totalCell, CAT_COLS, C, askYes, catLabel, catColor, colValue, openTx,
  };
}
