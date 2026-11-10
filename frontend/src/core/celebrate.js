// A small party when the person reaches a new level: confetti from the top of the screen and a burst from the level badge
// (components/LevelParty.vue draws it), with a short message. Only after something the person did (also one with no history
// line, like dismissing an alert; not on load, a sync, Undo or the daily visit); never with points off or with the setting off (Settings → Preferences, "moneyCelebrate": "off").
import { ref } from "vue";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { readPref, usePref } from "./prefs.js";
import { toast } from "./toast.js";
import { levelReached } from "../lib/points.js";

// the setting as a ref, for the Settings switch: "on" or "off"
export const celebratePref = usePref("moneyCelebrate", "on");
const on = () => readPref("moneyPoints", "on") !== "off" && readPref("moneyCelebrate", "on") !== "off";

// the level to celebrate now: { level, n } (n moves on each time, so the same level reached again after an Undo shows again)
export const party = ref(null);
let n = 0;
data.hooks.changed = (before, after, lines) => {
  if (!on()) return;
  const level = levelReached(before, after, lines);
  if (!level) return;
  party.value = { level, n: ++n };
  toast(i18n.global.t("points.levelUp", { level }), { title: i18n.global.t("points.levelUpTitle") });
};
