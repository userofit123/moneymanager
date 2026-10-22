// All English texts in one module (put together in i18n.js). English is always loaded: it is also the fallback language.
export { default as main } from "./en.json";
export const pages = import.meta.glob("./pages/*.en.json", { eager: true, import: "default" });
export const settings = import.meta.glob("./settings/*.en.json", { eager: true, import: "default" });
