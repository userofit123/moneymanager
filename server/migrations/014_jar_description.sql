-- A note on a jar, and how many months of bills a "cover all my bills" jar keeps.
ALTER TABLE jars ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE jars ADD COLUMN IF NOT EXISTS bill_months INT;
