-- Older installs were created with a bank, two cards and a wallet that nothing was ever connected to. They showed up on the home page.
-- An account that was never synced, has no transactions and is not hand-entered is just a leftover: remove it.
DELETE FROM accounts a WHERE NOT manual AND balance_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.from_name = a.name OR t.to_name = a.name);
