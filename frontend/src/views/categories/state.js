// What the Categories and tags page remembers while you move around the app:
// the open tab (catTab), what is typed in each search box (searches) and the tags picked for a tag rule not added yet (newRuleTags).
import { ref, reactive } from "vue";

export const catTab = ref("cats");
export const searches = reactive({});
export const newRuleTags = ref([]);
