// One shared copy of the user's data for the whole app. Screens read from it and never fetch on their own,
// so every screen shows the same numbers and all of them update together when something changes.
import { ref, shallowRef } from "vue";
import { connectLive } from "../live.js";
import { sampleOn, sampleState } from "./sample.js";

const getJson = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
};

export function createDataStore({ fetchJson = getJson, connect = connectLive } = {}) {
  const state = shallowRef(null); // what GET /api/state returns (accounts, tx, jars, budgets...)
  const loading = ref(false);
  const error = ref(null);
  let stop = null, busy = null;

  // Loads the data. Asking again while a load is running joins that load instead of starting another.
  function load() {
    if (busy) return busy;
    loading.value = true;
    busy = fetchJson("/api/state")
      .then((s) => { state.value = s; error.value = null; })
      .catch((e) => { error.value = e; })
      .finally(() => { loading.value = false; busy = null; });
    return busy;
  }
  // Only loads again when the server's version changed.
  async function refreshIfChanged() {
    try {
      const { rev } = await fetchJson("/api/rev");
      if (!state.value || rev !== state.value.rev) await load();
    } catch (e) { error.value = e; }
  }
  // Loads once, then keeps the data fresh. Safe to call more than once.
  async function start() {
    if (stop) return;
    stop = connect(refreshIfChanged);
    await load();
  }
  function end() { stop?.(); stop = null; }

  return { state, loading, error, load, start, end };
}

// ?sample=1 on the test site shows made-up data instead (see sample.js).
export const data = sampleOn()
  ? createDataStore({ fetchJson: async (url) => (url === "/api/rev" ? { rev: "sample" } : sampleState()), connect: () => () => {} })
  : createDataStore();
