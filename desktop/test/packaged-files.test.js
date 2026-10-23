// Every file the app loads from its own folder must be in the package list (package.json "files"), or the installed app stops at start with "Cannot find module".
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("every ./file the desktop app requires or loads is packaged", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
  const listed = new Set(pkg.build.files);
  const missing = [];
  for (const f of listed) {
    if (!f.endsWith(".js")) continue;
    const src = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    for (const m of src.matchAll(/require\("\.\/([\w-]+)(\.js)?"\)/g)) {
      const need = m[1] + ".js";
      if (!listed.has(need)) missing.push(f + " needs " + need);
    }
  }
  assert.deepStrictEqual(missing, []);
});
