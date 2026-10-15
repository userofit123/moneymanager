-- Fills of 0 (a rounding leftover was counted as money) cluttered the jar history and showed "a jar received money" after every save.
DELETE FROM jar_movements WHERE note LIKE 'Auto-fill%' AND abs(amount) < 0.005;
