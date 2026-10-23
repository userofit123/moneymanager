// Puts what the Android app carries inside it into android/app/src/main/assets (not kept in git): the built screens (frontend/dist), the server list
// page of the desktop app and the words of the shell windows. Run it after "npm run build" in frontend/, before building the app.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "android", "app", "src", "main", "assets");
const dist = path.join(root, "frontend", "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("build the screens first: cd frontend && npm run build");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(dist, path.join(out, "web"), { recursive: true });
fs.copyFileSync(path.join(root, "desktop", "servers.html"), path.join(out, "servers.html"));
const t = createRequire(import.meta.url)(path.join(root, "desktop", "texts.js"));
fs.writeFileSync(path.join(out, "shell-texts.json"), JSON.stringify({ en: t.en, he: t.he }));
console.log("Android assets ready in", path.relative(root, out));
