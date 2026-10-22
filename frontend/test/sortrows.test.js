// Sorting a list by a column (lib/sortRows.js): the click cycle, aria-sort, numbers, names, and empty values last.
import test from "node:test";
import assert from "node:assert/strict";
import { nextSort, ariaSort, sortRows } from "../src/lib/sortRows.js";

const rows = [{ k: "b", v: 10, d: "2026-09-01" }, { k: "Á", v: 2, d: "" }, { k: "c", v: 10, d: "2026-10-05" }, { k: "a2", v: null, d: "2026-01-01" }, { k: "a10", v: 5, d: "2026-03-01" }];
const by = (s) => sortRows(rows, s, (r, c) => r[c]).map((r) => r.k);

test("a click sorts small to large, a second large to small, a third goes back to the list's order", () => {
  const a = nextSort(null, "v"), b = nextSort(a, "v"), c = nextSort(b, "v");
  assert.deepEqual([a, b, c], [{ key: "v", ord: "asc" }, { key: "v", ord: "desc" }, null]);
  assert.deepEqual(nextSort(b, "k"), { key: "k", ord: "asc" });
  assert.deepEqual([ariaSort(a, "v"), ariaSort(b, "v"), ariaSort(b, "k"), ariaSort(null, "v")], ["ascending", "descending", "none", "none"]);
});

test("numbers by size; equal values keep the list's order; empty values always last", () => {
  assert.deepEqual(by({ key: "v", ord: "asc" }), ["Á", "a10", "b", "c", "a2"]);
  assert.deepEqual(by({ key: "v", ord: "desc" }), ["b", "c", "a10", "Á", "a2"]);
  assert.equal(sortRows(rows, null, (r, c) => r[c]), rows);
});

test("names and dates as text: accents and case do not matter, numbers inside names count as numbers", () => {
  assert.deepEqual(by({ key: "k", ord: "asc" }), ["Á", "a2", "a10", "b", "c"]);
  assert.deepEqual(by({ key: "d", ord: "desc" }), ["c", "b", "a10", "a2", "Á"]);
});
