-- Jar types. kind: '' (savings or bills, the money sits in your accounts) or 'payoff' (a loan you pay back: paying does not lower the jar, it counts up).
-- outside: the part of the balance that is not in your tracked accounts (money saved elsewhere, or already paid back), so it is not taken off your free money.
ALTER TABLE jars ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT '';
ALTER TABLE jars ADD COLUMN IF NOT EXISTS outside NUMERIC(16,2) NOT NULL DEFAULT 0;
