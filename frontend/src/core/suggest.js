// Suggestions: things the app noticed and can do (a rule for a category, a tag, a card payment). Each one shows as a toast for a while
// and stays in the list behind the light-bulb button until it is done or cleared (addSugg/suggUI/suggOpen in web/js/09-profile-export-settings.js).
// Kept in this browser as "moneySugg", like the current app. An action is { label, kind, arg }; core/suggestActions.js runs it.
import { ref } from "vue";
import { readJson, writeJson } from "./prefs.js";
import { toast } from "./toast.js";
import { i18n } from "../i18n.js";

export const suggestions = ref(readJson("moneySugg", []) || []);
export const suggestOpen = ref(false);
export const bulbPop = ref(0); // bumps when a new one arrives, so the button can pop
const save = () => writeJson("moneySugg", suggestions.value);
let runner = () => {};
export const setSuggestionRunner = (fn) => { runner = fn; };
export const runSuggestion = (x, a) => { dropSuggestion(x.key); runner(a); };
export function dropSuggestion(key) { suggestions.value = suggestions.value.filter((y) => y.key !== key); save(); }
export function clearSuggestions() { suggestions.value = []; save(); suggestOpen.value = false; }
export function addSuggestion(x) {
  suggestions.value = [{ ...x, t: Date.now() }, ...suggestions.value.filter((y) => y.key !== x.key)].slice(0, 30);
  save(); bulbPop.value++;
  toast(x.text, { title: x.title, kind: "sugg", ms: 16000, actions: [...x.actions.map((a) => ({ label: a.label, run: () => runSuggestion(x, a) })), { label: i18n.global.t("txw.notNow"), run: () => {} }] });
}
