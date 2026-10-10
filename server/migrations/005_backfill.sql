-- Earlier versions dropped recurring transactions that share a bank reference number. Re-read a year of history once
-- for every bank that already has data, so the missing ones come back (existing rows are matched, not duplicated).
INSERT INTO settings (key, value)
SELECT 'backfill:' || source, 'true'::jsonb FROM (SELECT DISTINCT source FROM transactions WHERE source IN ('hapoalim','max','isracard')) s
ON CONFLICT (key) DO NOTHING;
