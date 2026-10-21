// The small finishing touches the current app puts on every text of the page (web/js/09-profile-export-settings.js pass/trPass/caps/titleCase):
// - " · " between parts is drawn as a lighter dot with room around it (<span class="dt">·</span>);
// - the first letter of a badge, chip or label is a capital, and card labels are in Title Case (English letters only);
// - in Hebrew, amounts stay left to right inside a sentence (⁦₪1,250⁩).
// Vue owns the text it draws, so this only changes text in ways Vue can live with: a text node's own value, or the children of an element
// whose only child is text (Vue sets such an element's whole text again when it changes, and this runs again).
const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE)$/;
const CAPS = ".bd,.chip:not(.t):not(.dchip),.lbl,.pl,.badge-l";
const isHe = () => document.documentElement.classList.contains("he");
const MONEY = /[−+-]?\s?[₪$€£¥]\s?\d[\d,]*(?:\.\d+)?%?/g;

function dots(el) {
  const n = el.firstChild;
  if (!n || n !== el.lastChild || n.nodeType !== 3 || !n.nodeValue.includes(" · ") || SKIP.test(el.tagName) || el.closest("svg,[contenteditable]")) return;
  // the parts go in one <span>, like the current app, so a box that lays out its children in a row keeps the line together
  const w = document.createElement("span");
  n.nodeValue.split(" · ").forEach((t, i) => { if (i) { const d = document.createElement("span"); d.className = "dt"; d.textContent = "·"; w.appendChild(d); } if (t) w.appendChild(document.createTextNode(t)); });
  el.replaceChildren(w);
}
function caps(el) {
  let n = el.firstChild; while (n && (n.nodeType == 8 || (n.nodeType == 3 && !n.nodeValue.trim()))) n = n.nextSibling; // past Vue's empty placeholders (<!--v-if-->)
  if (n && n.nodeType == 3) { const v = n.nodeValue, m = v.match(/^(\s*)([a-z])/); if (m) n.nodeValue = m[1] + m[2].toUpperCase() + v.slice(m[0].length); }
}
function titleCase(el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode, v = n.nodeValue; if (!/[a-z]/.test(v)) continue; const r = v.replace(/(^|[\s(/·\-–])([a-z])/g, (m, a, b) => a + b.toUpperCase()); if (r !== v) n.nodeValue = r; }
}
// amounts on their own (no words around them) keep their order in Hebrew
function money(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/[₪$€£¥]/.test(n.nodeValue) && !/[A-Za-z⁦]/.test(n.nodeValue) && n.parentElement && !SKIP.test(n.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const L = []; while (w.nextNode()) L.push(w.currentNode);
  L.forEach((n) => { const r = n.nodeValue.replace(MONEY, "⁦$&⁩"); if (r !== n.nodeValue) n.nodeValue = r; });
}
function pass(root = document.body) {
  if (!root || root.nodeType !== 1) return;
  [root, ...root.querySelectorAll("*")].forEach((el) => { if (el.childNodes.length === 1) dots(el); });
  // like the current app, also in Hebrew (they only touch English letters, such as an account named in English)
  root.querySelectorAll(CAPS).forEach(caps); if (root.matches?.(CAPS)) caps(root); root.querySelectorAll(".lbl").forEach(titleCase);
  if (isHe()) money(root);
}
let started = false;
export function startPolish() {
  if (started || typeof MutationObserver === "undefined") return; started = true;
  let q = 0, busy = false;
  const run = () => { q = 0; busy = true; try { pass(); } finally { busy = false; } };
  new MutationObserver(() => { if (!busy && !q) q = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  run();
}
// For Hebrew sentences made from translations: amounts and numbers in them stay left to right (vue-i18n postTranslation, see i18n.js).
export const isolateNumbers = (s) => String(s).replace(/[−+]?₪?\d[\d,]*(?:\.\d+)?%?/g, "⁦$&⁩");
