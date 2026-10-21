// Syncs and connection tests that run on the server, one at a time.
// `job` is the one running now ({ source, kind: "sync" | "test" | "assist", since, items: { source: { state, added, msg } } }), or null.
// The bar at the top, the sync button and every Test/Sync button follow it.
import { ref, shallowRef } from "vue";
import { getJson } from "./http.js";
import { toast } from "./toast.js";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";

export const job = shallowRef(null);
export const lastItems = ref({}); // how each source did in the last run, shown in the Sources window until the next run
export const tick = ref(0); // moves every second while a job runs, for the running time
let tickT = null, itemsT = null, pollT = null;

export function startJob(source, kind, since) {
  job.value = { source, kind, since: since || Date.now(), items: {} };
  clearInterval(tickT); tickT = setInterval(() => tick.value++, 1000);
  clearInterval(itemsT); itemsT = setInterval(jobItems, 1500);
}
export function endJob() {
  if (job.value && Object.keys(job.value.items || {}).length) lastItems.value = job.value.items;
  job.value = null; clearInterval(tickT); clearInterval(itemsT);
}
async function jobItems() {
  try { const j = await getJson("/api/jobs"); if (j && job.value && j.items) job.value = { ...job.value, items: j.items }; } catch { /* next time */ }
}
// Runs fn as the one job; says "wait" if another is running. Returns fn's result, or null when it did not run.
export async function runJob(source, kind, fn) {
  if (job.value) { toast(i18n.global.t("sync.waitFirst"), { kind: "err" }); return null; }
  startJob(source, kind);
  try { return await fn(); } finally { endJob(); }
}
// At start: pick up a job that is already running (started by the schedule or another window) and follow it until it ends.
// onAssist(source) is called when it is a bank verification window waiting for the person.
export async function watchJobs(onAssist) {
  try {
    const j = await getJson("/api/jobs");
    if (j && j.kind == "assist") { startJob(j.source, "assist", j.since); onAssist?.(j.source); return; }
    if (j && !job.value) {
      startJob(j.source, j.kind, j.since);
      clearInterval(pollT);
      pollT = setInterval(async () => {
        try { const x = await getJson("/api/jobs"); if (!x) { clearInterval(pollT); endJob(); await data.load(); data.loadFx(); } } catch { /* next time */ }
      }, 2500);
    }
  } catch { /* no jobs */ }
}
export const mmss = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
