import { watch, shallowRef } from "vue";
import { createI18n } from "vue-i18n";
import * as EN from "./locales/en.js";
import { applyLang } from "./direction.js";
import { readPref, writePref } from "./core/prefs.js";
import { isolateNumbers } from "./core/polish.js";

export { applyLang };

// The language choice is kept under "moneyLang".
const KEY = "moneyLang";
const saved = readPref(KEY) === "he" ? "he" : "en";

// Each language's texts: locales/<lang>.json, plus pages and parts that keep their texts in their own files
// (locales/pages/<name>.<lang>.json, filed under "<name>") and the Settings sections (locales/settings/<section>.<lang>.json, under "settings.<section>").
const sections = (files) => Object.fromEntries(Object.entries(files).map(([p, m]) => [p.split("/").pop().replace(/\.(en|he)\.json$/, ""), m]));
const pack = (m) => ({ ...m.main, ...sections(m.pages), settings: sections(m.settings) });

// In Hebrew, amounts and numbers inside a sentence keep their order (wrapped in ⁦…⁩),
// and "you" forms follow the gender in the profile once the Hebrew rules are loaded (core/heGender.js, set by core/heText.js).
// (a ref, so the page redraws when the rules arrive or the gender changes: setHebrewFilter is called again then)
const hebrewFilter = shallowRef((s) => s);
export const setHebrewFilter = (fn) => { hebrewFilter.value = (s) => fn(s); };
const postTranslation = (str) => (i18n?.global?.locale?.value === "he" && typeof str === "string" ? isolateNumbers(hebrewFilter.value(str)) : str);
export const i18n = createI18n({ legacy: false, locale: saved, fallbackLocale: "en", postTranslation, messages: { en: pack(EN), he: {} } });

// Whatever changes the language, the page language and direction follow right away.
watch(i18n.global.locale, (lang) => applyLang(lang), { immediate: true });

// English is always here (it is also the fallback); Hebrew is loaded the first time it is needed (locales/he.js, a file of its own).
const loaded = { en: true };
export async function loadLang(lang) {
  if (loaded[lang]) return;
  i18n.global.setLocaleMessage(lang, pack(await import("./locales/he.js")));
  loaded[lang] = true;
}
// The app starts once the saved language's texts are here (main.js); if they cannot be loaded, it starts in English.
export const i18nReady = loadLang(saved).catch(() => { i18n.global.locale.value = "en"; });

// The language switches once its texts are here; the last choice wins when two follow quickly.
let wanted = saved;
export async function setLang(lang) {
  const l = (wanted = lang === "he" ? "he" : "en");
  await loadLang(l);
  if (wanted !== l) return;
  i18n.global.locale.value = l;
  writePref(KEY, l);
}
