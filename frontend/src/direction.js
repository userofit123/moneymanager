// The ONE place that sets the page language and direction:
// the <html> element stays left to right (so scrollbars stay on the right) and gets class "he";
// styles/base.css then makes the page content right to left with "html.he body { direction: rtl }".
export const isHebrew = (lang) => lang === "he";
export function applyLang(lang, root = document.documentElement) {
  root.lang = isHebrew(lang) ? "he" : "en";
  root.classList.toggle("he", isHebrew(lang));
}
