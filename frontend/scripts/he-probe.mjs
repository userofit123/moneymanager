// Helper for translating strings with the current app's Hebrew rules (web/he-*.js). Usage: node scripts/he-probe.mjs "English text" ...
import { oldApp } from "../test/old-app.js";
const A = oldApp(new Date(2026, 9, 17, 12));
A.run("HE.on=true");
for (const s of process.argv.slice(2)) console.log(s, "=>", A.run("HE.T(" + JSON.stringify(s) + ")"));
