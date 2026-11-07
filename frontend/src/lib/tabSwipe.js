// Swiping sideways between the phone's tabs: which tab a finished swipe goes to, if any.
// A swipe counts when it is long enough, mostly sideways (a thumb drifts a little) and quick; a slow drag or a scroll does not.
// Swiping towards the start side shows the next tab, as if the tab bar slid along. In Hebrew the tab bar is mirrored,
// so the direction is too. There is no wrapping: at the first or last tab nothing happens.
export const SWIPE = { min: 60, slant: 1.3, ms: 900, edge: 24 };

// dx, dy: how far the finger moved (screen pixels, right and down are positive); ms: how long it took;
// tabs: the tab names in order; at: the open tab; rtl: Hebrew. Returns the tab to open, or null.
export function swipeTarget({ dx, dy, ms, tabs, at, rtl = false }) {
  if (Math.abs(dx) < SWIPE.min || Math.abs(dx) < Math.abs(dy) * SWIPE.slant || ms > SWIPE.ms) return null;
  const i = tabs.indexOf(at);
  if (i < 0) return null;
  const step = (dx < 0 ? 1 : -1) * (rtl ? -1 : 1);
  return tabs[i + step] ?? null;
}

// A swipe may start only away from the screen's sides: those belong to the phone's own Back gesture.
export const awayFromEdges = (x, width) => x > SWIPE.edge && x < width - SWIPE.edge;
