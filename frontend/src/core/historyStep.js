// Makes the open tab (or the open account) a step in the browser's history, so Back (browser or phone) goes to the previous one,
// whatever it was, and Forward comes back. source: the ref that holds it. url(value): the address to show for it (optional).
// set(value): how to open it when Back or Forward lands on it (default: put the value in source).
import { onMounted, onBeforeUnmount, watch } from "vue";

export function useHistoryStep(key, source, { url, set } = {}) {
  const put = (v) => (set ? set(v) : (source.value = v));
  const here = () => location.pathname + location.search;
  // the entry we start on remembers the value (or, coming back to the page, gives it back)
  onMounted(() => {
    const st = history.state || {};
    if (key in st) { if (st[key] !== source.value) put(st[key]); } else history.replaceState({ ...st, [key]: source.value }, "", here());
  });
  // a change made on the page adds a step; one made by Back or Forward already has its step
  watch(source, (v) => {
    const st = history.state || {};
    if (st.o || st[key] === v) return;
    history.pushState({ ...st, [key]: v }, "", url ? url(v) : here());
  });
  const onPop = () => { const st = history.state; if (st && !st.o && key in st && st[key] !== source.value) put(st[key]); };
  onMounted(() => addEventListener("popstate", onPop));
  onBeforeUnmount(() => removeEventListener("popstate", onPop));
}
