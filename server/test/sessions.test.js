import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q } from "./helpers.js";
import * as auth from "../src/auth.js";

before(reset);
after(() => pool.end());

const CHROME_LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const WEBVIEW = "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36";
const ELECTRON = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) money-manager/0.12.8 Chrome/130.0.0.0 Electron/33.0.0 Safari/537.36";

test("a sign-in is told apart: the Android app, the desktop app, the web app and a browser tab", () => {
  assert.deepEqual(auth.deviceOf("apk/0.12.8", WEBVIEW), { kind: "apk", os: "Android", version: "0.12.8" });
  assert.equal(auth.deviceOf("", WEBVIEW).kind, "apk"); // an older sign-in: the web view says it is one
  assert.deepEqual(auth.deviceOf("desktop/0.12.8", ELECTRON), { kind: "desktop", os: "Linux", version: "0.12.8" });
  assert.equal(auth.deviceOf("", ELECTRON).kind, "desktop");
  assert.deepEqual(auth.deviceOf("pwa", CHROME_ANDROID), { kind: "pwa", os: "Android", browser: "Chrome" });
  assert.deepEqual(auth.deviceOf("web", CHROME_LINUX), { kind: "web", os: "Linux", browser: "Chrome" });
});

test("the list shows every sign-in, marks this one and can end another", async () => {
  const a = await auth.startSession(CHROME_LINUX, "web");
  const b = await auth.startSession(WEBVIEW, "apk/0.12.8");
  const list = await auth.listSessions(a);
  assert.equal(list.length, 2);
  assert.equal(list.filter((s) => s.current).length, 1);
  assert.equal(list.find((s) => s.current).kind, "web");
  const other = list.find((s) => !s.current);
  assert.equal(other.kind, "apk");
  await auth.endSessionById(other.id);
  assert.equal(await auth.sessionValid(b), false);
  assert.equal(await auth.sessionValid(a), true);
  assert.equal((await q("SELECT count(*)::int AS n FROM sessions")).rows[0].n, 1);
  assert.equal(await auth.endSessionById("not-an-id"), null);
});
