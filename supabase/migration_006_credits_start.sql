-- Adds an optional per-title credits-start timestamp so the autoplay
-- "Next up" overlay can fire when credits begin instead of the last-N-seconds
-- heuristic. Admins/uploaders mark it from the player while watching.

alter table public.titles
  add column credits_start_seconds int;
