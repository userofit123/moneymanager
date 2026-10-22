// Shared by the Settings → Automatic sorting sections (category, tag, name, card and salary rules).
// The data changes and their history lines come from lib/categories.js.
import { ref } from "vue";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";

// Every change goes through the data store; true when something changed.
export const save = (edit) => data.change(edit).length > 0;
export const err = (m) => toast(m, { kind: "err" });
export const ok = (m, o = {}) => toast(m, { kind: "ok", ...o });
// The tags picked for a tag rule not added yet, kept while you move around the app.
export const newRuleTags = ref([]);
