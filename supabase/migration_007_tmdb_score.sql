-- Adds a tmdb_score column so we can store and display TMDB's vote_average
-- (0-10 float) alongside the existing content rating (titles.rating, which is
-- now finally getting populated from TMDB's release_dates/content_ratings
-- endpoints during upload + refetch).

alter table public.titles
  add column tmdb_score real;
