// This app's own update, as every screen shows it (the menu's button, the phone's More row, the update notice):
// the desktop app's update (UP) in the Windows and Linux app, the phone app's own (APP) in the Android app,
// and the server's (UP) in a browser tab.
// where: "desk" | "phone" | "web". status: idle | checking | uptodate | available | downloading | ready | installing | error.
// percent is -1 while the size is unknown (mb then shows the megabytes so far). err: the phone app's error text key, or "".
export function ownUpdateView({ desk, phone, up, app, behind, phoneVersion = "" }) {
  if (desk) return { where: "desk", status: up.status, version: up.latest || "", cur: up.cur || "", percent: up.percent, mb: up.mb || 0, err: "" };
  if (!phone) return { where: "web", status: up.status, version: up.latest || "", cur: up.cur || "", percent: up.percent, mb: up.mb || 0, err: "" };
  const s = app.status;
  // a failed download of a newer version is offered again, with what went wrong
  const status = ["checking", "downloading", "ready"].includes(s) ? s : behind ? "available" : s === "error" ? "error" : "idle";
  const version = s === "downloading" ? app.version || up.latest || "" : s === "ready" ? app.staged || "" : up.latest || "";
  return { where: "phone", status, version, cur: phoneVersion, percent: app.percent, mb: app.mb || 0, err: app.err || "" };
}

// The update notice shows while a new version can be downloaded, is downloading, or is ready, in the desktop and phone apps only,
// unless it was closed for this version.
export const noticeShown = (u, closedFor) => u.where !== "web" && ["available", "downloading", "ready"].includes(u.status) && !!u.version && closedFor !== u.version;
