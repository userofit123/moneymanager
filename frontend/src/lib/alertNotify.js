// Which urgent alerts should become a phone notification now: only the ones this device has not been told about yet.
// list: the open alerts; told: the ids already notified on this device. Gives back the alerts to notify (at most max)
// and the ids to remember: the told ids that are still open, plus the ones just notified, so an alert that goes away
// and comes back later is announced again.
export function pickToNotify(list, told = [], max = 2) {
  const open = new Set(list.map((x) => String(x.id))), was = new Set(told.map(String));
  const fresh = list.filter((x) => x.sev == "high" && !was.has(String(x.id))).slice(0, max);
  const keep = [...was].filter((id) => open.has(id)).concat(fresh.map((x) => String(x.id)));
  return { fresh, keep };
}
