// The current app's tooltips (web/js/08-jars.js tipFill, tipPlace, tipAt, tipCol, tipIcons): any element with data-tip="text" (or v-tip="text") has one.
// The text is the old format: first line the title, "label\tvalue" lines are rows, "---" is a line, "!text" is a warning, other lines are notes.
// A single line is a plain hint. Hovering shows it after a short pause, an (i) button (class "tinfo") shows it at once and keeps it until you tap elsewhere.

let tipEl = null, host = null, pinned = null, timer = null, hideT = null, wired = false;
const ensure = () => {
  if (tipEl) return tipEl;
  tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.id = "tip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl);
  return tipEl;
};
const NS = "http://www.w3.org/2000/svg";
function fill(text) {
  const t = ensure(), L = String(text).split("\n");
  t.textContent = ""; t.classList.toggle("rich", L.length > 1);
  if (L.length < 2) { t.textContent = text; return; }
  L.forEach((ln, i) => {
    const d = document.createElement("div");
    if (ln === "---") d.className = "tdv";
    else if (i > 0 && ln[0] === "!") {
      d.className = "ta";
      const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); const p = document.createElementNS(NS, "path"); p.setAttribute("d", "M12 3 2 20h20L12 3zM12 10v4M12 17.5v.01"); s.appendChild(p); d.appendChild(s);
      const m = document.createElement("span"); m.textContent = ln.slice(1); d.appendChild(m);
    } else if (i === 0) { d.className = "tt"; d.textContent = ln; }
    else if (ln.includes("\t")) { const [a, b] = ln.split("\t"); d.className = "tr"; const x = document.createElement("span"), y = document.createElement("b"); x.textContent = a; y.textContent = b; d.append(x, y); }
    else { d.className = "tn"; const k = ln.indexOf(":"); if (k > 1 && k < 30 && /^[^\s:][^:]{1,26}: /.test(ln) && /^\p{Lu}/u.test(ln)) { const b = document.createElement("b"); b.textContent = ln.slice(0, k + 1); d.append(b, ln.slice(k + 1)); } else d.textContent = ln; }
    t.appendChild(d);
  });
}
function place(el) {
  const t = tipEl, r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 10;
  if (y + h > innerHeight - 8) y = r.top - h - 10;
  x = Math.max(10, Math.min(x, innerWidth - w - 10)); y = Math.max(10, y);
  t.style.left = x + "px"; t.style.top = y + "px";
}
// Beside a waterfall column, like the current app.
function placeCol(el) {
  const t = tipEl, r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = r.right + 8; if (x + w > innerWidth - 8) x = r.left - w - 8; if (x < 8) x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
  const y = Math.max(8, Math.min(r.top + 34, innerHeight - h - 8));
  t.style.left = x + "px"; t.style.top = y + "px";
}
function placeAt(x, y) {
  const t = tipEl, w = t.offsetWidth, h = t.offsetHeight; let px = x - w / 2, py = y - h - 14; if (py < 8) py = y + 18;
  px = Math.max(8, Math.min(px, innerWidth - w - 8)); t.style.left = px + "px"; t.style.top = py + "px";
}
function show(el, e) {
  fill(el.dataset.tip); ensure().classList.add("on");
  if (el.matches(".wc")) placeCol(el); else if (e && el.closest("svg")) placeAt(e.clientX, e.clientY); else if (e && e.clientX != null && el.getBoundingClientRect().height > 150) placeAt(e.clientX, e.clientY); else place(el);
  host = el;
}
function off() {
  clearTimeout(timer); clearTimeout(hideT); timer = null; if (tipEl) tipEl.classList.remove("on"); host = null;
  if (pinned) { pinned.classList.remove("on"); pinned = null; }
}
function pin(i) {
  const h = i.closest("[data-tip]"); if (!h) return;
  off(); fill(h.dataset.tip); ensure().classList.add("on"); place(i); host = h; pinned = i; i.classList.add("on");
}
function wire() {
  if (wired || typeof document === "undefined") return; wired = true;
  const tipOf = (e) => e.target.closest && e.target.closest("[data-tip]");
  document.addEventListener("mouseover", (e) => {
    const t = tipOf(e); if (!t) { if (host) off(); return; } if (t === host) return;
    if (t.closest("svg")) { clearTimeout(timer); show(t, e); return; }
    off(); timer = setTimeout(() => show(t, e), 400);
  });
  document.addEventListener("mousemove", (e) => { if (host && host.closest("svg") && tipEl.classList.contains("on")) placeAt(e.clientX, e.clientY); });
  document.addEventListener("mouseout", (e) => { if (pinned) return; const t = tipOf(e); if (t && !t.contains(e.relatedTarget)) { const n = e.relatedTarget?.closest?.("[data-tip]"); if (!(n && n.closest("svg") && t.closest("svg"))) off(); } });
  // the budget pace line has no (i): a tap on it opens its tooltip
  document.addEventListener("click", (e) => { const u = e.target.closest && e.target.closest("u[data-tip]"); if (!u) return; off(); show(u, e); hideT = setTimeout(off, 4500); });
  document.addEventListener("mousedown", off); document.addEventListener("keydown", off);
  addEventListener("scroll", off, { passive: true, capture: true });
  document.addEventListener("touchstart", (e) => {
    if (pinned && !(e.target.closest && e.target.closest(".tinfo"))) off();
    const t = tipOf(e); if (!t) return; off(); timer = setTimeout(() => { show(t); hideT = setTimeout(off, 4500); }, 450);
  }, { passive: true });
  document.addEventListener("touchend", () => clearTimeout(timer), { passive: true });
  document.addEventListener("touchmove", () => clearTimeout(timer), { passive: true });
  document.addEventListener("click", (e) => { const i = e.target.closest && e.target.closest(".tinfo"); if (!i) return; e.preventDefault(); e.stopPropagation(); pin(i); }, true);
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("tinfo")) { e.preventDefault(); pin(e.target); } }, true);
}
const TI_NO = "button:not(.jst),a,input,select,textarea,option,td,tr,th,i,u,svg,.jpm,.mh,.dchip,.v";
// Every explanatory tooltip gets a small (i) next to its label (tipIcons in the old app).
function icon(el) {
  if (el.dataset.ti) return; el.dataset.ti = "1";
  if (el.closest("svg") || el.matches(TI_NO) || el.querySelector(":scope > .tinfo")) return;
  const host = el.querySelector(":scope > .lbl") || (el.firstElementChild && el.firstElementChild.matches("span,b,div") && el.children.length > 1 ? el.firstElementChild : null) || el;
  host.insertAdjacentHTML("beforeend", '<i class="tinfo" role="button" tabindex="0" aria-label="' + infoLabel.replace(/"/g, "") + '"></i>');
}
const set = (el, v) => { if (v) { el.dataset.tip = v; icon(el); } else delete el.dataset.tip; };
// v-tip="text" is the same as :data-tip="text".
export const vTip = { mounted(el, b) { set(el, b.value); }, updated(el, b) { set(el, b.value); }, unmounted(el) { if (host && el.contains(host)) off(); }, getSSRProps: (b) => (b.value ? { "data-tip": b.value } : {}) };
// Starts the tooltips for the whole page, and gives every new [data-tip] its (i).
export function startTooltips(label = "More info") {
  wire(); infoLabel = label;
  if (typeof MutationObserver === "undefined") return;
  let raf = 0;
  const scan = () => { raf = 0; document.querySelectorAll("[data-tip]:not([data-ti])").forEach(icon); };
  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(scan); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-tip"] });
  scan();
}
let infoLabel = "More info";
// Builds the old text format: title, rows [[label, value] | "---"], note.
export const TP = (title, rows, note) => [title, ...rows.map((r) => (r === "---" ? "---" : r[0] + "\t" + r[1])), ...(note ? ["---", note] : [])].join("\n");
