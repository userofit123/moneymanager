// The Android app has its own copy of the API-level pair (android/.../Compat.kt): it must say the same as the desktop app's.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { APP } = require("../compat.js");

test("the Android app and the desktop app speak the same API level", () => {
  const kt = fs.readFileSync(path.join(__dirname, "../../android/app/src/main/java/app/moneymanager/android/Compat.kt"), "utf8");
  assert.strictEqual(+kt.match(/const val LEVEL = (\d+)/)[1], APP.level);
  assert.strictEqual(+kt.match(/const val MIN_SERVER = (\d+)/)[1], APP.minServer);
});
