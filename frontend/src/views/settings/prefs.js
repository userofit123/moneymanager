// The "Language and region" and "App icon" choices of Settings. They are kept in this browser (and on the server, see core/prefs.js).
import { dateFormat, weekStart } from "../../core/prefs.js";
import { theme } from "../../core/theme.js";
export { SYM_SVG, COIN_SVG, ICONS, iconSvg } from "../../core/symbols.js";

export const DATE_FORMATS = [["dmy", "dd/mm/yyyy"], ["mdy", "mm/dd/yyyy"]];

export const saveDateFormat = (v) => (dateFormat.value = v === "mdy" ? "mdy" : "dmy");
export const saveWeekStart = (v) => (weekStart.value = v === "mon" ? "mon" : "sun");
// The app icon is part of the look (core/theme.js), so the logo, the loading screen and the saved look follow it.
export const readIcon = () => theme.sym || "₪";
export const saveIcon = (v) => (theme.sym = v);
