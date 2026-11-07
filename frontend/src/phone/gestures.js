// Touch gestures of the phone app, with pointer and touch events (passive where the page may still scroll).
import { awayFromEdges } from "../lib/tabSwipe.js";
// pullToRefresh: pull the page down from its top; past `need` px a release runs onRun. onMove(dist, ready) moves the page.
// The page follows the finger with a rubber band: 1:1 at first, slower the further it goes, never past `max`.
// Crossing the line gives a short buzz (where the phone has one).
export function pullToRefresh(el, { onMove, onRun, need = 88, max = 200 }) {
  let y0 = null, d = 0, on = false, was = false;
  const band = (dy) => max * (1 - 1 / (1 + dy * 0.9 / max));
  const start = (e) => { if (scrollY > 0 || e.touches.length > 1 || document.documentElement.classList.contains("sl")) return; y0 = e.touches[0].clientY; d = 0; on = false; was = false; };
  const move = (e) => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy <= 0 || scrollY > 0) { if (on) onMove(0, false); y0 = dy <= 0 ? y0 : null; on = false; return; }
    on = true; d = band(dy);
    const ready = d >= need;
    if (ready && !was) navigator.vibrate?.(8);
    was = ready;
    onMove(d, ready);
    if (e.cancelable) e.preventDefault();
  };
  const end = () => { if (y0 == null) return; y0 = null; const go = on && d >= need; on = false; d = 0; onMove(0, false); if (go) onRun(); };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);
  return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
}

// dragDown: a bottom sheet follows the finger down from its handle (or from its top when its content is scrolled to the top);
// a pull past 30% of its height, or a quick flick, closes it.
export function dragDown(sheet, { onClose, body = sheet }) {
  let y0 = null, t0 = 0, dy = 0, ok = false;
  const start = (e) => { y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; ok = !!e.target.closest(".ph-grab") || body.scrollTop <= 0; sheet.style.transition = "none"; };
  const move = (e) => {
    if (y0 == null || !ok) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { sheet.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); }
    else { sheet.style.transform = ""; if (!e.target.closest(".ph-grab")) ok = false; }
  };
  const end = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0), shut = ok && dy > 0 && (dy > sheet.offsetHeight * 0.3 || v > 0.6);
    y0 = null; sheet.style.transition = ""; sheet.style.transform = "";
    if (shut) onClose();
  };
  sheet.addEventListener("touchstart", start, { passive: true });
  sheet.addEventListener("touchmove", move, { passive: false });
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
  return () => { sheet.removeEventListener("touchstart", start); sheet.removeEventListener("touchmove", move); sheet.removeEventListener("touchend", end); sheet.removeEventListener("touchcancel", end); };
}

// edgeBack: in the installed iPhone app (no browser Back gesture there), a drag from the start edge (the first 20px) pulls the
// screen towards the end side; let go past 35% of the width, or with a quick flick, and onBack runs. can() says whether
// there is a screen to go back to. sign() is +1 in English, -1 in Hebrew (the start edge is on the right in Hebrew).
export function edgeBack(el, { can, onBack, sign }) {
  let x0 = null, y0 = 0, t0 = 0, dx = 0, on = false;
  const W = () => innerWidth;
  const start = (e) => {
    const x = e.touches[0].clientX, fromEdge = sign() > 0 ? x : W() - x;
    if (e.touches.length > 1 || fromEdge > 20 || !can() || document.documentElement.classList.contains("sl")) return;
    x0 = x; y0 = e.touches[0].clientY; t0 = performance.now(); dx = 0; on = false;
  };
  const move = (e) => {
    if (x0 == null) return;
    const mx = (e.touches[0].clientX - x0) * sign(), my = e.touches[0].clientY - y0;
    if (!on && Math.abs(my) > Math.abs(mx)) { x0 = null; return; }
    on = true; dx = Math.max(0, mx);
    el.style.transition = "none"; el.style.transform = `translateX(${dx * sign()}px)`;
    if (e.cancelable) e.preventDefault();
  };
  const end = () => {
    if (x0 == null) return;
    const v = dx / Math.max(1, performance.now() - t0), go = on && (dx > W() * 0.35 || v > 0.5);
    x0 = null; el.style.transition = ""; el.style.transform = "";
    if (go) onBack();
  };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);
  return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
}

// tabSwipe: a quick sideways swipe on a tab's first screen goes to the next or previous tab (lib/tabSwipe.js decides which).
// It never starts while a window is open (html.sl), with two fingers, near the screen's sides (the phone's own Back gesture),
// on a field, slider, chart or swipeable row, or inside anything that scrolls sideways (sliding cards, chips, tables).
const NO_SWIPE = "input, textarea, select, [contenteditable], [role=slider], svg[role=img], .ph-home-fxc, .ph-swipe, .ph-tabs, [data-noswipe]";
function scrollsSideways(el, stop) {
  for (; el && el !== stop && el.nodeType === 1; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}
export function tabSwipe(el, { can, onSwipe }) {
  let x0 = null, y0 = 0, t0 = 0;
  const start = (e) => {
    x0 = null;
    const t = e.touches[0];
    if (e.touches.length > 1 || !can() || document.documentElement.classList.contains("sl") || !awayFromEdges(t.clientX, innerWidth)) return;
    if (e.target.closest?.(NO_SWIPE) || scrollsSideways(e.target, el)) return;
    x0 = t.clientX; y0 = t.clientY; t0 = performance.now();
  };
  const end = (e) => {
    if (x0 == null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    onSwipe({ dx, dy, ms: performance.now() - t0 });
  };
  const cancel = () => { x0 = null; };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", end, { passive: true });
  el.addEventListener("touchcancel", cancel);
  return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", cancel); };
}
