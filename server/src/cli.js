// Recovery tools, run inside the container:
//   docker compose exec app node src/cli.js set-password
//   docker compose exec app node src/cli.js disable-2fa
import readline from "node:readline";
import { migrate, q, pool } from "./db.js";
import { hashPassword, passwordProblem, disableTotp } from "./auth.js";

const cmd = process.argv[2];
await migrate();
if (cmd === "set-password") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pw = await new Promise((r) => rl.question("New password (min 10 characters): ", r));
  rl.close();
  const bad = passwordProblem(pw);
  if (bad) { console.error(bad); process.exit(1); }
  await q("INSERT INTO auth_user (id,password_hash) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET password_hash=$1", [hashPassword(pw)]);
  await q("DELETE FROM sessions");
  console.log("Password set. All sessions were signed out.");
} else if (cmd === "disable-2fa") {
  await disableTotp(); await q("DELETE FROM sessions"); console.log("2FA turned off.");
} else console.log("usage: node src/cli.js set-password | disable-2fa");
await pool.end();
