// Stops your personal data from reaching the repo. It reads, on this computer only and without storing them: your transactions (shops, payers,
// notes, amounts, account and card numbers), everything you named yourself (categories, tags, rules, jars, renames, your profile), your bank
// logins, your git name and email, and .git/privacy-deny. A commit or push that adds a line holding any of it fails, and so does one
// whose time shows your time zone. The commit's author
// email must be a GitHub no-reply address, and files that hold data or secrets (backups, exports, .env) are refused.
//   node scripts/privacy-check.mjs            what is staged for the next commit (the pre-commit hook)
//   node scripts/privacy-check.mjs <range>    the commits about to be pushed, e.g. origin/main..HEAD (the pre-push hook)
//   node scripts/privacy-check.mjs --tree     every file in the repo as it is now
// Install the hooks once per copy of the repo: git config core.hooksPath .githooks
// A name that is fine to have (a big chain, a government office) goes on its own line in .git/privacy-allow, which is never committed.
// With no local database (another computer, CI) it only warns.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const DB = process.env.MM_DB_CONTAINER || "moneymanager-db-1";
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
// Everything that comes from you or your banks: what the banks send (long texts), and what you named yourself (short names count too).
// Built-in category, tag and bank names are the app's own, so they are left out.
const LONG = `SELECT description FROM transactions UNION SELECT from_name FROM transactions UNION SELECT to_name FROM transactions
  UNION SELECT note FROM transactions UNION SELECT details->>'account' FROM transactions UNION SELECT review_note FROM balance_gaps
  UNION SELECT note FROM jar_movements UNION SELECT description FROM jars UNION SELECT filename FROM documents UNION SELECT data::text FROM bills`;
const SHORT = `SELECT name FROM categories UNION SELECT name FROM tags UNION SELECT tag FROM transaction_tags UNION SELECT keyword FROM rules
  UNION SELECT keyword FROM tag_rules UNION SELECT tag FROM tag_rules UNION SELECT name FROM jars UNION SELECT name FROM planned_items
  UNION SELECT nickname FROM source_state UNION SELECT name FROM accounts UNION SELECT subtitle FROM accounts UNION SELECT custom_kind FROM accounts
  UNION SELECT jsonb_array_elements_text(value) FROM settings WHERE key IN ('card_rules','salary_rules','hidden_merchants') AND jsonb_typeof(value)='array'
  UNION SELECT e.value FROM settings s, jsonb_each_text(s.value->'renames') e WHERE s.key='cfg'
  UNION SELECT e.value FROM settings s, jsonb_each_text(s.value->'profile') e WHERE s.key='cfg'`;
const psql = (sql) => execFileSync("docker", ["exec", DB, "psql", "-U", "money", "-d", "money", "-tA", "-c", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n");
const lines0 = (f) => { try { return fs.readFileSync(f, "utf8").split("\n").map(norm).filter(Boolean); } catch { return []; } };
// The app's own words (built-in categories, suggested rules, demo data, server and history texts), as last committed, are not yours.
// Read from the last commit, so a name of yours added to one of these files in this commit is still caught.
const OWN = ["frontend/src/catnames.js", "server/src/categories.js", "server/src/seed.js", "frontend/src/stores/sample.js", "frontend/src/help/demo.js",
  "frontend/src/core/heSaved.js", "frontend/src/brands.js", "frontend/src/locales/en.json", "frontend/src/locales/he.json"];
const own = norm(OWN.map((f) => { try { return execFileSync("git", ["show", "HEAD:" + f], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return ""; } }).join("\n"));
const builtIn = { has: (x) => own.includes(x) };
// The lists live in the repo's own .git folder, shared by every working copy (worktree) of it.
const GITDIR = execFileSync("git", ["rev-parse", "--git-common-dir"], { encoding: "utf8" }).trim();
const allow = new Set(lines0(GITDIR + "/privacy-allow"));
let terms;
try {
  terms = [...psql(LONG).map((x) => [x, 6]), ...psql(SHORT).map((x) => [x, 4])];
} catch {
  console.warn("privacy check: no local database found, so nothing was checked");
  process.exit(0);
}
// .git/privacy-deny: anything else that must never appear (your name, email, phone, ID number, address), one per line. Never committed.
terms.push(...lines0(GITDIR + "/privacy-deny").map((x) => [x, 1]));
// Your bank logins (user names, ID numbers, card digits, passwords), read through the app only for this check and never written anywhere.
try {
  const js = `import { q } from "./src/db.js"; import { getCreds } from "./src/connections.js";
    const out = []; for (const r of (await q("SELECT source FROM credentials")).rows) { const c = await getCreds(r.source).catch(() => null);
      for (const v of Object.values(c || {})) if (typeof v === "string" || typeof v === "number") out.push(String(v)); }
    console.log(out.join("\\n")); process.exit(0);`;
  const creds = execFileSync("docker", ["exec", "-w", "/app/server", process.env.MM_APP_CONTAINER || "moneymanager-app-1", "node", "--input-type=module", "-e", js],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n");
  terms.push(...creds.map((x) => [x, 4]));
} catch { console.warn("privacy check: the app is not running, so your bank logins were not checked"); }
// Who you are on this computer: your git name and email, and the part before the @.
for (const k of ["user.email", "user.name"]) {
  try { const v = execFileSync("git", ["config", "--global", k], { encoding: "utf8" }).trim(); if (!/noreply/.test(v)) terms.push([v, 4], [v.split("@")[0], 4]); } catch { /* not set */ }
}
terms = [...new Set(terms.filter(([x, n]) => norm(x).length >= n).map(([x]) => norm(x)))]
  .filter((x) => !allow.has(x) && !builtIn.has(x) && (!/^[\d.,\s-]+$/.test(x) || /^\d{6,}$/.test(x)));
// Numbers: account and card numbers (any group of 4 or more digits in them) and exact amounts with cents (balances and transactions),
// matched as whole numbers. Library files (minified code) are left out: their digits mean nothing.
let tokens = [];
try {
  const acct = psql("SELECT DISTINCT details->>'account' FROM transactions WHERE details ? 'account'").flatMap((x) => x.match(/\d{4,}/g) || []);
  const amts = psql(`SELECT DISTINCT abs(x)::numeric(14,2)::text FROM (SELECT amount x FROM transactions UNION SELECT orig_amount FROM transactions
    UNION SELECT balance FROM balance_snapshots UNION SELECT balance FROM accounts UNION SELECT amount FROM balance_gaps) t
    WHERE x IS NOT NULL AND abs(x) >= 10 AND abs(x) <> round(abs(x))`).filter(Boolean).flatMap((a) => [a, a.replace(/0$/, "")]);
  tokens = [...new Set([...acct, ...amts])].filter((x) => !allow.has(x));
} catch { /* no database: already warned */ }
const VENDOR = /\.min\.js|package-lock\.json|\.lock:|frontend\/public\/(pdf|fonts)/;
const tokenRe = tokens.length ? new RegExp(`(?<![\\d.])(${tokens.map((x) => x.replace(/\./g, "\\.")).join("|")})(?![\\d]|\\.\\d)`, "g") : null;

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const arg = process.argv[2];
let lines; // [where, text]
if (!arg) { // the commit's author: a personal email would be public in the history
  const who = git("var", "GIT_AUTHOR_IDENT").trim();
  if (!/@users\.noreply\.github\.com>|noreply@anthropic\.com>/.test(who)) {
    console.error(`privacy check: this commit would be signed "${who.replace(/ \d+ [+-]\d{4}$/, "")}". Use your GitHub no-reply address:\n  git config user.email <id>+<user>@users.noreply.github.com`);
    process.exit(1);
  }
}
// Files that hold data or secrets never go in, whatever is inside them.
const BAD = /(^|\/)(\.env(\..+)?|secrets\/.*|data\/.*|.*\.mmbackup|.*\.(dump|sqlite|db|pgdata)|.*\.(xlsx?|csv|ofx|qif))$/i;
const files = (arg === "--tree" || arg === "--history" ? git("ls-files") : git("diff", "--name-only", "--diff-filter=A", ...(arg ? [arg] : ["--cached"]))).split("\n");
const bad = files.filter((f) => f && BAD.test(f) && f !== ".env.example" && !f.startsWith("frontend/test/fixtures/"));
if (bad.length) { console.error(`privacy check: these files may hold your data or secrets and must not be committed:\n  ${bad.join("\n  ")}`); process.exit(1); }
if (arg === "--history") { // every version of every file ever committed, on every branch
  const ids = [...new Set(git("rev-list", "--objects", "--all").split("\n").map((l) => l.split(" ")))].filter((x) => x[1]);
  const byId = new Map(ids.map(([id, name]) => [id, name]));
  const types = execFileSync("git", ["cat-file", "--batch-check"], { input: [...byId.keys()].join("\n"), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\n");
  lines = [];
  for (const t of types) {
    const [id, type, size] = t.split(" ");
    if (type !== "blob" || +size > 5e6) continue;
    const text = git("cat-file", "-p", id);
    if (text.includes("\0")) continue;
    text.split("\n").forEach((l, i) => lines.push([`${byId.get(id)}:${i + 1}`, l]));
  }
  git("log", "--all", "--format=%H %B").split("\n").forEach((l) => lines.push(["commit message", l]));
} else if (arg === "--tree") {
  lines = git("grep", "-I", "-n", "-e", "", "--", ".").split("\n").map((l) => { const m = l.match(/^(.+?:\d+):(.*)$/); return m ? [m[1], m[2]] : null; }).filter(Boolean);
} else {
  const diff = git("diff", "-U0", "--no-color", ...(arg ? [arg] : ["--cached"]));
  let file = "";
  lines = [];
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++ ")) file = l.slice(6);
    else if (l.startsWith("+")) lines.push([file, l.slice(1)]);
  }
}

// Commit times must be in UTC: a time zone tells roughly where you live (the post-commit hook saves every commit that way).
if (arg && arg !== "--tree") {
  const zoned = git("log", "--format=%h %ad %cd", "--date=format:%z", ...(arg === "--history" ? ["--all"] : [arg])).split("\n").filter((l) => l && !/ \+0000 \+0000$/.test(l));
  if (zoned.length) { console.error(`privacy check: ${zoned.length} commit(s) show your time zone (first: ${zoned[0].split(" ")[0]}). Save them in UTC first.`); process.exit(1); }
}
const hits = new Map(); // name -> where it is
for (const [where, text] of lines) {
  const t = norm(text);
  for (const x of terms) if (t.includes(x)) hits.set(x, [...(hits.get(x) || []), where]);
  if (tokenRe && !VENDOR.test(where)) for (const m of t.matchAll(tokenRe)) hits.set(m[1], [...(hits.get(m[1]) || []), where]);
}
if (hits.size) {
  console.error(`privacy check: ${hits.size} piece(s) of your personal data found:`);
  for (const [x, w] of hits) console.error(`  "${x}" in ${w.slice(0, 3).join(", ")}${w.length > 3 ? ` and ${w.length - 3} more` : ""}`);
  console.error("Replace them with made-up names and numbers. If one is fine to have (a big chain, a public price), add it on its own line to .git/privacy-allow.");
  process.exit(1);
}
