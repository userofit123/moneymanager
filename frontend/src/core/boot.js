// Starting the app, like boot() and afterLogin() in web/js/08-jars.js: put the look on the page, ask whether this browser is signed in,
// show the sign-in (or first password) screen if not, then take the newer saved choices, load the data and keep it fresh.
import { reactive, ref, watch } from "vue";
import { request, getJson, sendJson, signedOut } from "./http.js";
import { restorePrefs } from "./prefs.js";
import { startTheme } from "./theme.js";
import { startClock } from "./clock.js";
import { data } from "../stores/data.js";
import { startUpdates } from "./updates.js";
import { watchJobs } from "./jobs.js";
import { startPwa, notify } from "./pwa.js";
import { openForm } from "./forms.js";
import { go } from "../router.js";
import { pages } from "../routes.js";

// phase: "start" (splash) | "auth" (sign-in screen) | "ready" | "down" (the server cannot be reached)
export const app = reactive({ phase: "start", authMode: "login", need2fa: false, error: "" });
// a bank verification window that was already open when the app started (Settings → Connections shows it)
export const assistWaiting = ref("");

export async function boot() {
  startTheme();
  startPwa();
  startClock();
  let st;
  try { st = await getJson("/api/auth/status"); } catch { app.phase = "down"; bootDone(); return; }
  if (!st.authed) { showAuth(st.setup ? "setup" : "login"); bootDone(); return; }
  await afterLogin();
}

function showAuth(mode) { app.authMode = mode || app.authMode; app.phase = "auth"; }

async function afterLogin() {
  app.need2fa = false; app.error = "";
  if (await restorePrefs()) return; // the page reloads with the newer choices
  syncTz();
  try { await data.start(); } catch { /* data.error shows it */ }
  app.phase = data.state.value ? "ready" : "down";
  bootDone();
  if (app.phase !== "ready") return;
  startUpdates();
  watchJobs((source) => { assistWaiting.value = source; });
  openFromAddress();
}

// The current app's old links still work: ?view=jars, #jars, and ?add=1 opens "Add transaction".
const OLDV = { dash: "home", tx: "activity", acc: "accounts", budg: "budgets", rep: "reports", fc: "forecast", set: "settings", cats: "categories" };
function openFromAddress() {
  const p = new URLSearchParams(location.search), v = p.get("view") || location.hash.slice(1), name = OLDV[v] || v;
  if (name && pages.some((x) => x.name === name)) go("/" + pages.find((x) => x.name === name).path.slice(1), { replace: true });
  if (p.get("add")) openForm("tx");
}
// Up to two urgent alerts as phone notifications when the app opens (if notifications are allowed).
export function notifyUrgent(list, text) {
  list.filter((x) => x.sev == "high").slice(0, 2).forEach((x) => { const [title, body] = text(x); notify(title, body); });
}

// "Create password" / "Sign in" on the sign-in screen. Returns nothing; app.error carries the message.
export async function signIn({ pw, pw2, code }) {
  const setup = app.authMode == "setup";
  app.error = "";
  if (setup && pw !== pw2) { app.error = "differ"; return; }
  const r = await request(setup ? "/api/auth/setup" : "/api/auth/login", sendJson("POST", { password: pw, code })).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (r && r.ok) { signedOut.value = false; await afterLogin(); return; }
  if (j.need2fa) { app.need2fa = true; app.error = j.error || ""; return; }
  if (j.setup) { showAuth("setup"); return; }
  app.error = j.error || "failed";
}

// A session that ends while the app is open (signed out elsewhere, expired) brings back the sign-in screen.
watch(signedOut, (v) => { if (v && app.phase !== "auth") { app.need2fa = false; data.end(); showAuth("login"); } });

// The automatic sync runs by the device's time zone.
async function syncTz() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone, j = await getJson("/api/sync/settings");
    if (z && j.tz !== z) await request("/api/sync/settings", sendJson("PUT", { tz: z }));
  } catch { /* not important enough to bother anyone */ }
}

// The splash fades out (html.boot → html.intro), like bootDone().
function bootDone() {
  const h = document.documentElement;
  if (!h.classList.contains("boot")) return;
  h.style.background = ""; h.classList.add("intro"); h.classList.remove("boot");
  setTimeout(() => h.classList.remove("intro"), 700);
}
// never stay on the splash
setTimeout(bootDone, 10000);
