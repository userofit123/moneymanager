// Start the next version: node scripts/bump.mjs patch|minor|major   (or an exact number, e.g. 1.0.0)
// Adds an empty section at the top of CHANGELOG.md and sets the version in desktop/ and server/. Fill in the section, then merge to main:
// the release workflow notices the new version, tests it, tags it, builds the Windows installer and publishes the release.
import fs from "node:fs";
const kind = process.argv[2];
const log = fs.readFileSync("CHANGELOG.md", "utf8");
const m = log.match(/^## \[(\d+)\.(\d+)\.(\d+)\]/m);
if (!m) throw new Error("no version found in CHANGELOG.md");
let [maj, min, pat] = m.slice(1).map(Number), next;
if (/^\d+\.\d+\.\d+$/.test(kind || "")) next = kind;
else if (kind === "major") next = `${maj + 1}.0.0`;
else if (kind === "minor") next = `${maj}.${min + 1}.0`;
else if (kind === "patch") next = `${maj}.${min}.${pat + 1}`;
else { console.log("usage: node scripts/bump.mjs patch|minor|major|x.y.z"); process.exit(1); }
if (log.includes(`## [${next}]`)) throw new Error(`${next} is already in the changelog`);
const date = new Date().toISOString().slice(0, 10);
const section = `## [${next}] - ${date}\n\n### App\n- \n\n### Windows app\n- \n\n`;
fs.writeFileSync("CHANGELOG.md", log.replace(/^## \[/m, section + "## ["));
// Hebrew twin (shown when the app language is Hebrew) - write it too, so no version is left English-only
const heSec = `## [${next}] - ${date}\n\n### אפליקציה\n- \n\n### אפליקציית Windows\n- \n\n`;
const he = fs.readFileSync("web/changelog-he.md", "utf8");
fs.writeFileSync("web/changelog-he.md", /^## \[/m.test(he) ? he.replace(/^## \[/m, heSec + "## [") : he + "\n" + heSec);
for (const f of ["desktop/package.json", "server/package.json"]) {
  const j = JSON.parse(fs.readFileSync(f, "utf8")); j.version = next; fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
}
console.log(`Version ${next} started. Fill in its section in CHANGELOG.md AND web/changelog-he.md (Hebrew; delete empty bullets), then merge to main.`);
