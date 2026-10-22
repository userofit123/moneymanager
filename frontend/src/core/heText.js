// English text that comes from saved data or the server (the change history, messages from a sync, built-in names) is shown in Hebrew
// through the tables and rules in heSaved.js, and every Hebrew text follows the gender in the profile (heGender.js).
// Both are loaded only when the language is Hebrew.
import { shallowRef, watch } from "vue";
import { i18n, setHebrewFilter } from "../i18n.js";
import { data } from "../stores/data.js";

const HE = shallowRef(null); // { heSaved, genderize } once loaded
const gender = () => data.state.value?.cfg?.profile?.gender;
let asked = false;
function loadHe() {
  if (asked || typeof window === "undefined") return; // not while pages are drawn in Node (tests)
  asked = true;
  Promise.all([import("./heSaved.js"), import("./heGender.js")]).then(([s, g]) => { HE.value = { ...s, ...g }; filter(); });
}
// The "you" forms of every Hebrew text follow the gender in the profile; set again when it changes, so the page redraws.
const filter = () => { const m = HE.value; if (m) setHebrewFilter((x) => m.genderize(x, gender())); };
watch(i18n.global.locale, (l) => { if (l === "he") loadHe(); }, { immediate: true });
watch(gender, filter);

// gen("בחרו") → "בחרי" for a woman, "בחר" for a man; as it is when no gender is set or the Hebrew rules are not loaded yet.
export const gen = (s) => (HE.value ? HE.value.genderize(s, gender()) : s);
// tx("Edited category") → "עריכת קטגוריה" in Hebrew, unchanged in English (or until the Hebrew has loaded).
export const tx = (s) => (i18n.global.locale.value === "he" && HE.value ? HE.value.genderize(HE.value.heSaved(s), gender()) : s);
