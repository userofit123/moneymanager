// Right to left helpers for the phone's gestures and motion: in Hebrew the start side is the right.
export const isRtl = () => typeof document !== "undefined" && document.documentElement.classList.contains("he");
// "left" or "right": the side a screen's Back edge and a row's leading content sit on
export const startSide = () => (isRtl() ? "right" : "left");
// +1 in English, -1 in Hebrew: multiply an x distance by it to turn "towards the end" into screen pixels
export const sign = () => (isRtl() ? -1 : 1);
