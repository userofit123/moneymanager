// The attachments viewer: which entry's files are shown, and which one is open.
import { ref } from "vue";
export const docView = ref(null); // { id, i } (i: the file shown, or null for the list only)
export const openDocs = (id, i = null) => { docView.value = { id, i: i == null || i === "" || isNaN(+i) ? null : +i }; };
export const closeDocs = () => { docView.value = null; };
