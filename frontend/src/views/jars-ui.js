// Small page helpers that behave like the current app's: hover tips on any element (the old data-tip) and the floating ⋯ / history menu (cmenu in web/js/07-periods-rules.js).
// Markup and classes (.tip, .cmenu) are the old app's and styled in styles/legacy.css.
let tipEl = null;
const hideTip = () => { if (tipEl) { tipEl.remove(); tipEl = null; } };
function showTip(el) {
  hideTip();
  const text = el.__tip; if (!text) return;
  const b = (tipEl = document.createElement("div")); b.className = "tip"; b.setAttribute("role", "tooltip"); b.textContent = text; document.body.appendChild(b);
  const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, up = r.top > h + 14;
  b.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  b.style.top = (up ? r.top - h - 8 : r.bottom + 8) + "px";
  requestAnimationFrame(() => b.classList.add("on"));
}
// v-tip="text": shows the text on hover or keyboard focus, and on tap on a phone.
export const vTip = {
  mounted(el, { value }) {
    el.__tip = value; if (value) el.setAttribute("data-tip", value);
    el.addEventListener("mouseenter", () => showTip(el)); el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focusin", () => showTip(el)); el.addEventListener("focusout", hideTip);
    el.addEventListener("click", () => (tipEl ? hideTip() : showTip(el)));
  },
  updated(el, { value }) { el.__tip = value; if (value) el.setAttribute("data-tip", value); else el.removeAttribute("data-tip"); },
  unmounted: hideTip,
};

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
