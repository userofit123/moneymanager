-- A card whose debt went down because the bank paid it: the bank payment that explained the gap, so one payment explains one gap only.
ALTER TABLE balance_gaps ADD COLUMN IF NOT EXISTS paid_by BIGINT;
