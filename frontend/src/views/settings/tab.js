// Which section of Settings is open. It lives here, outside the page, so other pages can open Settings on a given section
// (for example "Fix" on a bank connection) and so Settings opens where you left it.
// settingsAsked counts every openSettingsTab(), so the phone app also opens a section that was already the chosen one.
import { ref } from "vue";
export const settingsTab = ref("prof");
export const settingsAsked = ref(0);
export const openSettingsTab = (id) => { settingsTab.value = id; settingsAsked.value++; };
