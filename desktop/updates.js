// New versions of the app: the person's three choices (Settings → Version and updates) and when the app checks and downloads by itself.
// No Electron here, so the rules can be tested. Installing is never automatic: only the person's Install installs.

const MIN = 60 * 1000;
const CHECK_EVERY = 6 * 60 * MIN; // a check at start, then every 6 hours
const ON_FRONT_EVERY = 60 * MIN; // the window back in front: a check that is older than this is done again
const RETRY_GAP = 15 * MIN; // after a failed check or download, nothing is tried again before this much time has passed
const TICK = 15 * MIN; // how often to look whether a check is due, or a waiting download can start (back on Wi-Fi)

// The choices as saved in desktop-settings.json. Before there were three, one switch "Update automatically" (autoUpdate) downloaded by itself:
// turned off, it now means "Download automatically" off.
function readChoices(saved) {
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    autoCheck: s.autoCheck !== false,
    autoDownload: typeof s.autoDownload === "boolean" ? s.autoDownload : s.autoUpdate !== false,
    wifiOnly: s.wifiOnly !== false,
  };
}
// A change from the page: only the three known switches, only true or false.
function mergeChoices(cur, ask) {
  const out = { ...cur };
  for (const k of ["autoCheck", "autoDownload", "wifiOnly"]) if (ask && typeof ask[k] === "boolean") out[k] = ask[k];
  return out;
}

// Whether an automatic check is due now. A failed one is tried again after RETRY_GAP; otherwise after `every`.
function checkDue({ now, choices, status, lastCheck = 0, lastFail = 0, every = CHECK_EVERY }) {
  if (!choices.autoCheck || ["checking", "downloading", "ready", "installing", "dev"].includes(status)) return false;
  if (now - lastFail < RETRY_GAP) return false;
  return status === "error" || now - lastCheck >= every;
}
// Whether a found version may start downloading by itself. `metered` is true on mobile data or a connection set as metered.
function downloadDue({ now, choices, status, metered = false, lastFail = 0 }) {
  if (status !== "available" || !choices.autoDownload) return false;
  if (choices.wifiOnly && metered) return false;
  return now - lastFail >= RETRY_GAP;
}

// The bar on the taskbar icon: a share from 0 to 1. With the size unknown, a value above 1 is a moving bar, but only on Windows: Linux would
// draw it full, as if done, so there it stays off (-1) until the size is known.
function taskbarValue(p, platform) {
  if (p && p.total > 0) return Math.min(1, Math.max(0, (p.percent || 0) / 100));
  return platform === "win32" ? 2 : -1;
}

// How the system is asked whether the connection is metered. Windows knows it as the network's cost (a connection set as metered, or mobile
// data); Linux through NetworkManager's own Metered (set or guessed, for example a phone's hotspot). Elsewhere it can't be asked: null.
// `known` says whether the answer means anything, so the page hides "Only on Wi-Fi" where it could never do anything.
function meteredQuery(platform) {
  if (platform === "win32") return {
    cmd: "powershell.exe",
    args: ["-NoProfile", "-NonInteractive", "-Command",
      "[void][Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]; " +
      "$p = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile(); if ($p) { $p.GetConnectionCost().NetworkCostType }"],
    known: /Unrestricted|Fixed|Variable/, metered: /Fixed|Variable/,
  };
  // NMMetered: 1 yes, 3 guessed yes (0 unknown, 2 no, 4 guessed no)
  if (platform === "linux") return {
    cmd: "gdbus",
    args: ["call", "--system", "--dest", "org.freedesktop.NetworkManager", "--object-path", "/org/freedesktop/NetworkManager",
      "--method", "org.freedesktop.DBus.Properties.Get", "org.freedesktop.NetworkManager", "Metered"],
    known: /uint32 [1-4]\b/, metered: /uint32 [13]\b/,
  };
  return null;
}
function meteredAnswer(q, err, out) {
  const s = String(out || "");
  return { metered: !!q && !err && q.metered.test(s), known: !!q && !err && q.known.test(s) };
}

module.exports = { CHECK_EVERY, ON_FRONT_EVERY, RETRY_GAP, TICK, readChoices, mergeChoices, checkDue, downloadDue, taskbarValue, meteredQuery, meteredAnswer };
