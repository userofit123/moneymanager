// The update choices and when the app checks and downloads by itself (updates.js).
const test = require("node:test");
const assert = require("node:assert");
const U = require("../updates");

const ON = { autoCheck: true, autoDownload: true, wifiOnly: true };
const H = 60 * 60 * 1000, M = 60 * 1000;

test("choices: defaults, and the old single switch carried over", () => {
  assert.deepStrictEqual(U.readChoices(null), ON);
  assert.deepStrictEqual(U.readChoices({ autoUpdate: true }), ON);
  assert.deepStrictEqual(U.readChoices({ autoUpdate: false }), { autoCheck: true, autoDownload: false, wifiOnly: true });
  assert.deepStrictEqual(U.readChoices({ autoUpdate: false, autoDownload: true, autoCheck: false, wifiOnly: false }), { autoCheck: false, autoDownload: true, wifiOnly: false });
  assert.deepStrictEqual(U.mergeChoices(ON, { wifiOnly: false, autoCheck: "no", other: true }), { ...ON, wifiOnly: false });
});

test("a check is due every 6 hours, after an hour when the window is back in front, and 15 minutes after a failure", () => {
  const now = 10 * H;
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "uptodate", lastCheck: now - 5 * H }), false);
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "uptodate", lastCheck: now - 6 * H }), true);
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "uptodate", lastCheck: now - 61 * M, every: U.ON_FRONT_EVERY }), true);
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "uptodate", lastCheck: now - 59 * M, every: U.ON_FRONT_EVERY }), false);
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "error", lastCheck: now - M, lastFail: now - 14 * M }), false);
  assert.strictEqual(U.checkDue({ now, choices: ON, status: "error", lastCheck: now - M, lastFail: now - 15 * M }), true);
  assert.strictEqual(U.checkDue({ now, choices: { ...ON, autoCheck: false }, status: "idle" }), false);
  for (const status of ["checking", "downloading", "ready", "dev"]) assert.strictEqual(U.checkDue({ now, choices: ON, status }), false);
});

test("a found version downloads by itself only when allowed, and waits on a metered connection with Only on Wi-Fi", () => {
  const now = 10 * H;
  assert.strictEqual(U.downloadDue({ now, choices: ON, status: "available" }), true);
  assert.strictEqual(U.downloadDue({ now, choices: ON, status: "available", metered: true }), false);
  assert.strictEqual(U.downloadDue({ now, choices: { ...ON, wifiOnly: false }, status: "available", metered: true }), true);
  assert.strictEqual(U.downloadDue({ now, choices: { ...ON, autoDownload: false }, status: "available" }), false);
  assert.strictEqual(U.downloadDue({ now, choices: ON, status: "available", lastFail: now - 5 * M }), false);
  assert.strictEqual(U.downloadDue({ now, choices: ON, status: "uptodate" }), false);
});

test("the taskbar bar: a share, or a moving bar (Windows) or none while the size is unknown", () => {
  assert.strictEqual(U.taskbarValue({ total: 100, percent: 42 }, "linux"), 0.42);
  assert.strictEqual(U.taskbarValue({ total: 0, percent: 0 }, "win32"), 2);
  assert.strictEqual(U.taskbarValue({ total: 0 }, "linux"), -1);
});

test("metered connection: Windows network cost and NetworkManager's Metered", () => {
  const w = U.meteredQuery("win32"), l = U.meteredQuery("linux");
  assert.deepStrictEqual(U.meteredAnswer(w, null, "Unrestricted\r\n"), { metered: false, known: true });
  assert.deepStrictEqual(U.meteredAnswer(w, null, "Variable"), { metered: true, known: true });
  assert.deepStrictEqual(U.meteredAnswer(l, null, "(<uint32 3>,)"), { metered: true, known: true });
  assert.deepStrictEqual(U.meteredAnswer(l, null, "(<uint32 4>,)"), { metered: false, known: true });
  assert.deepStrictEqual(U.meteredAnswer(l, null, "(<uint32 0>,)"), { metered: false, known: false });
  assert.deepStrictEqual(U.meteredAnswer(l, new Error("no gdbus"), ""), { metered: false, known: false });
  assert.strictEqual(U.meteredQuery("darwin"), null);
  assert.deepStrictEqual(U.meteredAnswer(null, null, ""), { metered: false, known: false });
});
