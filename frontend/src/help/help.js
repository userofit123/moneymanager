// The page guide and the small ? next to section names.
// The guide text is in en.js / he.js, the little pictures in demo.js, the ? places in dots.js.
// The ? places are here from the start; the guide and its pictures are big, so they are loaded when the panel first opens
// (or soon after the app starts, see HelpPanel.vue).
import { ref, shallowReactive } from "vue";
import { readPref, writePref } from "../core/prefs.js";
import DOTS from "./dots.js";
import { vTip } from "../core/tooltip.js";
import { pages } from "../routes.js";
import { SI } from "../views/settings/icons.js";
import { ICONS } from "../phone/icons.js";

// The guide's page key (its key in en.js / he.js) for each page of the app.
export const HELP_PAGE = { home: "dash", activity: "tx", accounts: "acc", jars: "jars", bills: "bills", budgets: "budg", reports: "rep", forecast: "fc", alerts: "alerts", categories: "cats" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const hMd = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

// The loaded parts of the guide: en (always, also used when a Hebrew page has no guide), he, and demo (the little pictures).
const G = shallowReactive({ en: null, he: null, demo: null });
const LOAD = { en: () => import("./en.js"), he: () => import("./he.js"), demo: () => import("./demo.js") };
const asked = {};
export const guideReady = (he) => !!(G.en && G.demo && (!he || G.he));
export function loadGuide(he) {
  return Promise.all(["en", "demo", ...(he ? ["he"] : [])].map((k) => (asked[k] ||= LOAD[k]().then((m) => { G[k] = m.default || m.HDEMO; }, (e) => { delete asked[k]; throw e; }))));
}

// The panel is remembered open or closed, and what it showed: "1" the page guide, "nums" the key numbers, "0" closed.
const saved = readPref("moneyHelp");
export const helpOpen = ref(saved === "1" || saved === "nums");
// What the side panel shows: the page guide ("guide") or the key numbers ("nums", the button above the help button).
export const helpMode = ref(saved === "nums" ? "nums" : "guide");
// left open: the page has room for it from the first paint, so nothing slides at start
if (helpOpen.value && typeof document != "undefined") document.documentElement.classList.add("help-on");
// Opening the guide waits for it to be loaded, so the panel slides in with its text.
export async function helpSet(on, mode = "guide") {
  const he = document.documentElement.classList.contains("he"); // the page language (direction.js)
  if (on && mode === "guide" && !guideReady(he)) await loadGuide(he);
  if (on) helpMode.value = mode;
  helpOpen.value = on;
  document.documentElement.classList.toggle("help-on", on);
  writePref("moneyHelp", !on ? "0" : helpMode.value === "nums" ? "nums" : "1");
}

// What the panel shows for a page: the same sentences, in the language of the page. Null when there is no guide for it.
// A panel button: opens the panel on its content, or closes it when it already shows that content.
export const panelToggle = (mode) => helpSet(!(helpOpen.value && helpMode.value === mode), mode);

export function guideOf(page, he) {
  const key = HELP_PAGE[page] || page, EN = G.en || {}, H = (he && G.he) || EN;
  return H[key] || EN[key] || null;
}
// The little pictures are drawn in English; in Hebrew each text and box value goes through tx() (core/heSaved.js).
const heDemo = (h, tx) => h.replace(/>([^<]*[A-Za-z][^<]*)</g, (m, t) => ">" + t.replace(/\S(.*\S)?/s, (x) => x.split(" · ").map(tx).join(" · ")) + "<").replace(/(value|placeholder)="([^"]*[A-Za-z][^"]*)"/g, (m, k, v) => k + '="' + tx(v) + '"');
// Each section's icon, picked by what the section is about (from its English heading, so Hebrew gets the same one).
// The shapes are the app's own: the side-menu icons, the Settings section icons and the phone icons.
const NAVI = (n) => pages.find((p) => p.name === n)?.icon || "";
const XI = {
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  checks: '<path d="M4 7l2 2 3.5-3.5M4 16l2 2 3.5-3.5M13 8h7M13 17h7"/>',
};
const PICK = [
  [/what .*(is|are) for|what this (page|tab)|first-time/, XI.compass],
  [/counted|left out|status|badges|mean|needs review/, XI.checks],
  [/alert|ntfy|telegram|webhook|this device/, SI.bell],
  [/pension|exchange|currenc/, SI.cur],
  [/jar|free to use|untouched|goal/, NAVI("jars")],
  [/budget|left to spend/, NAVI("budgets")],
  [/bill|repeat|row of days/, XI.cal],
  [/forecast|ahead|drives|where it starts|based on/, NAVI("forecast")],
  [/chart|report|trend|merchant|vs|by category|big numbers|numbers on top|three numbers|balance cards|totals/, NAVI("reports")],
  [/\bai\b/, SI.sparkle],
  [/rule/, SI.rules],
  [/categor|tag|display names/, SI.tag],
  [/card/, SI.card],
  [/account|connection|login|balance|money coming in|money flow/, SI.bank],
  [/sync|how often|further back|how far/, SI.sync],
  [/import|export|backup/, SI.backup],
  [/password|recovery|sign-in|devices|habits|privacy|app lock/, SI.lock],
  [/saved looks/, ICONS.look],
  [/search|filter|focus/, ICONS.search],
  [/offline/, ICONS.offline],
  [/undo|a line|more lines|recorded|history|past|dismissed/, SI.log],
  [/version|update|install|what's new/, SI.install],
  [/receipt|photo/, SI.file],
  [/mode|colour|backdrop|surface|corners|density|font|icon and language|choice|options|change what|which alerts|amount under/, SI.sliders],
  [/add|new|\+ button|transaction|tabs|reading|opening|each row|one /, SI.eye],
];
const iconFor = (h) => { const t = String(h || "").toLowerCase(); return (PICK.find(([r]) => r.test(t)) || [0, ICONS.info])[1]; };
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const n2 = (i) => String(i + 1).padStart(2, "0");
// a paragraph that starts with a bold name ("**Money in** is …") reads as a name and what it means
const termOf = (t) => /^\*\*[^*]{1,48}\*\*/.test(t);
// The panel's inside: the opening card, the list of sections (when there are more than three), then each section with its
// coloured ribbon on the line down the side. Sections take the five ribbon colours in turn (.hc1 … .hc5, help.css).
// Labels are the Example / Tip words of the language.
export function guideHtml(P, he, tr) { // tr: tx() from core/heText.js, for the little pictures
  const B = P.blocks || [], EN = G.en || {}, H = (he && G.he) || EN;
  const key = Object.keys(H).find((k) => H[k] === P), enB = (key && EN[key] && EN[key].blocks) || B;
  const hc = (i) => "hc" + ((i % 5) + 1);
  return (P.lead ? `<div class="hlead">${hMd(P.lead)}</div>` : "")
    + (B.length > 3 ? `<div class="htoc">${B.map((b, i) => `<button type="button" class="${hc(i)}" data-a="helpJump" data-i="${i}"><span class="htn">${n2(i)}</span><span>${esc(b.h)}</span></button>`).join("")}</div>` : "")
    + `<div class="hrail">${B.map((b, i) => `<section class="hs hg ${hc(i)}" id="hs${i}"><h4><span class="hrib" aria-hidden="true">${svg(iconFor((enB[i] || b).h))}</span><span class="hnum">${n2(i)}.</span> ${esc(b.h)}</h4>`
      + (b.p || []).map((t) => `<p${termOf(t) ? ' class="hterm"' : ""}>${hMd(t)}</p>`).join("")
      + (b.demo && G.demo?.[b.demo] ? `<div class="hdemo" aria-hidden="true">${he && tr ? heDemo(G.demo[b.demo](), tr) : G.demo[b.demo]()}</div>` : "")
      + (b.ex ? `<div class="hex"><b class="hlab">${svg(SI.eye)}${he ? "דוגמה" : "Example"}</b>${hMd(b.ex)}</div>` : "")
      + (b.tip ? `<div class="htip"><b class="hlab">${svg(ICONS.idea)}${he ? "טיפ" : "Tip"}</b>${hMd(b.tip)}</div>` : "")
      + "</section>").join("")}</div>`;
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
    // inside [data-hq="end"] (the rule lists) the count stays next to the name and the ? goes after it
    const end = el.closest('[data-hq="end"]');
    const at = [...el.children].find((c) => c.matches(end ? "a,.h2r,.chip,button,.hl,.seg,.flex" : "a,.h2r,.chip,button,.hl,.cnt,.seg,.flex") && !c.classList.contains("bi") && !c.classList.contains("tinfo"));
    // the (i) of a tooltip stays last: the ? goes before it
    const ti = at || [...el.children].find((c) => c.classList.contains("tinfo"));
    ti ? el.insertBefore(b, ti) : el.appendChild(b);
  });
}
// Open the panel (if it is closed) and bring the section the ? belongs to into view.
export function helpAt(k, block) {
  const go = () => {
    const EN = G.en || {}, i = EN[k] ? (EN[k].blocks || []).findIndex((x) => x.h === block) : -1; if (i < 0) return;
    const e = document.getElementById("hs" + i); if (!e) return;
    e.scrollIntoView({ behavior: "smooth", block: "start" }); e.classList.remove("hflash"); void e.offsetWidth; e.classList.add("hflash");
  };
  if (!helpOpen.value || helpMode.value !== "guide") helpSet(true).then(() => setTimeout(go, 120)); else go();
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
