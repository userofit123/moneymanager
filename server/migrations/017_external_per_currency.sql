-- A Wise conversion has one line in each currency balance under the same reference number, so the reference is only
-- unique together with the currency of the line.
DROP INDEX IF EXISTS transactions_external;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_external ON transactions (source, external_id, (COALESCE(orig_currency, 'ILS'))) WHERE external_id IS NOT NULL;
