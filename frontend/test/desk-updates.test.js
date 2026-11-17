import { test } from "node:test";
import assert from "node:assert/strict";
import { deskState, saveDeskChoices } from "../src/lib/deskUpdates.js";

test("the desktop app's state: its choices, and megabytes while the size is unknown", () => {
  const s = deskState({ current: "1.0.0", status: "downloading", version: "1.1.0", percent: -1, done: 12_345_678, total: 0, autoCheck: true, autoDownload: false, wifiOnly: true, auto: false });
  assert.equal(s.percent, -1);
  assert.equal(s.mb, 12.3);
  assert.deepEqual(s.choices, { autoCheck: true, autoDownload: false, wifiOnly: true });
  assert.equal(deskState({ status: "downloading", percent: 40, done: 4e6, total: 1e7 }).percent, 40);
});

test("an older desktop app has no choices, only its one switch", () => {
  const s = deskState({ current: "1.0.0", status: "uptodate", auto: true });
  assert.equal(s.choices, null);
  assert.equal(s.auto, true);
});

test("saving the choices: all three, or only download-by-itself on an older app", async () => {
  const got = [];
  await saveDeskChoices({ setChoices: (c) => got.push(["choices", c]), setAuto: (on) => got.push(["auto", on]) }, { autoCheck: false, autoDownload: true, wifiOnly: false });
  await saveDeskChoices({ setAuto: (on) => got.push(["auto", on]) }, { autoCheck: true, autoDownload: false, wifiOnly: true });
  assert.deepEqual(got, [["choices", { autoCheck: false, autoDownload: true, wifiOnly: false }], ["auto", false]]);
  assert.equal(await saveDeskChoices(null, {}), null);
});
