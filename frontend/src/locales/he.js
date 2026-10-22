// All Hebrew texts in one module (put together in i18n.js). Loaded only when the language is Hebrew.
export { default as main } from "./he.json";
export const pages = import.meta.glob("./pages/*.he.json", { eager: true, import: "default" });
export const settings = import.meta.glob("./settings/*.he.json", { eager: true, import: "default" });
