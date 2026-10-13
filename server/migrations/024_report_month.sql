-- "Count this in another month": the month (YYYY-MM) a transaction belongs to in reports. The transaction's own date never changes.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS report_month TEXT;
