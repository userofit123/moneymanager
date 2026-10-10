ALTER TABLE source_state ADD COLUMN IF NOT EXISTS assisted_at TIMESTAMPTZ;   -- last time the user verified this device by hand
