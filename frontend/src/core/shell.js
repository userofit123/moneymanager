// What the app frame and the pages share: which panels are open, and "open Activity with these filters".
import { ref } from "vue";
import { go } from "../router.js";

export const appearanceOpen = ref(false);
export const moreOpen = ref(false);
export const quickOpen = ref(false); // the "Add or update" sheet (the + button)
export const syncOpen = ref(false); // the "Sources" sheet (sync status)

// Opens Activity with only these filters on, like goActivity()/resetTx() in the current app (every other filter is cleared,
// sorting goes back to newest first and grouping to by month). o: { from, to, cat, tag, ty, q, src, focus: [ids], tab: "all" | "rev" | "exp" }.
export const activityGo = ref(null);
export function goActivity(o = {}) {
  activityGo.value = { ...o, at: Date.now() };
  go("/activity");
}
