// Which section of Settings is open. It lives here, outside the page, so other pages can open Settings on a given section
// (for example "Fix" on a bank connection) and so Settings opens where you left it, like the current app (setTab).
import { ref } from "vue";
export const settingsTab = ref("prof");
export const openSettingsTab = (id) => { settingsTab.value = id; };
