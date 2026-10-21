// The connected banks, cards and wallets and how their last sync went (the SRC list in web/js/02-state-data.js derive, syncLabel in 08-jars.js),
// and "Sync now" (syncNow in 07-periods-rules.js).
import { computed } from "vue";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { toast } from "./toast.js";
import { runJob, lastItems } from "./jobs.js";
import { tx } from "./heText.js";

const SRCDEF = [["Bank Hapoalim", "hapoalim"], ["Max", "max"], ["Isracard", "isracard"], ["Wise", "wise"]];
export const SRCN = { hapoalim: "Bank Hapoalim", max: "Max", isracard: "Isracard", wise: "Wise" };
const t = (...a) => i18n.global.t(...a);
const loc = () => (i18n.global.locale.value === "he" ? "he-IL" : "en-GB");
export const fmtWhen = (w) => new Date(w).toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// A source's display name: its nickname if it has one.
export const srcName = (k) => { const c = data.state.value?.connStatus?.[k]; return (c && c.label) || SRCN[k] || (k == "all" ? t("sync.all") : k); };

// The bank's own error made plain (friendlyErr). The long explanations are in the al.fe* texts.
export function friendlyErr(e) {
  e = e || "";
  if (/fetchPostWithinPage|fetchGetWithinPage|Unexpected end of JSON/i.test(e)) {
    const st = (e.match(/reqName=([A-Za-z_0-9]+)/) || [])[1] || "";
    return /^(ValidateIdData|performLogonI)$/.test(st) ? t("al.feLogon") : t("al.feNoData") + (st ? t("al.feStep", { st }) : "");
  }
  return /^OTP_REQUIRED/.test(e) ? t("al.feOtp") : tx(e);
}

export const sources = computed(() => {
  const S = data.state.value; if (!S) return [];
  i18n.global.locale.value; // texts follow the language
  const cs = S.connStatus || {}, L = Object.keys(cs).filter((k) => (S.connected || {})[k]).map((k) => [cs[k].label || k, k]);
  return (L.length ? L : SRCDEF).map(([n, k]) => {
    const c = cs[k] || { key: "none", label: t("sync.noCreds"), tone: "gray" }, when = c.since ? fmtWhen(c.since) : t("sync.never");
    const state = c.tone == "green" ? "ok" : c.tone == "red" ? "bad" : "warn";
    const msg = { none: t("sync.mNone"), untested: t("sync.mUntested"), tested: t("sync.mTested"), connected: t("sync.mConnected", { when }), stale: t("sync.mStale", { when }), failed: friendlyErr(c.error) || t("sync.mFailed"), locked: t("sync.mLocked"), otp: friendlyErr(c.error) }[c.key] || "";
    return { n, k, state, text: c.label ? tx(c.label) : t("sync.noCreds"), msg, t: c.since ? when : "", goConn: c.key != "connected" };
  }).concat((S.accounts || []).some((a) => a.kind == "pension" && !a.hide && +a.v > 0) ? [{ n: t("sync.pension"), k: "pension", state: "ok", text: t("sync.manual"), t: "manual", msg: t("sync.mPension") }] : []);
});
// The label under the sync button in the side menu: the last sync, or that one failed, or nothing yet.
export const syncState = computed(() => {
  const real = sources.value.filter((x) => x.k != "pension"), ok = real.filter((x) => x.state == "ok" && x.t);
  const bad = real.some((x) => x.state == "bad");
  return { live: bad ? "bad" : ok.length ? "ok" : "warn", top: ok.length ? t("shell.synced") : bad ? t("shell.failed") : t("shell.notSynced"), sub: ok.length ? ok[0].t : bad ? t("shell.seeSources") : t("shell.yet") };
});

export async function syncNow() {
  try {
    const r = await runJob("all", "sync", () => data.api("/api/sync", { method: "POST" }));
    if (!r) return;
    await data.load(); data.loadFx();
    lastItems.value = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && v.skipped ? { state: "skipped" } : v && v.ok ? { state: "done", added: v.added || 0 } : { state: "failed", msg: v && v.error }]));
    const bad = Object.entries(r).filter(([, v]) => v && v.ok === false && !v.skipped);
    toast(bad.length ? t("sync.failedSee", { names: bad.map(([k]) => srcName(k)).join(", ") }) : t("sync.finished"), { kind: bad.length ? "err" : "ok" });
  } catch (e) { toast(e.message, { kind: "err" }); }
}
