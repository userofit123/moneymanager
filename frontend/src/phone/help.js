// The guide to each screen and the key numbers, in the phone app: each opens in a sheet of its own (sheets/HelpSheet.vue,
// sheets/KeyNumbersSheet.vue). Kept apart from the computer's side panel, so opening one here never leaves the panel open there.
// helpOn("guide") opens the guide's list of screens; helpOn("guide", "bills") the guide to one screen; helpOn("nums") the key numbers.
import { ref } from "vue";
export const helpShown = ref(""); // "guide" | "nums" | "" (closed)
export const helpPage = ref(""); // the screen whose guide shows ("" the list of screens)
export function helpOn(mode, page = "") { helpPage.value = page; helpShown.value = mode; }
