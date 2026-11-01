// "Are you sure?" before a change: a small box with Cancel and "Yes, do it".
// ask(title, text, run, { danger, yes }) shows it; components/AskPop.vue draws it.
import { shallowRef } from "vue";
export const asking = shallowRef(null); // { title, text, danger, yes, run } (yes: the confirm button's own label, such as "Delete jar")
export const ask = (title, text, run, o = {}) => { asking.value = { title, text, run, danger: !!o.danger, yes: o.yes || "" }; };
export const askClose = () => { asking.value = null; };
export const askYes = () => { const a = asking.value; asking.value = null; a?.run(); };
