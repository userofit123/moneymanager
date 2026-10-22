const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { codeFolders } = require("../launcher.js");

const tree = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mm-root-")), data = fs.mkdtempSync(path.join(os.tmpdir(), "mm-data-"));
  for (const d of ["server", "scraper"]) { fs.mkdirSync(path.join(root, d, "app_modules", "pkg"), { recursive: true }); fs.writeFileSync(path.join(root, d, "app_modules", "pkg", "index.js"), "1"); }
  fs.writeFileSync(path.join(root, "server", "package.json"), JSON.stringify({ version: "9.9.9" }));
  return { root, data };
};
const lock = (root) => { for (const d of ["server", "scraper"]) { fs.chmodSync(path.join(root, d, "app_modules", "pkg", "index.js"), 0o444); fs.chmodSync(path.join(root, d), 0o555); } };
const unlock = (root) => { for (const d of ["server", "scraper"]) fs.chmodSync(path.join(root, d), 0o755); };

test("a writable program folder runs in place, with the modules renamed", () => {
  const { root, data } = tree();
  const c = codeFolders(root, data, () => {});
  assert.equal(c.server, path.join(root, "server"));
  assert.ok(fs.existsSync(path.join(root, "server", "node_modules", "pkg", "index.js")));
});

test("a read-only program folder (AppImage, /opt) runs from a copy in the data folder, made once", { skip: process.getuid && process.getuid() === 0 }, () => {
  const { root, data } = tree();
  lock(root);
  try {
    const c = codeFolders(root, data, () => {});
    assert.equal(c.server, path.join(data, "runtime", "9.9.9", "server"));
    assert.ok(fs.existsSync(path.join(c.server, "node_modules", "pkg", "index.js")));
    assert.ok(fs.existsSync(path.join(c.scraper, "node_modules", "pkg", "index.js")));
    fs.writeFileSync(path.join(c.server, "node_modules", "pkg", "index.js"), "2"); // the copy can be written
    const again = codeFolders(root, data, () => { throw new Error("copied again"); });
    assert.equal(again.server, c.server);
  } finally { unlock(root); }
});
