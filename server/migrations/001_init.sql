-- Money Manager schema (spec v1.0 section 8 + addendum v1.1)
CREATE TABLE IF NOT EXISTS accounts (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'ILS',
  kind          TEXT NOT NULL DEFAULT 'bank',          -- bank | card | wallet | pension
  source        TEXT NOT NULL DEFAULT 'manual',        -- hapoalim | max | isracard | wise | manual
  subtitle      TEXT NOT NULL DEFAULT '',
  manual        BOOLEAN NOT NULL DEFAULT FALSE,        -- balance edited by hand (pension)
  in_net_worth  BOOLEAN NOT NULL DEFAULT TRUE,
  balance       NUMERIC(16,2) NOT NULL DEFAULT 0,      -- original currency, as the source reports it
  balance_at    TIMESTAMPTZ,
  sort          INT NOT NULL DEFAULT 0,
  UNIQUE (name, currency)
);

CREATE TABLE IF NOT EXISTS categories (
  name   TEXT PRIMARY KEY,
  color  INT NOT NULL DEFAULT 0,
  sort   SERIAL
);

CREATE TABLE IF NOT EXISTS transactions (
  id             BIGSERIAL PRIMARY KEY,
  date           DATE NOT NULL,
  description    TEXT NOT NULL,
  from_name      TEXT NOT NULL DEFAULT '',
  to_name        TEXT NOT NULL DEFAULT '',
  amount         NUMERIC(16,2) NOT NULL,                -- ILS equivalent, at the rate of its own date
  orig_currency  TEXT,
  orig_amount    NUMERIC(16,2),
  rate           NUMERIC(14,6),                         -- rate used for the conversion, stored with the row
  category       TEXT REFERENCES categories(name) ON UPDATE CASCADE ON DELETE SET NULL,
  note           TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'manual',
  external_id    TEXT,                                  -- id from the bank/Wise; never imported twice
  pending        BOOLEAN NOT NULL DEFAULT FALSE,
  bank_category  TEXT,                                  -- hint only
  dup_ok         BOOLEAN NOT NULL DEFAULT FALSE,        -- "keep both" for a possible duplicate
  gap_explained  NUMERIC(16,2) NOT NULL DEFAULT 0,      -- part of this row already counted against a balance gap (original currency, signed)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_external ON transactions (source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_date ON transactions (date);

CREATE TABLE IF NOT EXISTS tags (name TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
  tag            TEXT REFERENCES tags(name) ON UPDATE CASCADE ON DELETE CASCADE,
  position       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (transaction_id, tag)
);

CREATE TABLE IF NOT EXISTS documents (
  id             BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL,
  mime           TEXT NOT NULL DEFAULT 'application/octet-stream',
  size           BIGINT NOT NULL DEFAULT 0,
  path           TEXT,                                  -- relative to DOCS_DIR; NULL for metadata-only
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rules (
  id        SERIAL PRIMARY KEY,
  keyword   TEXT NOT NULL,
  category  TEXT NOT NULL REFERENCES categories(name) ON UPDATE CASCADE ON DELETE CASCADE,
  tag       TEXT NOT NULL DEFAULT '',
  position  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jars (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  priority  INT NOT NULL,
  target    NUMERIC(16,2) NOT NULL DEFAULT 0,
  cap       NUMERIC(16,2),                              -- NULL = refilled every month (bill jar)
  balance   NUMERIC(16,2) NOT NULL DEFAULT 0,
  due       DATE
);
CREATE TABLE IF NOT EXISTS jar_movements (
  id SERIAL PRIMARY KEY, jar_id INT REFERENCES jars(id) ON DELETE CASCADE,
  amount NUMERIC(16,2) NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bills (
  id        SERIAL PRIMARY KEY,
  data      JSONB NOT NULL                              -- detected/manual bill (name, amount, cadence, match key, flags)
);
CREATE TABLE IF NOT EXISTS ignored_bills (match TEXT PRIMARY KEY);

CREATE TABLE IF NOT EXISTS budgets (category TEXT PRIMARY KEY, monthly_limit NUMERIC(16,2) NOT NULL);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);       -- alert_settings, jars_total, ntfy, ...
CREATE TABLE IF NOT EXISTS dismissed_alerts (id TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS transfer_links (
  out_id  BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
  in_id   BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
  status  TEXT NOT NULL DEFAULT 'auto',                 -- auto | ok | rej
  PRIMARY KEY (out_id, in_id)
);

CREATE TABLE IF NOT EXISTS reconciliation_adjustments (
  id SERIAL PRIMARY KEY, account TEXT NOT NULL, amount NUMERIC(16,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Addendum v1.1: balance snapshots and gaps (missing money)
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id SERIAL PRIMARY KEY, account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  balance NUMERIC(16,2) NOT NULL, taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS balance_gaps (
  id SERIAL PRIMARY KEY, account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(16,2) NOT NULL,                        -- signed, original currency: negative = money out
  remaining NUMERIC(16,2) NOT NULL,
  window_from TIMESTAMPTZ NOT NULL, window_to TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',                  -- open | cleared | reviewed
  review_note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  date DATE NOT NULL, base TEXT NOT NULL, quote TEXT NOT NULL DEFAULT 'ILS', rate NUMERIC(14,6) NOT NULL, source TEXT NOT NULL DEFAULT 'frankfurter',
  PRIMARY KEY (date, base, quote)
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  month TEXT PRIMARY KEY,                               -- YYYY-MM
  bank NUMERIC(16,2) NOT NULL DEFAULT 0, wise NUMERIC(16,2) NOT NULL DEFAULT 0, pension NUMERIC(16,2) NOT NULL DEFAULT 0,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), who TEXT NOT NULL DEFAULT 'You',
  action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', undo JSONB
);

CREATE TABLE IF NOT EXISTS planned_items (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, amount NUMERIC(16,2) NOT NULL, date DATE NOT NULL, category TEXT
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ,
  ok BOOLEAN, added INT NOT NULL DEFAULT 0, message TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO app_meta (key, value) VALUES ('rev', '1') ON CONFLICT DO NOTHING;
