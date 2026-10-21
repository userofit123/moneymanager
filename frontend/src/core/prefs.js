// The person's choices kept in this browser (language, look, date format, remembered time frames...), under the same keys as the current app,
// and also kept on the server, so a new device or window address gets them too (web/js/01-prefs-theme.js prefsAll/prefsPush/prefsRestore).
// Every change is stamped with its time; at start the newer copy (here or on the server) wins.
// Always read and write these through readPref/writePref (or usePref), never localStorage directly, or the server copy falls behind.
import { ref, watch } from "vue";
import { request, sendJson } from "./http.js";

export const PREF_KEYS = ["moneySugg", "moneyTheme", "moneyThemes", "moneyThemeAs", "moneyLang", "moneyBoot", "moneyFc", "moneyFlow", "moneyGroup", "moneyDf", "moneyWs", "moneyHelp", "moneyRanges", "moneyTrend"];
const AT = "moneyPrefsAt";
let pushOn = false; // only after the server copy was looked at, so an old copy here never overwrites a newer one there

const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function readPref(k, fallback = null) { try { const v = ls()?.getItem(k); return v == null ? fallback : v; } catch { return fallback; } }
export function readJson(k, fallback) { try { const v = JSON.parse(readPref(k, "null")); return v == null ? fallback : v; } catch { return fallback; } }
const rawSet = (k, v) => { try { ls()?.setItem(k, v); } catch { /* private mode: not remembered */ } };

export function writePref(k, v) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (readPref(k) === s) return;
  rawSet(k, s);
  if (PREF_KEYS.includes(k) && pushOn) { rawSet(AT, String(Date.now())); pushPrefs(); }
}
export const writeJson = (k, v) => writePref(k, JSON.stringify(v));

const all = () => { const o = {}; [...PREF_KEYS, AT].forEach((k) => { const v = readPref(k); if (v != null) o[k] = v; }); return o; };
let pushT = null;
export function pushPrefs() {
  clearTimeout(pushT);
  pushT = setTimeout(() => request("/api/prefs", { ...sendJson("PUT", all()), keepalive: true }).catch(() => {}), 50);
}

// Looks at the server copy once at start. Returns true when the page is reloading to use it.
export async function restorePrefs() {
  try {
    const r = await request("/api/prefs", { cache: "no-store" });
    if (!r.ok) return false;
    const sv = (await r.json()) || {};
    const svAt = +sv[AT] || 0, lcAt = +(readPref(AT) || 0), hasSv = PREF_KEYS.some((k) => typeof sv[k] == "string"), used = !!readPref("moneyPrefsSeen");
    // the server wins when it is newer, or when this window has never been used with saved preferences
    const useServer = hasSv && (svAt > lcAt || (svAt == 0 && lcAt == 0 && !used));
    let diff = 0;
    if (useServer) {
      PREF_KEYS.forEach((k) => { if (typeof sv[k] == "string" && readPref(k) !== sv[k]) { rawSet(k, sv[k]); diff++; } });
      if (svAt) rawSet(AT, String(svAt));
    } else if (!lcAt) rawSet(AT, String(Date.now()));
    let loop = false;
    try { loop = sessionStorage.getItem("moneyPrefsRl") === "1"; sessionStorage.setItem("moneyPrefsRl", "1"); } catch { /* no session storage */ }
    rawSet("moneyPrefsSeen", "1");
    pushOn = true;
    if (diff && !loop) { location.reload(); return true; }
    if (!useServer || (diff === 0 && svAt !== +(readPref(AT) || 0))) pushPrefs();
  } catch { pushOn = true; }
  return false;
}

// A choice as a ref that is saved when it changes: const group = usePref("moneyGroup", "month").
// With { json: true } the value is kept as JSON. Every use of the same key shares one ref.
const live = new Map();
export function usePref(k, fallback, { json = false } = {}) {
  if (live.has(k)) return live.get(k);
  const parse = (s) => { if (s == null) return fallback; if (!json) return s; try { return JSON.parse(s) ?? fallback; } catch { return fallback; } };
  const val = ref(parse(readPref(k)));
  watch(val, (v) => writePref(k, json ? JSON.stringify(v) : String(v)), { deep: json });
  live.set(k, val);
  return val;
}

// The date order and the first day of the week (Settings → Preferences), shared by every page.
export const dateFormat = ref(readPref("moneyDf") === "mdy" ? "mdy" : "dmy");
export const weekStart = ref(readPref("moneyWs") === "mon" ? "mon" : "sun");
watch(dateFormat, (v) => writePref("moneyDf", v));
watch(weekStart, (v) => writePref("moneyWs", v));
