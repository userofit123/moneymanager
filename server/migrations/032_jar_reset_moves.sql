-- Money moved by "Reset jars" is marked, so money a reset takes out of a jar does not reopen its monthly amount.
ALTER TABLE jar_movements ADD COLUMN IF NOT EXISTS reset BOOLEAN NOT NULL DEFAULT FALSE;
