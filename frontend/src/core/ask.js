// "Are you sure?" before a change: the current app's small box with Cancel and "Yes, do it" (askOpen in web/js/04-transactions.js).
// ask(title, text, run, { danger }) shows it; components/AskPop.vue draws it.
import { shallowRef } from "vue";
export const asking = shallowRef(null); // { title, text, danger, run }
export const ask = (title, text, run, o = {}) => { asking.value = { title, text, run, danger: !!o.danger }; };
export const askClose = () => { asking.value = null; };
export const askYes = () => { const a = asking.value; asking.value = null; a?.run(); };
