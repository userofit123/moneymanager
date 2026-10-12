-- A nickname per connection, so two logins at one company (two Wise accounts, two Max cards logins) read "Wise · Business", not "Wise" twice.
ALTER TABLE source_state ADD COLUMN IF NOT EXISTS nickname TEXT NOT NULL DEFAULT '';
