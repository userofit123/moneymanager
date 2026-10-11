-- A jar can pay for categories: spending in a linked category is paid from the jar. A category belongs to at most one jar.
-- "since" is the day the link started: only spending on or after it is paid from the jar.
CREATE TABLE IF NOT EXISTS jar_categories (
  category TEXT PRIMARY KEY,
  jar_id INT NOT NULL REFERENCES jars(id) ON DELETE CASCADE,
  since DATE NOT NULL DEFAULT current_date
);
CREATE INDEX IF NOT EXISTS jar_categories_jar ON jar_categories (jar_id);
-- jar_auto: the payment was attached by the category link (not by hand). jar_skip: do not attach this one automatically
-- (it was detached by hand, or the jar was empty); it holds the category it was skipped for, so a new category gives it a fresh chance.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS jar_auto BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS jar_skip TEXT;
-- paid: the movement is a payment out of the jar (or the undoing of one). Payments do not reopen the month's allowance:
-- spending ₪120 from a ₪500-a-month jar must not make the jar refill itself.
ALTER TABLE jar_movements ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT FALSE;
