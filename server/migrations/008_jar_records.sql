-- Every jar fill is a record (jar_movements), tagged with the month it belongs to, so "did this jar get its money this month"
-- is answered from what really happened rather than computed.
ALTER TABLE jar_movements ADD COLUMN IF NOT EXISTS month TEXT;
CREATE INDEX IF NOT EXISTS jar_movements_jar ON jar_movements (jar_id, id DESC);
