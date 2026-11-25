// What the Taxes and reports page knows and does, without the screen: the list of items (coming up and not needed now),
// the ready-made examples, the ⋯ menu (change, move this one date, delete), one item's report (its periods, money,
// missing papers and Done) and the changes. The numbers come from lib/taxReports.js; changes go through the data store.
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now, dayOf } from "../core/clock.js";
import { openForm } from "../core/forms.js";
import { ask } from "../core/ask.js";
import { attachDocs } from "../core/attachDocs.js";
import { dstr } from "../dates.js";
import { fm } from "../lib/bills.js";
import { taxesModel, itemPeriods, periodReport, periodOf, EXAMPLES, EXAMPLE_TYPES, addExample, deleteTaxItem, moveTaxDate, markTaxDone, unmarkTaxDone } from "../lib/taxReports.js";

export function useTaxes() {
  const { t, te, locale } = useI18n();
  const S = computed(() => data.state.value);
  const today = computed(() => dayOf(now.value));
  const M = computed(() => (S.value ? taxesModel(S.value, today.value) : null));
  const any = computed(() => (S.value?.taxItems || []).length > 0);
  const itemOf = (id) => (S.value?.taxItems || []).find((x) => x.id == id) || null;

  // ---- how things are written ----
  const tk = (k) => (k && te(k) ? t(k) : "");
  const nameOf = (it) => it?.n || tk(it?.nk) || "";
  const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
  const monthName = (d, year) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, year ? { month: "long", year: "numeric" } : { month: "long" });
  // The months a period counts: "2026" (a whole year), "November 2026", "November–December 2026", "December 2026–March 2027".
  function span(P) {
    if (!P) return "";
    const s = P.start, e = P.end;
    if (s.slice(5) == "01-01" && e.slice(5) == "12-31" && s.slice(0, 4) == e.slice(0, 4)) return s.slice(0, 4);
    if (s.slice(0, 7) == e.slice(0, 7)) return monthName(s, true);
    return (s.slice(0, 4) == e.slice(0, 4) ? monthName(s) : monthName(s, true)) + "–" + monthName(e, true);
  }
  // A date inside a sentence. In Hebrew every text goes through isolateNumbers (i18n.js), which wraps 15, 11 and 2025
  // one by one and so turns 15/11/2025 around; kept as one left-to-right piece, it reads 15/11/2025.
  const dd = (d) => "\u2066" + dstr(d) + "\u2069";
  // How a history line writes a date ("15 Nov 2026", shown in Hebrew through tx()); the other names keep the defaults.
  const histCtx = { dstr: (d) => (!/^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d) : new Date(String(d).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })) };
  // An amount to pay or to get back, as shown: the number without its sign, and which of the two it is.
  const amountOf = (rep) => (rep?.amount == null ? null : { n: Math.abs(rep.amount), back: rep.amount < 0 });
  const fmAbs = (n) => fm(Math.abs(+n || 0));
  const daysTo = (d) => Math.round((Date.parse(d) - Date.parse(today.value)) / 864e5);
  const isLate = (P) => !!P && P.last < today.value && !P.done;
  // "Last day 15 Jan · in 3 days" / "Last day was 15 Sep"
  function lastText(P) {
    if (isLate(P)) return t("taxes.page.lastWas", { date: dd(P.last) });
    const n = daysTo(P.last), when = n == 0 ? t("taxes.page.today") : n <= 14 ? t("taxes.page.inDays", { n }, n) : "";
    return t("taxes.page.lastDay", { date: dd(P.last) }) + (when ? " · " + when : "");
  }
  const wantText = (P) => (P?.want && P.want != P.last && P.want >= today.value ? t("taxes.page.want", { date: dd(P.want) }) : "");
  const typeName = (id) => { const x = (S.value?.bizTypes || []).find((y) => y.id == id) || EXAMPLE_TYPES.find((y) => y.id == id); return x ? x.n || tk(x.nk) || tk("taxes.type." + x.id) : ""; };
  // Why a quiet item is not needed now.
  function whyQuiet(r) {
    const w = r.item.when || {};
    if (w.type && typeName(w.type)) return t("taxes.page.onlyType", { type: typeName(w.type) });
    if (+w.over > 0) return t("taxes.page.onlyLimit", { amount: fm(+w.over) });
    return t("taxes.page.noDates");
  }

  // ---- ready-made examples ----
  const EXG = ["il", "us"].map((c) => ({ c, L: EXAMPLES.filter((x) => x.country == c) }));
  // Add an example with one tap, then open its window so it can be changed.
  function addEx(ex) {
    exMenu.value = null;
    const before = new Set((S.value?.taxItems || []).map((x) => x.id));
    data.change((N) => addExample(N, ex, histCtx));
    const it = (S.value?.taxItems || []).find((x) => !before.has(x.id));
    if (it) openForm("tax", { id: it.id });
  }
  const exMenu = ref(null); // the button the Add menu belongs to
  const addOwn = () => { exMenu.value = null; openForm("tax"); };

  // ---- the ⋯ menu ----
  const menu = ref(null); // { id, key, btn }
  const toggleMenu = (r, ev) => { menu.value = menu.value?.id == r.item.id ? null : { id: r.item.id, key: r.period?.key || "", btn: ev.currentTarget }; };
  const menuItems = computed(() => (menu.value ? [["edit", "e"], ...(menu.value.key ? [["move", "m"]] : []), ["del", "x", true]] : []));
  const MI = { e: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>', m: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M10 15h6M13 12l3 3-3 3"/>', x: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
  function pick(a) {
    const m = menu.value; menu.value = null;
    if (!m) return;
    if (a == "edit") openForm("tax", { id: m.id });
    if (a == "move") openMove(m.id, m.key);
    if (a == "del") askDelete(m.id);
  }
  function askDelete(id) {
    const it = itemOf(id); if (!it) return;
    ask(t("taxes.page.delAsk", { name: nameOf(it) }), t("taxes.page.delText"), () => { if (open.value?.id == id) open.value = null; data.change((N) => deleteTaxItem(N, id, histCtx)); }, { danger: true, yes: t("taxes.page.delYes") });
  }

  // ---- move this one date ----
  const moveFor = ref(null); // { id, key, to }
  const openMove = (id, key) => { const it = itemOf(id); moveFor.value = { id, key, to: it?.moved?.[key] || key }; };
  function saveMove(back) {
    const m = moveFor.value; moveFor.value = null;
    if (m) data.change((N) => moveTaxDate(N, m.id, m.key, back ? "" : m.to, histCtx));
  }

  // ---- one item's report ----
  const open = ref(null); // { id, key }
  const openItem = (r) => { open.value = { id: r.item.id, key: r.period?.key || "" }; menu.value = null; };
  const closeItem = () => { open.value = null; };
  const cur = computed(() => {
    const o = open.value, it = o && itemOf(o.id);
    if (!it || !S.value) return null;
    const L = itemPeriods(S.value, it, today.value);
    const P = (o.key && (L.find((p) => p.key == o.key) || (it.repeat ? periodOf(it, o.key) : null))) || L.find(isLate) || L[0] || null;
    return { item: it, periods: L, period: P, report: P ? periodReport(S.value, it, P, today.value) : null };
  });
  const pickPeriod = (key) => { if (open.value) open.value = { ...open.value, key }; };
  // whether the item asks for a receipt or an invoice at all (when not, the page has no Missing papers part)
  const needsPapers = computed(() => ["in", "out"].some((k) => (cur.value?.item.papers?.[k]?.need || "none") != "none"));
  const curAmt = computed(() => amountOf(cur.value?.report));
  const stateOf = (P) => (P.done ? "done" : isLate(P) ? "late" : "next");

  // Sent or paid: starts empty each time a report opens, so nothing is marked unless the person ticks or types it
  const doneF = ref({ sent: false, paid: "", err: false });
  watch(() => [cur.value?.item.id, cur.value?.period?.key], () => {
    doneF.value = { sent: false, paid: "", err: false };
  }, { immediate: true });
  function markDone() {
    const c = cur.value, f = doneF.value; if (!c?.period) return;
    if (!f.sent && f.paid === "") { f.err = true; return; }
    data.change((N) => markTaxDone(N, c.item.id, c.period.key, { sent: f.sent, paid: f.paid === "" ? null : +f.paid }, today.value, histCtx));
  }
  const unmarkDone = () => { const c = cur.value; if (c?.period) data.change((N) => unmarkTaxDone(N, c.item.id, c.period.key, histCtx)); };

  // the transactions of the report, newest first, for the transaction list
  const txRows = computed(() => { const R = cur.value?.report?.rows; return R ? [...R.in, ...R.out].sort((a, b) => String(b.d).localeCompare(String(a.d))) : []; });
  const attach = (t0, e) => { const files = [...e.target.files]; e.target.value = ""; return attachDocs(t0, files); };

  return { t, S, M, any, today, nameOf, span, lastText, wantText, isLate, whyQuiet, fm, fmAbs, amountOf, dstr, dd, EXG, addEx, addOwn, exMenu,
    menu, toggleMenu, menuItems, MI, pick, moveFor, saveMove, open, openItem, closeItem, cur, curAmt, needsPapers, pickPeriod, stateOf, doneF, markDone, unmarkDone, txRows, attach };
}
