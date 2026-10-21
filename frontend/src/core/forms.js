// The add and edit windows that several places open (the + button, the pages, Home): one at a time, shown by components/FormHost.vue.
// openForm("bill") or openForm("budget", { k: "Groceries" }). Kinds: tx, bill, budget, jar, rule, category, pension, account.
import { shallowRef } from "vue";
export const form = shallowRef(null); // { kind, props, at }
export const openForm = (kind, props = {}) => { form.value = { kind, props, at: Date.now() }; };
export const closeForm = () => { form.value = null; };
