// The phone app's navigation (phone/navigation.js): each tab keeps its own stack of screens, the address decides what shows,
// pushing and going back move within the open tab, and opening Activity from elsewhere starts its stack again.
import test from "node:test";
import assert from "node:assert/strict";
import { stackOf, pushUrl, createNav, showUrl, top, tabOf } from "../src/phone/navigation.js";

const names = (st) => st.map((s) => s.name);

test("an address is a tab and a stack of screens", () => {
  assert.deepEqual(stackOf("/"), { tab: "home", stack: [{ name: "home", id: null, url: "/" }] });
  assert.deepEqual(names(stackOf("/activity").stack), ["activity"]);
  assert.deepEqual(names(stackOf("/more").stack), ["more"]);
  const acc = stackOf("/accounts?id=4&tx=9");
  assert.equal(acc.tab, "more");
  assert.deepEqual(names(acc.stack), ["more", "accounts", "account", "transaction"]);
  assert.deepEqual(acc.stack.map((s) => s.url), ["/more", "/accounts", "/accounts?id=4", "/accounts?id=4&tx=9"]);
  assert.equal(acc.stack[2].id, "4");
  assert.deepEqual(names(stackOf("/fc").stack), ["more", "forecast"], "old short names still work");
  assert.deepEqual(names(stackOf("/settings?sec=conn").stack), ["more", "settings", "settingsSection"]);
  assert.deepEqual(names(stackOf("/jars?id=4").stack), ["jars"], "a pushed screen only opens on its own page");
  assert.deepEqual(names(stackOf("/?tx=7").stack), ["home", "transaction"], "a transaction opens on any tab");
  assert.equal(tabOf("budgets"), "more");
  assert.equal(tabOf("bills"), "bills");
});

test("pushUrl gives the address of a screen pushed on top of another", () => {
  assert.equal(pushUrl("/accounts?id=4", "transaction", 9), "/accounts?id=4&tx=9");
  assert.equal(pushUrl("/more", "accounts"), "/accounts");
  assert.equal(pushUrl("/more", "more"), "/more");
  assert.equal(pushUrl("/jars", "jar", "j1"), "/jars?jar=j1");
  assert.equal(pushUrl("/", "account", 2), "/accounts?id=2");
});

test("push and Back move within the open tab; a screen keeps its place and scroll", () => {
  const nav = createNav("/");
  assert.equal(showUrl(nav, "/?tx=3"), "push");
  assert.deepEqual(names(nav.stacks.home), ["home", "transaction"]);
  nav.stacks.home[0].y = 420;
  assert.equal(showUrl(nav, "/"), "pop");
  assert.deepEqual(names(nav.stacks.home), ["home"]);
  assert.equal(top(nav).y, 420, "the screen under it is the same one, with its scroll");
  assert.equal(showUrl(nav, "/"), "none");
});

test("each tab keeps its own stack; a tab opened again shows it as it was", () => {
  const nav = createNav("/");
  assert.equal(showUrl(nav, "/accounts"), "tab");
  assert.equal(showUrl(nav, "/accounts?id=4"), "push");
  assert.equal(showUrl(nav, "/jars"), "tab");
  assert.equal(nav.tab, "jars");
  assert.equal(showUrl(nav, "/accounts?id=4"), "tab");
  assert.deepEqual(names(nav.stacks.more), ["more", "accounts", "account"]);
  assert.equal(showUrl(nav, "/more"), "pop");
  assert.deepEqual(names(nav.stacks.more), ["more"]);
});

test("opening Activity from elsewhere (goActivity, an alert) starts its stack again", () => {
  const nav = createNav("/activity?tx=5");
  assert.deepEqual(names(nav.stacks.activity), ["activity", "transaction"]);
  showUrl(nav, "/bills");
  assert.equal(showUrl(nav, "/activity"), "tab");
  assert.deepEqual(names(nav.stacks.activity), ["activity"]);
});

test("Back after a window: the window's own history step has the same address, so the screens stay", () => {
  const nav = createNav("/accounts?id=4");
  assert.equal(showUrl(nav, "/accounts?id=4"), "none");
  assert.deepEqual(names(nav.stacks.more), ["more", "accounts", "account"]);
});

test("a deeper address than the open screen pushes; a different one in the same tab replaces the stack", () => {
  const nav = createNav("/accounts?id=4");
  assert.equal(showUrl(nav, "/accounts?id=5"), "push");
  assert.deepEqual(nav.stacks.more.map((s) => s.url), ["/more", "/accounts", "/accounts?id=5"]);
});
