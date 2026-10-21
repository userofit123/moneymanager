// The page guide and the small ? next to section names.
// The guide text is in en.js / he.js, the little pictures in demo.js, the ? places in dots.js.
import { ref } from "vue";
import { readPref, writePref } from "../core/prefs.js";
import EN from "./en.js";
import HE from "./he.js";
import DOTS from "./dots.js";
import { HDEMO } from "./demo.js";
import { vTip } from "../core/tooltip.js";

// The guide's page key (its key in en.js / he.js) for each page of the app.
export const HELP_PAGE = { home: "dash", activity: "tx", accounts: "acc", jars: "jars", bills: "bills", budgets: "budg", reports: "rep", forecast: "fc", alerts: "alerts", categories: "cats" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const hMd = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

export const helpOpen = ref(false);
helpOpen.value = readPref("moneyHelp") === "1";
export function helpSet(on) {
  helpOpen.value = on;
  document.documentElement.classList.toggle("help-on", on);
  writePref("moneyHelp", on ? "1" : "0");
}

// What the panel shows for a page: the same sentences, in the language of the page. Null when there is no guide for it.
export function guideOf(page, he) {
  const key = HELP_PAGE[page] || page, H = he ? HE : EN;
  return H[key] || EN[key] || null;
}
// The little pictures are drawn in English; in Hebrew each text and box value goes through the Hebrew dictionary.
const heDemo = (h, tx) => h.replace(/>([^<]*[A-Za-z][^<]*)</g, (m, t) => ">" + t.replace(/\S(.*\S)?/s, (x) => x.split(" · ").map(tx).join(" · ")) + "<").replace(/(value|placeholder)="([^"]*[A-Za-z][^"]*)"/g, (m, k, v) => k + '="' + tx(v) + '"');
// The panel's inside (labels are the Example / Tip words of the language).
export function guideHtml(P, he, tr) { // tr: the Hebrew dictionary (core/heText.js tx), for the little pictures
  const B = P.blocks || [];
  return (P.lead ? `<div class="hlead">${hMd(P.lead)}</div>` : "")
    + (B.length > 3 ? `<div class="hjump">${B.map((b, i) => `<button data-a="helpJump" data-i="${i}">${esc(b.h)}</button>`).join("")}</div>` : "")
    + B.map((b, i) => `<section class="hs" id="hs${i}"><h4>${esc(b.h)}</h4>${(b.p || []).map((t) => `<p>${hMd(t)}</p>`).join("")}${b.demo && HDEMO[b.demo] ? `<div class="hdemo" aria-hidden="true">${he && tr ? heDemo(HDEMO[b.demo](), tr) : HDEMO[b.demo]()}</div>` : ""}${b.ex ? `<div class="hex"><b>${he ? "דוגמה" : "Example"}</b>${hMd(b.ex)}</div>` : ""}${b.tip ? `<div class="htip"><b>${he ? "טיפ" : "Tip"}</b>${hMd(b.tip)}</div>` : ""}</section>`).join("");
}

// ---- the ? next to each section's name: it opens the panel at that section ----
const HQ = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.8M12 17v.01"/></svg>';
export function helpDots(page, he, label, doc = document) {
  const key = HELP_PAGE[page] || page, norm = (t) => String(t).replace(/\s+/g, " ").trim().toLowerCase();
  DOTS.forEach(([k, root, sel, txt, block, how, txtHe]) => {
    if (k !== key) return;
    const r = doc.querySelector(root); if (!r || !r.offsetParent) return;
    const cand = how === "after" ? [r] : [...r.querySelectorAll(sel)], tx = norm(txt), th = he && txtHe ? norm(txtHe) : "";
    const el = cand.find((e) => { if (how === "after") return true; const t = norm(e.textContent); return t.startsWith(tx) || (th && t.startsWith(th)); });
    const inside = how === "after" && el && el.parentElement && el.parentElement.classList.contains("view"); // inside the block when it sits straight in the page, so the ? never takes a row of its own
    if (!el || (how === "after" && !inside ? el.nextElementSibling && el.nextElementSibling.classList.contains("hq") : el.querySelector(".hq"))) return;
    const b = doc.createElement("button"); b.type = "button"; b.className = "hq"; b.dataset.a = "helpAt"; b.dataset.k = k; b.dataset.b = block; b.setAttribute("aria-label", label); b.innerHTML = HQ;
    vTip.mounted(b, { value: label });
    b.addEventListener("click", (e) => { e.preventDefault(); helpAt(k, block, he); });
    if (how === "after") { inside ? el.appendChild(b) : el.insertAdjacentElement("afterend", b); return; }
    if (el.tagName === "H2") { const t = el.firstChild; if (t && (t.nodeType === 3 || t.nodeType === 1)) { const w = doc.createElement("span"); w.className = "hqw"; t.replaceWith(w); w.append(t, b); return; } }
    const at = [...el.children].find((c) => c.matches("a,.h2r,.chip,button,.hl,.cnt,.seg,.flex") && !c.classList.contains("bi") && !c.classList.contains("tinfo"));
    // the (i) of a tooltip stays last: the ? goes before it
    const ti = at || [...el.children].find((c) => c.classList.contains("tinfo"));
    ti ? el.insertBefore(b, ti) : el.appendChild(b);
  });
}
// Open the panel (if it is closed) and bring the section the ? belongs to into view.
export function helpAt(k, block) {
  const go = () => {
    const i = EN[k] ? (EN[k].blocks || []).findIndex((x) => x.h === block) : -1; if (i < 0) return;
    const e = document.getElementById("hs" + i); if (!e) return;
    e.scrollIntoView({ behavior: "smooth", block: "start" }); e.classList.remove("hflash"); void e.offsetWidth; e.classList.add("hflash");
  };
  if (!helpOpen.value) { helpSet(true); setTimeout(go, 120); } else go();
}
// Keep the ?s in place while the page changes.
export function watchDots(get) {
  let q = 0;
  const run = () => { q = 0; try { const { page, he, label } = get(); helpDots(page, he, label); } catch { /* a page without sections */ } };
  const mo = new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); });
  mo.observe(document.body, { childList: true, subtree: true });
  run();
  return () => mo.disconnect();
}
