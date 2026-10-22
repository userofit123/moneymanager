// The service worker (public/sw.js) is not checked by the linter: it must at least be valid JavaScript,
// and keep the empty list the build fills in with the files the app loads later (vite.config.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("the service worker is valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(code));
});

test("the service worker keeps the list the build fills in", () => {
  assert.match(code, /const LATER = \[\];/);
  assert.match(readFileSync(new URL("../vite.config.js", import.meta.url), "utf8"), /const LATER = \\\[\\\];/);
});
