// Right to left helpers for the phone's gestures and motion: in Hebrew the start side is the right.
export const isRtl = () => typeof document !== "undefined" && document.documentElement.classList.contains("he");
// +1 in English, -1 in Hebrew: multiply an x distance by it to turn "towards the end" into screen pixels
export const sign = () => (isRtl() ? -1 : 1);
