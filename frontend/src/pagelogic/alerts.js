// What the Alerts page knows and does, without the screen: what needs attention now, and the history of every alert.
// Used by the computer's Alerts page (views/Alerts.vue) and the phone's Alerts screen, so both show the same alerts.
// The alerts come from lib/alerts.js (the same rules as the Home box); their words from lib/alerttext.js and the language files.
// Dismiss is saved directly: change a copy, PUT /api/state, load the fresh copy.
import { openSettingsTab } from "../views/settings/tab.js";
import { go } from "../router.js";
import { ref, computed, watch, onMounted } from "vue";
import { useHistoryStep } from "../core/historyStep.js";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home, budgets, fcSaved } from "../core/derived.js";
import { now } from "../core/clock.js";
import { request } from "../core/http.js";
import { alertsReported, makeFriendly } from "../core/alertReport.js";
import { openAlert } from "../core/shell.js";
import { alertsModel } from "../lib/alerts.js";
import { alertTexts, reverseTable, reverseText } from "../lib/alerttext.js";
import { dstr } from "../dates.js";
import { categoryName } from "../catnames.js";
import en from "../locales/en.json";

export function useAlerts() {
  const { t, locale } = useI18n();
  const S = computed(() => data.state.value);
  // When each open alert first appeared (the server keeps it in the alert history)
  const since = ref({});
  async function loadSince() {
    try { since.value = await (await request("/api/alerts/open", { cache: "no-store" })).json(); } catch { /* the dates are simply left out */ }
  }
  onMounted(async () => {
    data.start();
    loadSince();
  });

  const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
  const an = (n) => categoryName(n, locale.value);
  const catName = (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : categoryName(c, locale.value));
  const monthYear = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
  const friendly = makeFriendly(t);

  // ---- the alerts ----
  const M = home; // worked out once for the whole app (core/derived.js)
  const list = computed(() => (S.value && M.value ? alertsModel(S.value, { ...M.value, budgets: budgets.value.info }, now.value, fcSaved.value, friendly) : []));
  const ctx = computed(() => ({ t, catName, an, dstr, monthYear }));
  const rows = computed(() => list.value.map((x) => { const [title, text] = alertTexts(x, ctx.value); return { ...x, title, text }; }));

  // The open alerts are reported to the server on every page (core/alertReport.js); an open History tab then loads again.
  watch(alertsReported, () => { loadSince(); if (tab.value === "hist" && hist.value.loaded) loadHist(false); });

  // ---- saving ----
  // Saving goes through the data store (stores/data.js).
  function change(edit) { data.change((next) => { edit(next); return []; }); }
  const dismiss = (x) => change((n) => { n.dismissed = { ...(n.dismissed || {}), [x.id]: 1 }; });

  // ---- Open: each alert goes to its place (openAlert in core/shell.js) ----
  const open = (x) => openAlert(x, x.title);

  // ---- tabs and history ----
  const tab = ref("now");
  const hist = ref({ rows: [], more: false, loaded: false, busy: false });
  async function loadHist(more) {
    const h = hist.value; if (h.busy) return; h.busy = true;
    try {
      const off = more ? h.rows.length : 0, r = await request("/api/alerts/history?limit=50&offset=" + off, { cache: "no-store" }), j = await r.json();
      h.rows = more ? h.rows.concat(j.rows) : j.rows; h.more = j.more; h.loaded = true;
    } catch { /* stays on Loading */ }
    h.busy = false;
  }
  const pick = (v) => { tab.value = v; if (v === "hist") loadHist(false); }; // always fresh: alerts dismissed on the other tab close in the history
  useHistoryStep("alTab", tab, { set: pick });
  const table = reverseTable(en);
  const when = (x) => new Date(x).toLocaleString(loc.value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const dur = (a, b) => { const m = Math.max(1, Math.round((new Date(b) - new Date(a)) / 6e4)); return m < 60 ? t("alerts.durMin", { n: m }) : m < 2880 ? t("alerts.durH", { n: Math.round(m / 60) }) : t("alerts.durD", { n: Math.round(m / 1440) }); };
  const monthD = (d) => d.toLocaleDateString(loc.value, { month: "short", year: "numeric" });
  const said = (s) => (locale.value === "en" ? s : reverseText(table, t, s, { catName, an, monthYear: monthD })?.text ?? s);
  const histRows = computed(() => hist.value.rows.map((r) => ({ ...r, title2: said(r.title), detail2: said(r.detail) })));
  return { data, openSettingsTab, go, t, locale, S, since, loadSince, loc, an, catName, monthYear, friendly, M, list, ctx, rows, change, dismiss, open, tab, hist, loadHist, pick, table, when, dur, monthD, said, histRows };
}
