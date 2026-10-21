// Hover tips that are laid out like the current app's (web/js/08-jars.js tipFill): a tip written on several lines has a title on
// the first line, "label<TAB>value" lines as rows, "---" as a divider, and any other line as a note.
// v-rich="text" shows it on hover or keyboard focus, and on tap on a phone. The box is the old .tip, styled in styles/legacy.css.
let tipEl = null;
const hideTip = () => { if (tipEl) { tipEl.remove(); tipEl = null; } };

export function fillTip(box, text) {
  const L = String(text).split("\n");
  box.textContent = "";
  box.classList.toggle("rich", L.length > 1);
  if (L.length < 2) { box.textContent = text; return; }
  L.forEach((ln, i) => {
    const d = document.createElement("div");
    if (ln === "---") d.className = "tdv";
    else if (i === 0) { d.className = "tt"; d.textContent = ln; }
    else if (ln.includes("\t")) { const [a, b] = ln.split("\t"), x = document.createElement("span"), y = document.createElement("b"); d.className = "tr"; x.textContent = a; y.textContent = b; d.append(x, y); }
    else { d.className = "tn"; d.textContent = ln; }
    box.appendChild(d);
  });
}
function showTip(el) {
  hideTip();
  const text = el.__tip; if (!text) return;
  const b = (tipEl = document.createElement("div")); b.className = "tip"; b.setAttribute("role", "tooltip"); document.body.appendChild(b);
  fillTip(b, text);
  const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
  let y = r.bottom + 10; if (y + h > innerHeight - 8) y = r.top - h - 10;
  b.style.left = Math.max(10, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 10)) + "px";
  b.style.top = Math.max(10, y) + "px";
  requestAnimationFrame(() => b.classList.add("on"));
}
export const vRich = {
  mounted(el, { value }) {
    el.__tip = value; if (value) el.setAttribute("data-tip", value);
    el.addEventListener("mouseenter", () => showTip(el)); el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focusin", () => showTip(el)); el.addEventListener("focusout", hideTip);
    el.addEventListener("click", () => (tipEl ? hideTip() : showTip(el)));
  },
  updated(el, { value }) { el.__tip = value; if (value) el.setAttribute("data-tip", value); else el.removeAttribute("data-tip"); },
  unmounted: hideTip,
  // When the page is drawn on the server (tests), the tip text is written as the old data-tip attribute.
  getSSRProps: ({ value }) => (value ? { "data-tip": value } : {}),
};
