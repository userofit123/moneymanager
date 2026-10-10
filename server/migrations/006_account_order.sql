-- Accounts created by a sync used to sort after everything else. Order by kind: bank, cards, Wise, pension.
UPDATE accounts SET sort = CASE kind WHEN 'bank' THEN 0 WHEN 'card' THEN 1 WHEN 'wallet' THEN 3 WHEN 'pension' THEN 4 ELSE 50 END;
