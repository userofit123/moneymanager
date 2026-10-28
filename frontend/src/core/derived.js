// Numbers several parts of the app need, worked out once from the shared data (so the menu badges, Home and the pages agree).
import { computed } from "vue";
import { data } from "../stores/data.js";
import { now } from "./clock.js";
import { homeModel } from "../lib/home.js";
import { jarsModel } from "../lib/jars.js";
import { readJson, prefTick } from "./prefs.js";
import { budgetsModel } from "../lib/budgets.js";
import { alertsModel } from "../lib/alerts.js";
import { fcChoices, forecastModel } from "../lib/forecast.js";
import { keyNumbers } from "../lib/keyNumbers.js";
import { reviewTransfers, duplicateIds, reviewGaps } from "../lib/activity.js";

export const S = computed(() => data.state.value);
export const home = computed(() => (S.value ? homeModel(S.value, now.value, data.fx.value.fx) : null));
// the Forecast page's choices (saved in this browser as "moneyFc"): the Jars and the forecast alert use the same months
export const fcSaved = computed(() => (prefTick.value, fcChoices(readJson("moneyFc", null))));
export const budgets = computed(() => (S.value ? budgetsModel(S.value, now.value) : null));
// the open alerts (their texts are made where they are shown)
export const alertList = computed(() => (S.value && home.value ? alertsModel(S.value, { ...home.value, budgets: budgets.value.info }, now.value, fcSaved.value) : []));
// how many things wait in Activity → Needs review
export const reviewCount = computed(() => (S.value ? reviewTransfers(S.value).length + duplicateIds(S.value).size + reviewGaps(S.value, home.value?.billsAll).filter((r) => r.diff != 0).length : 0));
// the Jars page's numbers; the "Full by" dates use the Forecast page's choices (moneyFc)
export const jars = computed(() => (S.value ? (prefTick.value, jarsModel(S.value, now.value, data.fx.value.fx, fcSaved.value)) : null));
// the app's key numbers (lib/keyNumbers.js), with the Forecast page's choices: the same amounts and names on every page
export const forecast = computed(() => (S.value?.tx?.length && home.value ? forecastModel(S.value, now.value, data.fx.value.fx, fcSaved.value, home.value) : null));
export const keyNums = computed(() => (forecast.value ? keyNumbers(home.value, forecast.value) : null));
