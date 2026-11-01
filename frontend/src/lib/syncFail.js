// The kind of problem behind a failed sync, from the bank's raw error, so the app can say it in plain words.
// The server picks the same kinds for its alert (server/src/syncFailNotice.js).
// The scraper sends "<errorType>: <details>" (israeli-bank-scrapers errorType values).
// otp: the bank asked for a one-time code · login: the bank did not accept the login · bank: a new password or a blocked account, done on the bank's site
// site: the bank's site or the network had a problem, nothing to do · "": the app's own plain sentence, shown as it is
export function failKind(msg) {
  const m = String(msg || "");
  if (!m) return "";
  if (/^(OTP_REQUIRED|TWO_FACTOR_RETRIEVER_MISSING)\b/.test(m)) return "otp";
  if (/^INVALID_PASSWORD\b/.test(m) || /^Wise .*HTTP 40[13]\b/.test(m)) return "login";
  if (/^(CHANGE_PASSWORD|ACCOUNT_BLOCKED)\b/.test(m)) return "bank";
  if (/^[A-Z][A-Z_]+:|net::|HTTP \d{3}|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|timed? ?out|aborted|socket|scraper/i.test(m)) return "site";
  return "";
}
