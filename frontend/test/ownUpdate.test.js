import { test } from "node:test";
import assert from "node:assert/strict";
import { ownUpdateView, noticeShown } from "../src/lib/ownUpdate.js";

const up = { status: "available", latest: "1.4.0", cur: "1.3.0", percent: 0, mb: 0 };
const app = { status: "idle", percent: -1, mb: 0, staged: "", err: "", version: "" };

test("the desktop app shows its own update", () => {
  const u = ownUpdateView({ desk: true, phone: false, up: { ...up, status: "downloading", percent: 40, mb: 12.5 }, app });
  assert.deepEqual(u, { where: "desk", status: "downloading", version: "1.4.0", cur: "1.3.0", percent: 40, mb: 12.5, err: "" });
});

test("a browser tab shows the server's update", () => {
  assert.equal(ownUpdateView({ desk: false, phone: false, up, app }).where, "web");
});

test("the phone app follows its own download, not the server's", () => {
  const p = (a, behind = true) => ownUpdateView({ desk: false, phone: true, up, app: { ...app, ...a }, behind, phoneVersion: "1.3.0" });
  assert.equal(p({}).status, "available");
  assert.equal(p({}, false).status, "idle");
  assert.deepEqual(p({ status: "downloading", version: "1.4.0", percent: -1, mb: 3.2 }), { where: "phone", status: "downloading", version: "1.4.0", cur: "1.3.0", percent: -1, mb: 3.2, err: "" });
  assert.equal(p({ status: "ready", staged: "1.4.0" }).version, "1.4.0");
  // a failed download of a newer version is offered again, saying why
  assert.deepEqual([p({ status: "error", err: "updFailed" }).status, p({ status: "error", err: "updFailed" }).err], ["available", "updFailed"]);
  assert.equal(p({ status: "error" }, false).status, "error");
});

test("the notice shows only in the apps, and stays closed for the version it was closed for", () => {
  const u = ownUpdateView({ desk: true, phone: false, up, app });
  assert.equal(noticeShown(u, ""), true);
  assert.equal(noticeShown(u, "1.4.0"), false);
  assert.equal(noticeShown(u, "1.3.9"), true);
  assert.equal(noticeShown({ ...u, status: "uptodate" }, ""), false);
  assert.equal(noticeShown(ownUpdateView({ desk: false, phone: false, up, app }), ""), false);
});
