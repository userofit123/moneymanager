import test from "node:test";
import assert from "node:assert/strict";
import { reset } from "./helpers.js";
const { logError, listErrors, clearErrors, systemInfo, noteRequest, scrubText } = await import("../src/errlog.js");

test("errors are logged with what was being done, secrets are scrubbed, and the log can be listed and cleared", async () => {
  await reset();
  await clearErrors();
  noteRequest("POST", "/api/connections/max/test");
  await logError({ source: "test", action: "Test connection: Max", error: new Error('login failed {"password":"hunter2hunter2"} token=abc123 for user'), scrub: ["hunter2hunter2"], context: { connection: "max" } });
  const rows = await listErrors();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, "test");
  assert.equal(rows[0].action, "Test connection: Max");
  assert.ok(!/hunter2|abc123/.test(JSON.stringify(rows[0])));
  assert.ok(rows[0].context.recent.some((x) => x.includes("POST /api/connections/max/test")));
  const sys = await systemInfo("9.9.9");
  assert.equal(sys.app, "9.9.9");
  assert.ok(sys.platform && sys.node && sys.timezone);
  assert.equal(scrubText("Bearer abcdef123456 and key=1"), "Bearer ••• and key=1");
  await clearErrors();
  assert.equal((await listErrors()).length, 0);
});
