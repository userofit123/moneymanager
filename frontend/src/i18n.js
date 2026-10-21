import { watch, shallowRef } from "vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import he from "./locales/he.json";
import { applyLang } from "./direction.js";
import { readPref, writePref } from "./core/prefs.js";
import { isolateNumbers } from "./core/polish.js";

export { applyLang };

// The language choice is kept under "moneyLang".
const KEY = "moneyLang";
const saved = readPref(KEY) === "he" ? "he" : "en";

// The Settings texts are kept one file per section (locales/settings/<section>.en.json and .he.json) and filed under "settings.<section>".
const sections = (files) => Object.fromEntries(Object.entries(files).map(([p, m]) => [p.split("/").pop().replace(/\.(en|he)\.json$/, ""), m.default ?? m]));
const settingsEn = sections(import.meta.glob("./locales/settings/*.en.json", { eager: true }));
const settingsHe = sections(import.meta.glob("./locales/settings/*.he.json", { eager: true }));

// Pages and parts that keep their texts in their own files: locales/pages/<name>.en.json and .he.json, filed under "<name>".
const pagesEn = sections(import.meta.glob("./locales/pages/*.en.json", { eager: true }));
const pagesHe = sections(import.meta.glob("./locales/pages/*.he.json", { eager: true }));

// In Hebrew, amounts and numbers inside a sentence keep their order (wrapped in ⁦…⁩),
// and "you" forms follow the gender in the profile once the Hebrew rules are loaded (HE.gen, set by core/heText.js).
// (a ref, so the page redraws when the rules arrive or the gender changes: setHebrewFilter is called again then)
const hebrewFilter = shallowRef((s) => s);
export const setHebrewFilter = (fn) => { hebrewFilter.value = (s) => fn(s); };
const postTranslation = (str) => (i18n?.global?.locale?.value === "he" && typeof str === "string" ? isolateNumbers(hebrewFilter.value(str)) : str);
export const i18n = createI18n({ legacy: false, locale: saved, fallbackLocale: "en", postTranslation, messages: { en: { ...en, ...pagesEn, settings: settingsEn }, he: { ...he, ...pagesHe, settings: settingsHe } } });

// Whatever changes the language, the page language and direction follow right away.
watch(i18n.global.locale, (lang) => applyLang(lang), { immediate: true });

export function setLang(lang) {
  i18n.global.locale.value = lang === "he" ? "he" : "en";
  writePref(KEY, i18n.global.locale.value);
}
