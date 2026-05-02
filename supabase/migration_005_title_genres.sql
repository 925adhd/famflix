-- Run in Supabase SQL Editor.
-- Adds a genres array on titles so the home page can render rows by genre
-- for studio-matched (tmdb_id IS NOT NULL) content. Backfill existing rows
-- by running scripts/backfill-genres.mjs after this migration succeeds.

alter table public.titles
  add column if not exists genres text[];

create index if not exists titles_genres_idx
  on public.titles using gin (genres);
