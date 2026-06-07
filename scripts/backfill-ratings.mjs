// One-off backfill for titles.tmdb_score and titles.rating. After
// migration_007 has been applied, run with:
//   node --env-file=.env.local scripts/backfill-ratings.mjs
//
// Reads every titles row that has a tmdb_id but is missing either the
// vote score or the US content rating, hits TMDB's detail endpoint with
// release_dates/content_ratings appended, and writes both back.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_KEY = process.env.TMDB_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!TMDB_KEY) {
  console.error("Missing TMDB_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function extractUsRating(detail, kind) {
  if (kind === "movie") {
    const us = detail?.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
    const cert = us?.release_dates?.find(
      (rd) => typeof rd.certification === "string" && rd.certification.trim()
    )?.certification;
    return cert ? cert.trim() : null;
  } else {
    const us = detail?.content_ratings?.results?.find((r) => r.iso_3166_1 === "US");
    return us?.rating?.trim() || null;
  }
}

async function fetchScoreAndRating(tmdbId, kind) {
  const path = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const append = kind === "movie" ? "release_dates" : "content_ratings";
  const res = await fetch(
    `https://api.themoviedb.org/3${path}?append_to_response=${append}`,
    {
      headers: {
        Authorization: `Bearer ${TMDB_KEY}`,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`TMDB ${path} -> ${res.status}`);
  const detail = await res.json();
  const va = detail.vote_average;
  return {
    voteAverage: typeof va === "number" && va > 0 ? va : null,
    rating: extractUsRating(detail, kind),
  };
}

async function main() {
  const { data: rows, error } = await supabase
    .from("titles")
    .select("id, name, kind, tmdb_id, tmdb_score, rating")
    .not("tmdb_id", "is", null);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  const todo = (rows ?? []).filter(
    (r) => r.tmdb_score == null || r.rating == null
  );

  console.log(
    `${rows?.length ?? 0} TMDB-matched titles, ${todo.length} need score or rating`
  );

  let ok = 0;
  let fail = 0;
  for (const row of todo) {
    try {
      const { voteAverage, rating } = await fetchScoreAndRating(
        row.tmdb_id,
        row.kind
      );
      const update = {};
      if (row.tmdb_score == null && voteAverage != null) {
        update.tmdb_score = voteAverage;
      }
      if (row.rating == null && rating != null) {
        update.rating = rating;
      }
      if (Object.keys(update).length === 0) {
        console.log(`  ${row.name} -> nothing new from TMDB, skipping`);
        continue;
      }
      const { error: upErr } = await supabase
        .from("titles")
        .update(update)
        .eq("id", row.id);
      if (upErr) throw upErr;
      console.log(
        `  ${row.name} -> ${update.tmdb_score ?? "(score kept)"} / ${update.rating ?? "(rating kept)"}`
      );
      ok++;
    } catch (err) {
      console.error(`  FAIL ${row.name}:`, err.message ?? err);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Done. ${ok} updated, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
