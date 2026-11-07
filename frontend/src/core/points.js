// Points and levels for the whole app (the numbers are worked out in lib/points.js):
//   - the points a change by the person earns, given inside that same change (data store's earn hook), so Undo takes them back;
//   - the daily visit, setup steps and month results, saved quietly (no history line, no "Saved", no Undo): they are not
//     something the person did, and never go away;
//   - the setting that turns points off (Settings → Preferences, "moneyPoints": "off"); then nothing is given or saved.
import { computed } from "vue";
import { data } from "../stores/data.js";
import { now, dayOf } from "./clock.js";
import { readPref, usePref, prefTick } from "./prefs.js";
import { home } from "./derived.js";
import { POINTS, award, earnFromChange, pointsUpkeep, pointsSummary } from "../lib/points.js";

// Points on or off (on unless turned off). pointsPref is the setting as a ref, for the Settings switch: "on" or "off".
export const pointsPref = usePref("moneyPoints", "on");
const pointsOn = () => readPref("moneyPoints", "on") !== "off";

// Everything the screens show (lib/points.js pointsSummary), or null with no data or with points off.
const S = () => data.state.value;
export const points = computed(() => (prefTick.value, S() && pointsOn() ? pointsSummary(S(), now.value, home.value?.rows) : null));

// a change by the person: its points on the same copy
data.hooks.earn = (before, after, lines) => { if (pointsOn()) earnFromChange(before, after, lines, now.value); };

// the app's upkeep after every load and change (core/upkeep.js): setup steps and last month's results
export function pointsAfterUpkeep(S2) { if (pointsOn()) pointsUpkeep(S2, now.value); }

// Saves points that are not a change by the person (no history line, no "Saved", no Undo).
function earnQuietly(key, kind, pts, d) {
  if (!pointsOn() || !S() || S().points?.[key]) return;
  data.change((S2) => { award(S2, key, kind, pts, now.value, d); return []; }, { quiet: true });
}
// a balance gap marked as looked at in Needs review (that is saved on the server, so its points come here)
export const gapReviewed = (id) => earnQuietly("review:gap:" + id, "review", POINTS.review);

// The daily visit: only when the person really uses the app (a tap, click or key while the page shows), not a tab left open.
function visit() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  earnQuietly("visit:" + dayOf(now.value), "visit", POINTS.visit, dayOf(now.value));
}
if (typeof window !== "undefined") ["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, visit, { passive: true, capture: true }));
