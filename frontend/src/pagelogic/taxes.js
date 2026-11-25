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
import { request } from "../core/http.js";
import { toast, clearToast } from "../core/toast.js";
import { saveFile } from "../core/saveFile.js";
import { catLabel } from "../core/cats.js";
import { zipFiles } from "../lib/zip.js";
import { taxZipPlan } from "../lib/taxExport.js";
import { taxesGo } from "../core/shell.js";
import { weekStart, usePref } from "../core/prefs.js";
import { dstr } from "../dates.js";
import { fm } from "../lib/bills.js";
import { amtText } from "../lib/txrows.js";
import { addM } from "../lib/home.js";
import { taxesModel, taxMonth, itemPeriods, periodReport, periodOf, EXAMPLES, EXAMPLE_TYPES, addExample, deleteTaxItem, moveTaxDate, markTaxDone, unmarkTaxDone } from "../lib/taxReports.js";

// How a history line writes a date ("15 Nov 2026", shown in Hebrew through tx()); the other names keep the defaults.
// The page and the add/change window both use it, so history reads the same everywhere.
export const histCtx = { dstr: (d) => (!/^\d{4}-\d{2}-\d{2}/.test(String(d)) ? String(d) : new Date(String(d).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })) };

// The page's icons (desktop and phone): the calendar (Coming up), a dash (not needed now), a paper, a paper clip, info,
// download and a list.
export const TAX_ICON = {
  up: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3"/>',
  quiet: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
};

// asksFor: false for a screen that only shows one report (the phone report screen): the list or page that opens it takes the alert's request
export function useTaxes({ asksFor = true } = {}) {
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
  // an alert's Open (core/shell.js openAlert) asks for one item's period
  if (asksFor) watch(taxesGo, (o) => { if (!o) return; openItem({ item: { id: o.id }, period: o.key ? { key: o.key } : null }); taxesGo.value = null; }, { immediate: true });
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

  // ---- download everything for this report: one zip with the summary and every attached file ----
  const zipping = ref(false);
  async function downloadZip() {
    const c = cur.value; if (!c?.report || zipping.value) return;
    const k = (x) => t("exp.c." + x), P = c.period;
    const W = { span: t("taxes.page.moneyFrom", { span: span(P) }), last: t("taxes.page.lastDay", { date: dd(P.last) }), made: t("taxes.page.zip.made", { date: dd(today.value) }),
      in: t("taxes.page.kIn"), out: t("taxes.page.kOut"), amt: t("taxes.page.kAmt"), back: t("taxes.page.kBack"), noAmt: t("taxes.page.kNoAmt"), vatIn: t("taxes.page.zip.vatIn"), vatOut: t("taxes.page.zip.vatOut"),
      papers: t("taxes.page.papersTitle"), papersNone: t("taxes.page.papersNone"), need: { receipt: t("taxes.page.need.receipt"), invoice: t("taxes.page.need.invoice") },
      tx: t("taxes.page.txTitle"), txNone: t("taxes.page.txNone"), note: t("taxes.page.zip.note"), notHere: t("taxes.page.zip.notHere"),
      c: { date: k("date"), desc: k("desc"), from: k("from"), to: k("to"), cat: k("cat"), tags: k("tags"), amount: k("amount"), docs: k("docs") } };
    const o = { name: nameOf(c.item), report: c.report, W, lang: locale.value, cat: (x) => catLabel(x), money: fm, moneyAbs: fmAbs, amtText, day: dstr };
    zipping.value = true;
    try {
      // fetch each file; one the server does not have (404, 403…) is listed as not on the server, only a lost connection stops the zip
      const first = taxZipPlan(o), got = new Map(), gone = new Set();
      for (const [i, f] of first.fetch.entries()) {
        toast(t("taxes.page.zip.getting", { i: i + 1, n: first.fetch.length }), { kind: "info", sticky: "taxzip" });
        const r = await request("/api/documents/" + f.id);
        if (r.ok) got.set(f.id, new Uint8Array(await r.arrayBuffer()));
        else if (r.status >= 400 && r.status < 500) gone.add(f.id);
        else throw new Error(String(r.status));
      }
      const plan = gone.size ? taxZipPlan({ ...o, gone }) : first;
      const files = [{ name: "summary.csv", data: plan.csv }, { name: "summary.html", data: plan.html }, ...plan.fetch.map((f) => ({ name: f.path, data: got.get(f.id) }))];
      saveFile(zipFiles(files, today.value), plan.zipName);
      clearToast("taxzip");
      // the months and ".zip" kept as one left-to-right piece, so a Hebrew name reads right (as dd() does for dates)
      toast(t("exp.done", { name: plan.zipName.replace(/(\d[\d\-–]*\.zip)$/, "\u2066$1\u2069") }));
    } catch (e) {
      clearToast("taxzip");
      toast(t(e?.code == "ZIP_TOO_BIG" ? "taxes.page.zip.tooBig" : "taxes.page.zip.fail"), { kind: "err" });
    } finally { zipping.value = false; }
  }

  // ---- the calendar ----
  // List or Calendar (remembered on this device; the list by default). The month shown, and the day chosen in it.
  const view = usePref("moneyTaxView", "list");
  const calYm = ref(""), calDay = ref("");
  const ymNow = computed(() => today.value.slice(0, 7));
  const shownYm = computed(() => calYm.value || ymNow.value);
  const cal = computed(() => (S.value ? taxMonth(S.value, shownYm.value, today.value, weekStart.value) : null));
  const calTitle = computed(() => monthName(shownYm.value + "-01", true));
  // the weekday letters, from the week's first day (Sunday 7 Jan 2024)
  const calWeek = computed(() => [...Array(7)].map((_, i) => new Date(2024, 0, 7 + i + (weekStart.value == "mon" ? 1 : 0)).toLocaleDateString(loc.value, { weekday: locale.value == "he" ? "narrow" : "short" })));
  function calMove(k) {
    calYm.value = addM(shownYm.value, k);
    calDay.value = calYm.value == ymNow.value ? today.value : "";
  }
  const calToday = () => { calYm.value = ""; calDay.value = today.value; };
  // the chosen day: today when the month shown is this month, until another day is tapped
  const chosen = computed(() => calDay.value || (shownYm.value == ymNow.value ? today.value : ""));
  const chosenMarks = computed(() => cal.value?.cells.find((c) => c.k == chosen.value)?.marks || []);
  const longDay = (d) => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)).toLocaleDateString(loc.value, { weekday: "long", day: "numeric", month: "long" });
  const calLabel = (c) => t("taxes.page.cal.day", { date: longDay(c.k), n: c.marks.length }, c.marks.length);
  const openMark = (m) => openItem({ item: m.item, period: m.period });
  // a chevron that points to the start or end side, drawn per language (a flip by a style did not show on the phone)
  const chev = (end) => ((locale.value == "he") == end ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6");

  return { t, S, M, any, today, nameOf, span, lastText, wantText, isLate, whyQuiet, fm, fmAbs, amountOf, dstr, dd, EXG, addEx, addOwn, exMenu,
    menu, toggleMenu, menuItems, MI, pick, moveFor, openMove, saveMove, askDelete, open, openItem, closeItem, cur, curAmt, needsPapers, pickPeriod, stateOf, doneF, markDone, unmarkDone, txRows, attach, zipping, downloadZip,
    view, cal, calTitle, calWeek, calMove, calToday, calDay, chosen, chosenMarks, longDay, calLabel, openMark, shownYm, ymNow, chev, ICON: TAX_ICON };
}
