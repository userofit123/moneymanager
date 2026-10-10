ALTER TABLE source_state ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ;   -- last successful "Test connection"
