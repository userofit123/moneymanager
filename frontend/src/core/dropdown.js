// Every drop-down opens the app's own animated menu instead of the browser's (.ddm).
// The <select> underneath keeps its value and fires input and change as usual, so v-model works unchanged.
// A select with data-native keeps the browser's own list; data-ddanchor on a parent sets what the menu lines up with.
import { layerOpen, layerClose } from "./layers.js";
let M = null, cur = null, idx = -1, started = false;
const CK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
const SEL = "select:not([multiple]):not([data-native])";
const esc = (s) => String(s).replace(/[&<]/g, (c) => (c == "&" ? "&amp;" : "&lt;"));
const close = () => { if (!M) return; layerClose(close); const m = M; M = null; if (cur) cur.classList.remove("ddo"); cur = null; m.classList.remove("in"); setTimeout(() => m.remove(), 170); };
const items = () => (M ? [...M.querySelectorAll(".ddo2:not(.dis)")] : []);
function pick(o) {
  if (!cur || !o) return;
  const sel = cur, v = o.dataset.v; close();
  if (sel.value !== v || sel.dataset.always) { sel.value = v; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
  try { sel.focus({ preventScroll: true }); } catch { /* gone */ }
}
const hi = (i) => { const L = items(); if (!L.length) return; idx = (i + L.length) % L.length; L.forEach((x, k) => x.classList.toggle("hi", k == idx)); L[idx].scrollIntoView({ block: "nearest" }); };
function open(sel) {
  if (M && cur === sel) { close(); return; }
  close(); if (sel.disabled) return;
  cur = sel; sel.classList.add("ddo");
  const m = document.createElement("div"); m.className = "ddm"; m.setAttribute("role", "listbox");
  const add = (o) => `<div class="ddo2 ${o.value === sel.value && !o.disabled ? "sel" : ""} ${o.disabled ? "dis" : ""}" role="option" data-v="${String(o.value).replace(/"/g, "&quot;")}"><span>${esc(o.textContent || "") || "&nbsp;"}</span>${CK}</div>`;
  m.innerHTML = [...sel.children].map((c) => (c.tagName == "OPTGROUP" ? `<div class="ddg">${(c.label || "").replace(/[&<]/g, "")}</div>` + [...c.children].map(add).join("") : add(c))).join("");
  document.body.appendChild(m); M = m; layerOpen(close);
  const an = sel.closest("[data-ddanchor]") || sel, r = an.getBoundingClientRect(), w = Math.max(r.width, an !== sel ? 200 : 170), vw = innerWidth, vh = innerHeight;
  m.style.minWidth = Math.min(w, vw - 16) + "px"; m.style.width = "max-content"; m.style.maxWidth = vw - 16 + "px";
  const full = m.scrollHeight, below = vh - r.bottom - 12, above = r.top - 12, up = below < Math.min(full, 220) && above > below, h = Math.min(full + 2, Math.max(120, up ? above : below), 340);
  m.style.maxHeight = h + "px";
  const mw = m.offsetWidth;
  let left = r.width < mw ? r.left + r.width / 2 - mw / 2 : document.documentElement.classList.contains("he") ? r.right - mw : r.left;
  left = Math.max(8, Math.min(left, vw - mw - 8)); m.style.left = left + "px";
  m.style[up ? "bottom" : "top"] = (up ? vh - r.top + 6 : r.bottom + 6) + "px";
  if (up) m.classList.add("up");
  requestAnimationFrame(() => m.classList.add("in"));
  const s = m.querySelector(".sel"); if (s) s.scrollIntoView({ block: "center" });
  idx = items().indexOf(s); if (idx >= 0) s.classList.add("hi");
}
export function startDropdowns() {
  if (started || typeof document === "undefined") return; started = true;
  const selOf = (e) => e.target.closest && e.target.closest(SEL);
  document.addEventListener("pointerdown", (e) => { if (selOf(e)) e.preventDefault(); }, true);
  document.addEventListener("mousedown", (e) => { const s = selOf(e); if (s) { e.preventDefault(); s.focus({ preventScroll: true }); } }, true);
  document.addEventListener("click", (e) => {
    const s = selOf(e); if (s) { e.preventDefault(); e.stopPropagation(); open(s); return; }
    const o = e.target.closest && e.target.closest(".ddo2");
    if (o && M && M.contains(o)) { if (!o.classList.contains("dis")) pick(o); return; }
    if (M && !(e.target.closest && e.target.closest(".ddm"))) close();
  }, true);
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (M) {
      if (e.key == "ArrowDown") { e.preventDefault(); hi(idx + 1); } else if (e.key == "ArrowUp") { e.preventDefault(); hi(idx - 1); } else if (e.key == "Enter" || e.key == " ") { e.preventDefault(); pick(items()[idx]); } else if (e.key == "Tab") close();
      return;
    }
    if (t && t.matches && t.matches(SEL) && (e.key == "Enter" || e.key == " " || (e.altKey && e.key == "ArrowDown"))) { e.preventDefault(); open(t); }
  }, true);
  addEventListener("resize", close);
  addEventListener("scroll", (e) => { if (M && !(e.target.closest && e.target.closest(".ddm"))) close(); }, { passive: true, capture: true });
}
