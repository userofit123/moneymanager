// Sorting a list by one column. A click on a column's title sorts small to large, a second click large to small,
// a third click goes back to the list's own order. sort: { key, ord: "asc" | "desc" } or null.
const NAMES = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export const nextSort = (cur, key) => (!cur || cur.key != key ? { key, ord: "asc" } : cur.ord == "asc" ? { key, ord: "desc" } : null);

// What aria-sort says for a column's title.
export const ariaSort = (cur, key) => (cur && cur.key == key ? (cur.ord == "asc" ? "ascending" : "descending") : "none");

// rows sorted by valueOf(row, key): numbers by size, texts (names, dates) the way the language orders them.
// Empty values (null, undefined, "") always go last; rows with the same value keep the list's own order.
export function sortRows(rows, sort, valueOf, collator = NAMES) {
  if (!sort) return rows;
  const s = sort.ord == "desc" ? -1 : 1, empty = (v) => v == null || v === "";
  return rows.map((r, i) => ({ r, i, v: valueOf(r, sort.key) })).sort((a, b) => {
    if (empty(a.v) || empty(b.v)) return empty(a.v) - empty(b.v) || a.i - b.i;
    const c = typeof a.v == "number" && typeof b.v == "number" ? a.v - b.v : collator.compare(String(a.v), String(b.v));
    return c * s || a.i - b.i;
  }).map((x) => x.r);
}
