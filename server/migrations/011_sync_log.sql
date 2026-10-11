-- A readable sync log: what was asked for (days), what came back (seen, oldest) and who started it.
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS days INT;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS seen INT;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS oldest DATE;
ALTER TABLE sync_runs ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual';
