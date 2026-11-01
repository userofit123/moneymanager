import test from "node:test";
import assert from "node:assert/strict";
import { failKind } from "../src/lib/syncFail.js";

test("a bank's raw error becomes one plain kind; the app's own sentences stay as they are", () => {
  assert.equal(failKind("GENERIC: unknown error during login - page went to example.test/Login; net::ERR_FAILED"), "site");
  assert.equal(failKind("TIMEOUT: timed out"), "site");
  assert.equal(failKind("scraper HTTP 502"), "site");
  assert.equal(failKind("fetch failed"), "site");
  assert.equal(failKind("INVALID_PASSWORD: login failed"), "login");
  assert.equal(failKind("Wise /v2/profiles: HTTP 401"), "login");
  assert.equal(failKind("CHANGE_PASSWORD: x"), "bank");
  assert.equal(failKind("ACCOUNT_BLOCKED: x"), "bank");
  assert.equal(failKind("OTP_REQUIRED: the bank asked for a one-time code"), "otp");
  assert.equal(failKind("Locked after failed attempts. Unlock it first."), "");
  assert.equal(failKind(""), "");
});
