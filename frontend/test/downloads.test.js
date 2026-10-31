import { test } from "node:test";
import assert from "node:assert/strict";
import { downloads, RELEASES } from "../src/lib/downloads.js";

test("each device gets its own files from the release", () => {
  const names = (os) => downloads(os, "1.2.3").map((d) => d.href.split("/").pop());
  assert.deepEqual(names("win"), ["Money-Manager-Setup-1.2.3.exe"]);
  assert.deepEqual(names("mac"), ["Money-Manager-1.2.3-mac-arm64.dmg", "Money-Manager-1.2.3-mac-x64.dmg"]);
  assert.deepEqual(names("linux"), ["Money-Manager-1.2.3-linux-x86_64.rpm", "Money-Manager-1.2.3-linux-amd64.deb", "Money-Manager-1.2.3-linux-x86_64.AppImage"]);
  assert.deepEqual(names("android"), ["Money-Manager-1.2.3.apk"]);
  assert.ok(downloads("mac", "1.2.3")[0].href.startsWith(RELEASES + "/download/v1.2.3/"));
  assert.deepEqual(downloads("mac", "1.2.3").map((d) => d.main), [true, false]);
});

test("iPhone has no file; no version yet gives the page with every download", () => {
  assert.deepEqual(downloads("ios", "1.2.3"), []);
  assert.deepEqual(downloads("", "1.2.3"), []);
  assert.deepEqual(downloads("win", ""), [{ k: "deskAll", href: RELEASES + "/latest", main: true }]);
});
