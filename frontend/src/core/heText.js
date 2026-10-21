// English text that comes from saved data or the server (the change history, messages from a sync) is shown in Hebrew
// the way the current app does it: through its Hebrew dictionary and rules (he-legacy.js, made from web/he-*.js).
// The dictionary is big, so it is loaded only when the language is Hebrew.
import { shallowRef, watch } from "vue";
import { i18n, setHebrewFilter } from "../i18n.js";
import { data } from "../stores/data.js";

const HE = shallowRef(null);
let asked = false;
function loadHe() {
  if (asked) return;
  asked = true;
  import("./he-legacy.js").then((m) => { m.default.on = true; m.setProfileState(data.state.value); HE.value = m; setHebrewFilter((x) => m.default.gen(x)); });
}
watch(i18n.global.locale, (l) => { if (l === "he") loadHe(); }, { immediate: true });
// Some Hebrew wording follows the gender saved in the profile ("you" as a man, a woman, or everyone).
watch(() => data.state.value?.cfg?.profile?.gender, () => { const m = HE.value; if (!m) return; m.setProfileState(data.state.value); setHebrewFilter((x) => m.default.gen(x)); });
watch(data.state, (s) => HE.value?.setProfileState(s));

// tx("Edited category") → "עריכת קטגוריה" in Hebrew, unchanged in English (or until the dictionary has loaded).
export const tx = (s) => (i18n.global.locale.value === "he" && HE.value ? HE.value.default.T(s) : s);
