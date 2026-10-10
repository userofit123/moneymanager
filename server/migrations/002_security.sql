-- App login, sessions, encrypted source credentials, scraper lock-out guard
CREATE TABLE IF NOT EXISTS auth_user (
  id             INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),    -- single user
  password_hash  TEXT NOT NULL,                               -- scrypt
  totp_secret    TEXT,                                        -- encrypted (AES-256-GCM)
  totp_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,                               -- sha256 of the cookie value
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY, ip TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now(), ok BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_at ON login_attempts (at);

CREATE TABLE IF NOT EXISTS credentials (
  source      TEXT PRIMARY KEY,                               -- hapoalim | max | isracard | wise
  data        TEXT NOT NULL,                                  -- encrypted JSON of the fields, never sent back to the browser
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS source_state (
  source               TEXT PRIMARY KEY,
  consecutive_failures INT NOT NULL DEFAULT 0,
  locked               BOOLEAN NOT NULL DEFAULT FALSE,        -- after 2 failures in a row, no more automatic attempts until unlocked
  last_ok_at           TIMESTAMPTZ,
  last_error           TEXT NOT NULL DEFAULT ''
);
