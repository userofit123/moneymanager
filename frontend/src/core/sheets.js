// The open pop-up windows (BaseSheet), newest last. On a phone the Back button closes the newest one instead of leaving the page,
// like the current app (it adds a history entry while a window is open, web/js/09-profile-export-settings.js).
// Also remembers the last tap, so a window grows out of the button that opened it (lastTap in web/js/03-bills-home.js).
const stack = [];
let pushed = false;
export let lastTap = null;
if (typeof window !== "undefined") {
  addEventListener("pointerdown", (e) => { lastTap = e.target.closest?.("button,a,[role=button],.row,tr") ? { x: e.clientX, y: e.clientY, t: Date.now() } : null; }, true);
  addEventListener("popstate", () => {
    if (!pushed) return;
    pushed = false;
    const top = stack[stack.length - 1];
    if (top) top();
    if (stack.length > 1) { history.pushState({ o: 1 }, "", location.href); pushed = true; }
  });
}
export function sheetOpened(close) {
  stack.push(close);
  if (!pushed && typeof history !== "undefined") { history.pushState({ o: 1 }, "", location.href); pushed = location.href; }
}
export function sheetClosed(close) {
  const i = stack.lastIndexOf(close);
  if (i >= 0) stack.splice(i, 1);
  // going back removes the entry the window added, unless a button in it opened another page (then that page stays)
  if (!stack.length && pushed) { const same = pushed === true || pushed === location.href; pushed = false; if (same) history.back(); }
}
export const sheetsOpen = () => stack.length;
