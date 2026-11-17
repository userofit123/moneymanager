// The desktop app's update state, as the page shows it (core/updates.js), and saving its choices. The page is served by the server, so it can
// meet a desktop app older or newer than itself: an older app has one switch only ("Update automatically", setAuto) and no choices in its state.

// What the desktop app sent (update:state) → the fields of UP. choices is null for an older app.
export function deskState(s) {
  const total = s.total || 0;
  return {
    cur: s.current, status: s.status, latest: s.version, notes: s.notes || "", err: s.error || "",
    // with the size unknown, the megabytes so far show instead of a share
    percent: s.status === "downloading" && s.percent < 0 ? -1 : s.percent || 0,
    mb: Math.round((s.done || 0) / 1e5) / 10,
    total,
    auto: s.auto !== false, manual: !!s.manual,
    choices: typeof s.autoCheck === "boolean" ? { autoCheck: s.autoCheck, autoDownload: !!s.autoDownload, wifiOnly: !!s.wifiOnly } : null,
  };
}

// Saves the choices: the three of them, or only "download by itself" for an older app.
export function saveDeskChoices(D, c) {
  if (!D) return Promise.resolve(null);
  if (typeof D.setChoices === "function") return D.setChoices({ autoCheck: !!c.autoCheck, autoDownload: !!c.autoDownload, wifiOnly: !!c.wifiOnly });
  return D.setAuto(!!c.autoDownload);
}
