// Saved expected results ("golden files") for tests that check whole outputs: numbers, lists, page words.
// matchesSaved("bills.state.demo", value) compares `value` with test/fixtures/bills.state.demo.json.
// matchesSaved("txactions#note-change", value) compares it with the part "note-change" of test/fixtures/txactions.json
// (for many small results of one test file).
// The files were first written from the old app's results (the new app matched them), so they hold the app's agreed behaviour.
// When a change is meant to alter the results, check the difference, then rewrite the files with:
//   UPDATE_SAVED=1 node --test test/<file>.test.js
// and look at the changes to the .json files in git before committing them.
// The saved results were made in Israel: some hold times of day (a bill's next date at 09:00), so the tests always run in that time zone, whatever the computer's.
process.env.TZ = "Asia/Jerusalem";
import assert from "node:assert/strict";
import fs from "node:fs";

const DIR = new URL("./fixtures/", import.meta.url);
const UPDATE = process.env.UPDATE_SAVED === "1";

// The value as JSON would keep it (no undefined, no functions), so it compares the same before and after saving.
const plain = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

// Written with small parts on one line, so the files stay short and a change shows as a small diff.
function format(v, pad = "") {
  const one = JSON.stringify(v);
  if (one.length <= 100 || v === null || typeof v !== "object") return one;
  const inner = pad + " ", list = Array.isArray(v) ? v.map((x) => inner + format(x, inner)) : Object.entries(v).map(([k, x]) => inner + JSON.stringify(k) + ": " + format(x, inner));
  return (Array.isArray(v) ? "[\n" : "{\n") + list.join(",\n") + "\n" + pad + (Array.isArray(v) ? "]" : "}");
}

const fileOf = (name) => new URL(name.split("#")[0] + ".json", DIR);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

export function saved(name) {
  const [, part] = name.split("#"), all = read(fileOf(name));
  return part ? all[part] : all;
}

export function matchesSaved(name, value, message = name) {
  const v = plain(value), file = fileOf(name), [, part] = name.split("#");
  if (UPDATE) {
    fs.mkdirSync(DIR, { recursive: true });
    const all = part ? { ...(fs.existsSync(file) ? read(file) : {}), [part]: v } : v;
    fs.writeFileSync(file, format(all) + "\n");
    return;
  }
  if (!fs.existsSync(file) || (part && !(part in read(file)))) assert.fail(`no saved result "${name}": run with UPDATE_SAVED=1 to write it`);
  assert.deepEqual(v, saved(name), message);
}
