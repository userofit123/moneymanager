// Page addresses work like the current app's, under /app.
import test from "node:test";
import assert from "node:assert/strict";
import { matchPage, hrefOf } from "../src/router.js";
import { pages } from "../src/routes.js";

test("addresses pick the right page, unknown ones go Home", () => {
  assert.equal(matchPage("/app/activity").name, "activity");
  assert.equal(matchPage("/app/activity/").name, "activity");
  assert.equal(matchPage("/app/jars?x=1").name, "jars");
  assert.equal(matchPage("/app/").name, "home");
  assert.equal(matchPage("/app/nope").name, "home");
  assert.equal(hrefOf(pages.find((p) => p.name === "bills")), "/app/bills");
});

test("every page not moved yet links to the same page in the current app", () => {
  for (const p of pages.filter((x) => x.nav && !x.component)) assert.match(p.old, /^\//, p.name);
});

test("every page name has English and Hebrew menu text", async () => {
  const { readFileSync } = await import("node:fs");
  const en = JSON.parse(readFileSync(new URL("../src/locales/en.json", import.meta.url))), he = JSON.parse(readFileSync(new URL("../src/locales/he.json", import.meta.url)));
  for (const p of pages) { assert.ok(en.nav[p.name], p.name); assert.ok(he.nav[p.name], p.name); }
});
