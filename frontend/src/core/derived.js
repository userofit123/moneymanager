// Numbers several parts of the app need, worked out once from the shared data (so the menu badges, Home and the pages agree).
import { computed } from "vue";
import { data } from "../stores/data.js";
import { now } from "./clock.js";
import { homeModel } from "../lib/home.js";
import { jarsModel } from "../lib/jars.js";
import { readJson, prefTick } from "./prefs.js";
import { budgetsModel } from "../lib/budgets.js";
import { alertsModel } from "../lib/alerts.js";
import { reviewTransfers, duplicateIds, reviewGaps } from "../lib/activity.js";

export const S = computed(() => data.state.value);
export const home = computed(() => (S.value ? homeModel(S.value, now.value, data.fx.value.fx) : null));
export const budgets = computed(() => (S.value ? budgetsModel(S.value, now.value) : null));
// the open alerts (their texts are made where they are shown)
export const alertList = computed(() => (S.value && home.value?.any ? alertsModel(S.value, { ...home.value, budgets: budgets.value.info }, now.value) : []));
// how many things wait in Activity → Needs review (reviewCount in web/js/03-bills-home.js)
export const reviewCount = computed(() => (S.value ? reviewTransfers(S.value).length + duplicateIds(S.value).size + reviewGaps(S.value, home.value?.billsAll).filter((r) => r.diff != 0).length : 0));
// the Jars page's numbers; the "Full by" dates use the Forecast page's choices (moneyFc)
export const jars = computed(() => (S.value ? (prefTick.value, jarsModel(S.value, now.value, data.fx.value.fx, readJson("moneyFc", null) || {})) : null));
