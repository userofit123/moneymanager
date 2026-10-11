-- Everything the bank, card or Wise returned for a transaction, kept as it came (memo, charge date, original amount, type, ids, ...).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS details JSONB;
