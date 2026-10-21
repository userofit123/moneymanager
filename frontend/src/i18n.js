import { computed, watch } from "vue";
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import he from "./locales/he.json";
import { applyLang, isHebrew } from "./direction.js";

export { applyLang };

// Same storage key as the old page, so the language choice is shared between the old and new app.
const KEY = "moneyLang";
const saved = (() => { try { return localStorage.getItem(KEY) === "he" ? "he" : "en"; } catch { return "en"; } })();

// The Settings texts are kept one file per section (locales/settings/<section>.en.json and .he.json) and filed under "settings.<section>".
const sections = (files) => Object.fromEntries(Object.entries(files).map(([p, m]) => [p.split("/").pop().replace(/\.(en|he)\.json$/, ""), m.default ?? m]));
const settingsEn = sections(import.meta.glob("./locales/settings/*.en.json", { eager: true }));
const settingsHe = sections(import.meta.glob("./locales/settings/*.he.json", { eager: true }));

export const i18n = createI18n({ legacy: false, locale: saved, fallbackLocale: "en", messages: { en: { ...en, settings: settingsEn }, he: { ...he, settings: settingsHe } } });

// True while the language is Hebrew. Use it for the rare things CSS cannot flip by itself; prefer logical CSS (margin-inline-start and so on).
export const isRtl = computed(() => isHebrew(i18n.global.locale.value));

// Whatever changes the language, the page language and direction follow right away.
watch(i18n.global.locale, (lang) => applyLang(lang), { immediate: true });

export function setLang(lang) {
  i18n.global.locale.value = lang === "he" ? "he" : "en";
  try { localStorage.setItem(KEY, i18n.global.locale.value); } catch { /* private mode: the choice just isn't remembered */ }
}
