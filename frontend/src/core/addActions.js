// Every kind of thing that can be added or updated by hand, in the order the "Add or update" window lists them.
// Each item: its icon (24x24 stroke drawing), its text key under "qa." (with "H" for the hint line) and what it opens.
// Read by the computer's + window (components/shell/QuickSheet.vue) and the phone's (phone/sheets/AddSheet.vue).
import { openForm } from "./forms.js";
import { syncNow } from "./sources.js";
import { go } from "../router.js";
import { openSettingsTab } from "../views/settings/tab.js";

export const ADD_ICONS = { plus: '<path d="M12 5v14M5 12h14"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>', folder: '<path d="M3 6h6l2 2h10v11H3z"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', jar: '<path d="M7 3h10v3H7zM6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', refresh: '<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>' };
const settings = (tab) => () => { openSettingsTab(tab); go("/settings"); };

// [icon, key, run]
export const ADD_ITEMS = [
  ["plus", "tx", () => openForm("tx")],
  ["bank", "acc", () => openForm("account")],
  ["camera", "photo", () => openForm("tx", { photo: true })],
  ["tag", "rule", () => openForm("rule")],
  ["folder", "cat", () => openForm("category")],
  ["doc", "bill", () => openForm("bill")],
  ["target", "bud", () => openForm("budget")],
  ["jar", "jar", () => openForm("jar", { start: { kind: "goal" } })],
  ["flag", "goal", () => openForm("jar", { start: { kind: "goal" } })],
  ["bank", "pen", () => openForm("pension")],
  ["upload", "csv", settings("data")],
  ["refresh", "sync", () => syncNow()],
];
