// The "Language and region" and "App icon" choices of Settings, from the current app (web/js/01-prefs-theme.js and the
// lang, datef, weekf and opt actions in web/js/08-jars.js). They are kept in this browser under the same names as the current app,
// so a choice made in one app shows in the other.
import { dateFormat, weekStart } from "../../core/prefs.js";
import { theme } from "../../core/theme.js";
export { SYM_SVG, COIN_SVG, ICONS, iconSvg } from "../../core/symbols.js";

export const DATE_FORMATS = [["dmy", "dd/mm/yyyy"], ["mdy", "mm/dd/yyyy"]];
export const WEEK_STARTS = ["sun", "mon"];

export const readDateFormat = () => dateFormat.value;
export const readWeekStart = () => weekStart.value;
export const saveDateFormat = (v) => (dateFormat.value = v === "mdy" ? "mdy" : "dmy");
export const saveWeekStart = (v) => (weekStart.value = v === "mon" ? "mon" : "sun");
// The app icon is part of the look (core/theme.js), so the logo, the loading screen and the saved look follow it.
export const readIcon = () => theme.sym || "₪";
export const saveIcon = (v) => (theme.sym = v);
