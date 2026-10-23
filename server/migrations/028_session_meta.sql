-- Which device a sign-in is on, and when it was last used (Settings → Security lists them)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS client TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
