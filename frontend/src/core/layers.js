// Everything that opens on top of the page (pop-up windows, the confirm box, menus, drop-downs, the calendar, the document viewer,
// the appearance and help panels), newest last. Escape closes only the newest one, so pressing it again closes the next one,
// in the opposite order they were opened. One listener for the whole app, so two windows never close on the same key press.
import { watch, getCurrentInstance, onBeforeUnmount } from "vue";

const open = [];
export function layerOpen(close) { layerClose(close); open.push(close); }
export function layerClose(close) { const i = open.lastIndexOf(close); if (i >= 0) open.splice(i, 1); }
// isOpen: a getter or ref; close: what Escape does while it is open
export function escLayer(isOpen, close) {
  watch(isOpen, (o) => (o ? layerOpen(close) : layerClose(close)), { immediate: true });
  if (getCurrentInstance()) onBeforeUnmount(() => layerClose(close));
}

if (typeof window !== "undefined") {
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.isComposing || !open.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    open.pop()();
  }, true);
}
