// Dev mode on Docker Desktop: a file that is replaced (saved to a new file, then renamed over the old one, as many editors
// and tools do) can stay at its old copy inside the vite container, so https://money.local shows old code or texts
// (for example raw text names like "num.g.known"). Writing the same bytes back into the same file makes the container see it.
//   node scripts/dev-sync.mjs           puts right every file in frontend/ whose copy in the container is old
//   node scripts/dev-sync.mjs --watch   keeps doing it every 2 seconds
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { openSync, readFileSync, writeSync, closeSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../frontend/", import.meta.url).pathname;
const BOX = process.env.VITE_BOX || "moneymanager-vite-1";
const PARTS = ["src", "public", "index.html", "vite.config.js"];
const md5 = (b) => createHash("md5").update(b).digest("hex");

function sync() {
  let out;
  try { out = execFileSync("docker", ["exec", BOX, "sh", "-c", `cd /src/frontend && find ${PARTS.join(" ")} -type f -exec md5sum {} +`], { encoding: "utf8", maxBuffer: 64 << 20 }); }
  catch { console.error(`The ${BOX} container is not running.`); return; }
  const fixed = [];
  for (const line of out.trim().split("\n")) {
    const [sum, ...rest] = line.split("  "); const rel = rest.join("  "), p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    // read and write through one open file, so a file replaced again meanwhile is never overwritten with older text
    const fd = openSync(p, "r+");
    try {
      const b = readFileSync(fd);
      if (md5(b) === sum) continue;
      writeSync(fd, b, 0, b.length, 0); fixed.push(rel); // the same bytes in place: never empty, not even for a moment
    } finally { closeSync(fd); }
  }
  if (fixed.length) console.log(new Date().toLocaleTimeString(), "updated in the container:", fixed.join(", "));
}

sync();
if (process.argv.includes("--watch")) setInterval(sync, 2000);
