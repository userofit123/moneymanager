-- An outgoing transaction can be paid out of a jar (jar_amount is how much of it), and a jar can be marked done.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS jar_id INT REFERENCES jars(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS jar_amount NUMERIC(16,2);
ALTER TABLE jars ADD COLUMN IF NOT EXISTS done_at DATE;
CREATE INDEX IF NOT EXISTS transactions_jar_idx ON transactions (jar_id) WHERE jar_id IS NOT NULL;
