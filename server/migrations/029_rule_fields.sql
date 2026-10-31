-- Where a category or tag rule looks in an entry (Settings → Automatic sorting). '' = as before: the transaction name.
ALTER TABLE rules ADD COLUMN IF NOT EXISTS field TEXT NOT NULL DEFAULT '';
ALTER TABLE tag_rules ADD COLUMN IF NOT EXISTS field TEXT NOT NULL DEFAULT '';
