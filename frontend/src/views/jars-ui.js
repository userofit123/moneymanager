// The floating ⋯ / history menu (cmenu in web/js/07-periods-rules.js). (Tooltips are core/tooltip.js.)
// Markup and classes (.tip, .cmenu) are the old app's and styled in styles/legacy.css.
export { vTip } from "../core/tooltip.js";

// Puts a menu (.cmenu) under its button, or above it when there is no room, and keeps it on the screen.
export function placeMenu(m, btn) {
  const an = btn.closest("[data-menuanchor]"), r = (an || btn).getBoundingClientRect(), h = m.offsetHeight, w = m.offsetWidth;
  const up = r.bottom + 6 + h > innerHeight - 8 && r.top - 6 - h > 8;
  m.style.top = (up ? r.top - 6 - h : r.bottom + 6) + "px";
  const rtl = document.documentElement.classList.contains("he");
  const x = Math.max(8, Math.min(rtl ? r.left : innerWidth - r.right, innerWidth - w - 8));
  m.style.left = m.style.right = ""; m.style[rtl ? "left" : "right"] = x + "px";
  m.style.maxHeight = Math.max(120, Math.min(up ? r.top - 14 : innerHeight - r.bottom - 14, 360)) + "px";
}
