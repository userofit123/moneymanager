// Writes the changelog section of one version to a file (the release notes): node scripts/release-notes.mjs 0.12.0 desktop/release-notes.md
import fs from "node:fs";
const [v, out] = process.argv.slice(2), log = fs.readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const head = "## [" + v + "]", at = log.indexOf("\n" + head), start = at < 0 ? (log.startsWith(head) ? 0 : -1) : at + 1;
let notes = "See CHANGELOG.md";
if (start >= 0) { const body = log.slice(log.indexOf("\n", start) + 1), next = body.search(/^## /m); notes = (next < 0 ? body : body.slice(0, next)).trim() || notes; }
fs.writeFileSync(out, notes);
