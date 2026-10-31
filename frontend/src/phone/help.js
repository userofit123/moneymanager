// "About this page" and "Key numbers" on the phone: the computer's help panel is drawn only once it is asked for here,
// so a panel left open on the computer does not cover the phone's screen.
import { ref } from "vue";
import { helpSet } from "../help/help.js";
export const helpUsed = ref(false);
export function helpOn(mode) { helpUsed.value = true; helpSet(true, mode); }
