-- "Forgot password?": the recovery key (only its slow hash), the code sent to the phone (only its slow hash, when it ends, how many tries are left)
-- and a log of reset attempts (for the rate limits and the 15-minute lock).
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS recovery_hash TEXT;
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS recovery_at TIMESTAMPTZ;
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS reset_code_hash TEXT;
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ;
ALTER TABLE auth_user ADD COLUMN IF NOT EXISTS reset_code_tries INT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS reset_attempts (
  id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), ip TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,  -- send | key | code | 2fa
  ok BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS reset_attempts_at ON reset_attempts (at);
