-- Alert history: every alert the app has shown, when it first appeared, when it went away.
CREATE TABLE IF NOT EXISTS alert_log (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,                       -- the alert's own id (the same alert keeps one row while it is active)
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  sev TEXT NOT NULL DEFAULT 'med',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS alert_log_open ON alert_log (key) WHERE resolved_at IS NULL;

-- Every time a hand-entered balance (the pension, or an account you made yourself) is changed.
CREATE TABLE IF NOT EXISTS account_updates (
  id SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  old_balance NUMERIC(16,2),
  new_balance NUMERIC(16,2) NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

-- Accounts you create yourself (no connection to automate them).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS custom BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS custom_kind TEXT NOT NULL DEFAULT '';          -- cash, savings, investment, loan, other
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS in_reports BOOLEAN NOT NULL DEFAULT TRUE;     -- its activity counts in reports and totals
ALTER TABLE net_worth_snapshots ADD COLUMN IF NOT EXISTS other NUMERIC(16,2) NOT NULL DEFAULT 0;
