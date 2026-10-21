// What the Categories and tags page remembers while you move around the app, like the current app's module variables:
// the open tab (catTab), what is typed in each search box (RQ) and the tags picked for a tag rule not added yet (NR_TAGS).
import { ref, reactive } from "vue";
import { go } from "../../router.js";

export const catTab = ref("cats");
export const searches = reactive({});
export const newRuleTags = ref([]);
// "Go to tag rules" (also from a transaction's tag chip in the current app)
export function goTagRules() { catTab.value = "tagrules"; go("/categories"); }
