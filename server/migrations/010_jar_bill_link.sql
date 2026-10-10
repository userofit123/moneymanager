-- a jar can be tied to a recurring bill: the jar holds that bill's money, so the bill is not also held back from the available balance
ALTER TABLE jars ADD COLUMN IF NOT EXISTS bill_match TEXT;
