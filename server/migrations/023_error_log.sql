-- Every error the app meets, with what was being done, so it can be copied and sent for help.
CREATE TABLE IF NOT EXISTS error_log (
  id      BIGSERIAL PRIMARY KEY,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  source  TEXT NOT NULL,                 -- server, sync, test, web, process
  action  TEXT NOT NULL DEFAULT '',      -- what was being done
  message TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT '',      -- stack trace
  context JSONB NOT NULL DEFAULT '{}'    -- request, connection, recent actions, ...
);
CREATE INDEX IF NOT EXISTS error_log_at ON error_log (at DESC);
