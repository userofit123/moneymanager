// What the app frame and the pages share: which panels are open, and "open Activity with these filters".
import { ref } from "vue";
import { go } from "../router.js";

export const appearanceOpen = ref(false);
export const moreOpen = ref(false);
export const quickOpen = ref(false); // the "Add or update" sheet (the + button)
export const syncOpen = ref(false); // the "Sources" sheet (sync status)

// Opens Activity with only these filters on (every other filter is cleared,
// sorting goes back to newest first and grouping to by month). o: { from, to, cat, tag, ty, q, src, focus: [ids], tab: "all" | "rev" | "exp" }.
export const activityGo = ref(null);
export function goActivity(o = {}) {
  activityGo.value = { ...o, at: Date.now() };
  go("/activity");
}

// "Open" on an alert (alOpen): its transaction, or Activity showing only the alert's items (with its title above them),
// or the tab or settings section it is about, or its page.
const ALGO = { bills: "/bills", budg: "/budgets", jars: "/jars", tx: "/activity", dash: "/", set: "/settings", fc: "/forecast", acc: "/accounts" };
export async function openAlert(al, title) {
  if (al.attach) { go("/activity"); (await import("./txwin.js")).openTx(al.attach); return; }
  if (al.go == "tx") { goActivity(al.ids && al.ids.length ? { focus: al.ids, label: title } : { tab: al.tab || "all" }); return; }
  if (al.go == "set" && al.tab) (await import("../views/settings/tab.js")).openSettingsTab(al.tab);
  go(ALGO[al.go] || "/alerts");
}
