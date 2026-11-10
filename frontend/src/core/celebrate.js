// A small party when the person reaches a new level: confetti from the top of the screen and a burst from the level badge
// (components/LevelParty.vue draws it), with a short message. Whatever moved the level up: something the person did, the
// daily visit, last month's results, a sync, another device, or points that came in while the app was closed (shown when it
// opens). This device remembers the last level it saw ("moneyLevelSeen", kept only here) and celebrates a higher one; a
// lower one (after an Undo) is remembered too, so reaching that level again celebrates again. Never with points off or with
// the setting off (Settings → Preferences, "moneyCelebrate": "off").
import { computed, ref, watch } from "vue";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { readPref, usePref, writePref } from "./prefs.js";
import { toast } from "./toast.js";
import { levelOf, newLevel } from "../lib/points.js";

// the setting as a ref, for the Settings switch: "on" or "off"
export const celebratePref = usePref("moneyCelebrate", "on");
const on = () => readPref("moneyPoints", "on") !== "off" && readPref("moneyCelebrate", "on") !== "off";

// the level to celebrate now: { level, n } (n moves on each time, so the same level reached again after an Undo shows again)
export const party = ref(null);
let n = 0;
// the level from the data, or null until the data has loaded (so loading never counts as a level going down or up)
const level = computed(() => (data.state.value ? levelOf(data.state.value) : null));
watch(level, (lv) => {
  if (lv == null) return;
  const was = readPref("moneyLevelSeen");
  const up = newLevel(was == null || was === "" || isNaN(+was) ? null : +was, lv);
  writePref("moneyLevelSeen", String(lv));
  if (!up || !on()) return;
  party.value = { level: up, n: ++n };
  toast(i18n.global.t("points.levelUp", { level: up }), { title: i18n.global.t("points.levelUpTitle") });
}, { immediate: true });
