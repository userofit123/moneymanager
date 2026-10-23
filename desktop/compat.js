// Whether the app's own screens fit a server (see server/src/apilevel.js).
// level: the API level these screens speak. minServer: the oldest server level they work with.
// Raise minServer when the screens start to need something a server of that level does not have; raise level only together with the server.
const APP = { level: 1, minServer: 1 };

// The level of a server that does not say it (0.12.1 to 0.12.4): level 1 when it is of the 0.12 line; a server that does not even say its version is not known.
const legacyLevel = (version) => (/^0\.12\.\d+$/.test(String(version || "")) ? 1 : 0);

// info: what the server answered ({ version, api, apiMin } from its sign-in status), or null when it did not answer.
function fits(info, app = APP) {
  if (!info) return false;
  const level = typeof info.api === "number" ? info.api : legacyLevel(info.version), min = typeof info.apiMin === "number" ? info.apiMin : 1;
  return level >= app.minServer && app.level >= min;
}

module.exports = { APP, fits, legacyLevel };
