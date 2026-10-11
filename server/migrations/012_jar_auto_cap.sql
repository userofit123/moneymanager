-- A jar can work out its own monthly amount from its target and deadline.
-- A jar with a target of 0 has no goal: it just keeps putting its monthly amount aside.
ALTER TABLE jars ADD COLUMN IF NOT EXISTS auto_cap BOOLEAN NOT NULL DEFAULT false;
