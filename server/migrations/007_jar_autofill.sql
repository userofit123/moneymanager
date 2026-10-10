-- Automatic monthly fill: the last month (YYYY-MM) each jar was filled, so a month is never applied twice
ALTER TABLE jars ADD COLUMN IF NOT EXISTS last_filled TEXT;
