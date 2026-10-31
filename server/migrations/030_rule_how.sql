-- How a category or tag rule compares its text: '' = contains (as before), eq, starts, ends or not (does not contain).
ALTER TABLE rules ADD COLUMN IF NOT EXISTS how TEXT NOT NULL DEFAULT '';
ALTER TABLE tag_rules ADD COLUMN IF NOT EXISTS how TEXT NOT NULL DEFAULT '';
