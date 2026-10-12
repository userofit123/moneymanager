-- Auto-tag rules: separate from the category rules. "If the description contains X, add these tags" (comma-separated).
CREATE TABLE IF NOT EXISTS tag_rules (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  tag TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
-- Tags that used to ride on a category rule become tag rules of their own.
INSERT INTO tag_rules (keyword, tag, position)
  SELECT keyword, tag, position FROM rules WHERE tag <> '' ORDER BY position, id;
UPDATE rules SET tag = '' WHERE tag <> '';
