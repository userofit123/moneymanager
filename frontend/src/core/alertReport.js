// The server keeps a history of every alert (Alerts → History). The app tells it
// which alerts are open whenever they change, on every page, not only while the Alerts page is open.
// The history keeps the English sentences, so what is reported is always English.
import { ref, computed, watch } from "vue";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { home, budgets } from "./derived.js";
import { now } from "./clock.js";
import { request, sendJson } from "./http.js";
import { pickToNotify } from "../lib/alertNotify.js";
import { alertsModel } from "../lib/alerts.js";
import { alertTexts } from "../lib/alerttext.js";
import { dstr } from "../dates.js";
import { categoryName } from "../catnames.js";
import { notify } from "./pwa.js";

const enT = (k, p) => i18n.global.t(k, p || {}, { locale: "en" });
// makeFriendly(t)(error): a bank's raw error text in plain words, in the language of t (the Alerts page uses it too)
export const makeFriendly = (t) => (e) => {
  e = e || "";
  if (/fetchPostWithinPage|fetchGetWithinPage|Unexpected end of JSON/i.test(e)) { const st = (e.match(/reqName=([A-Za-z_0-9]+)/) || [])[1] || ""; return /^(ValidateIdData|performLogonI)$/.test(st) ? t("al.feLogon") : t("al.feNoData") + (st ? t("al.feStep", { st }) : ""); }
  return /^OTP_REQUIRED/.test(e) ? t("al.feOtp") : e;
};
const friendly = makeFriendly(enT);
const enCtx = { t: enT, catName: (c) => (!c || c === "Uncategorized" ? enT("home.uncategorizedCat") : categoryName(c, "en")), an: (n) => categoryName(n, "en"), dstr, monthYear: (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) };
const rows = computed(() => {
  const S = data.state.value;
  if (!S || !home.value) return [];
  return alertsModel(S, { ...home.value, budgets: budgets.value.info }, now.value, {}, friendly).map((x) => { const [title, text] = alertTexts(x, enCtx); return { key: String(x.id), title, detail: text, sev: x.sev }; });
});
// goes up after each report, so an open History tab can load again
export const alertsReported = ref(0);
let sig = "";
watch(rows, (L) => {
  if (!data.state.value || data.state.value.rev == null) return;
  const s = JSON.stringify(L.map((x) => [x.key, x.title, x.detail]));
  if (s === sig) return; sig = s;
  request("/api/alerts/seen", sendJson("POST", { alerts: L })).then(() => alertsReported.value++).catch(() => {});
}, { immediate: true });

// Up to two urgent alerts as phone notifications, each only once per device while it stays open (only when notifications are allowed),
// in the language of the page.
let notified = false;
watch(rows, (L) => {
  if (notified || !L.length || !data.state.value || data.state.value.rev == null) return;
  notified = true;
  const t = i18n.global.t, lc = i18n.global.locale.value, loc = lc === "he" ? "he-IL" : "en-GB";
  const ctx = { t, catName: (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : categoryName(c, lc)), an: (n) => categoryName(n, lc), dstr, monthYear: (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc, { month: "short", year: "numeric" }) };
  const list = alertsModel(data.state.value, { ...home.value, budgets: budgets.value.info }, now.value, {}, makeFriendly(t));
  // only the alerts this device was not told about before (kept in this browser, so a refresh does not repeat them)
  let told = []; try { told = JSON.parse(localStorage.getItem("moneyNotified") || "[]"); } catch { /* starts empty */ }
  const { fresh, keep } = pickToNotify(list, told);
  try { localStorage.setItem("moneyNotified", JSON.stringify(keep)); } catch { /* not saved: the next open may repeat them */ }
  fresh.forEach((x) => { const [title, body] = alertTexts(x, ctx); notify(title, body); });
});
