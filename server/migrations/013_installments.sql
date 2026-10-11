-- Card payments in instalments: which payment this is and how many there are in all (as the bank reports them).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inst_n INT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS inst_total INT;
