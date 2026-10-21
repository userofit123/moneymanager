// Page addresses: each page has its own address, short names from older links still work, and unknown ones go Home.
import test from "node:test";
import assert from "node:assert/strict";
import { matchPage, hrefOf } from "../src/router.js";
import { pages } from "../src/routes.js";

test("addresses pick the right page, unknown ones go Home", () => {
  assert.equal(matchPage("/activity").name, "activity");
  assert.equal(matchPage("/activity/").name, "activity");
  assert.equal(matchPage("/jars?x=1").name, "jars");
  assert.equal(matchPage("/").name, "home");
  assert.equal(matchPage("/nope").name, "home");
  assert.equal(hrefOf(pages.find((p) => p.name === "bills")), "/bills");
  assert.equal(hrefOf(pages.find((p) => p.name === "home")), "/");
});

test("short names from older links open their page", () => {
  assert.equal(matchPage("/fc").name, "forecast");
  assert.equal(matchPage("/tx").name, "activity");
  assert.equal(matchPage("/dash").name, "home");
  assert.equal(matchPage("/budg#x").name, "budgets");
});

test("every page in the menu has a page to show and its own address", () => {
  for (const p of pages.filter((x) => x.nav)) { assert.equal(typeof p.component, "function", p.name); assert.match(p.path, /^\//, p.name); }
});

test("every page name has English and Hebrew menu text", async () => {
  const { readFileSync } = await import("node:fs");
  const en = JSON.parse(readFileSync(new URL("../src/locales/en.json", import.meta.url))), he = JSON.parse(readFileSync(new URL("../src/locales/he.json", import.meta.url)));
  for (const p of pages) { assert.ok(en.nav[p.name], p.name); assert.ok(he.nav[p.name], p.name); }
});
