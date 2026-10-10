-- Incoming bank money used to be labelled "Bank transfer" whatever its payer, which merged a salary with every refund.
-- Use the bank's own description (it names the payer) so income sources can be told apart.
UPDATE transactions SET from_name = description
WHERE from_name = 'Bank transfer' AND amount > 0 AND source IN ('hapoalim','max','isracard') AND description <> '';
