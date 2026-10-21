// The entry window (one transaction) and its smaller windows, opened from anywhere: Activity, Home, Alerts, Bills, Jars...
// components/tx/TxWindow.vue and components/tx/TxPops.vue draw them.
import { ref, shallowRef } from "vue";
export const txOpenId = ref(null);
export const openTx = (id) => { txPop.value = null; txOpenId.value = id; };
export const closeTx = () => { txOpenId.value = null; };
// The smaller windows: { kind: "month" | "nameRule" | "hist" | "bill" | "jar" | "ruleOffer" | "tagRule" | "jarEmpty", ... }.
// They replace the entry window, like the current app's one sheet.
export const txPop = shallowRef(null);
export const openPop = (kind, o = {}) => { txOpenId.value = null; txPop.value = { kind, ...o, at: Date.now() }; };
export const closePop = () => { txPop.value = null; };
