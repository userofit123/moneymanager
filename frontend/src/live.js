// Live updates: the server sends a "rev" message the moment the data changes (/api/events).
// If the connection is not available, we ask for the version every minute instead.
export function connectLive(onChange, { EventSourceImpl = globalThis.EventSource, pollMs = 60000 } = {}) {
  let es = null, timer = null;
  if (EventSourceImpl) {
    es = new EventSourceImpl("/api/events");
    es.addEventListener("rev", () => onChange());
  }
  timer = setInterval(() => onChange(), pollMs);
  return () => { es?.close(); clearInterval(timer); };
}
