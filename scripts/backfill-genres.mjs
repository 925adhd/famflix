// One-off backfill for titles.genres. After migration_005 has been applied,
// run with:
//   node --env-file=.env.local scripts/backfill-genres.mjs
//
// Reads every titles row that has a tmdb_id but no genres yet, hits
// TMDB's /movie/{id} or /tv/{id} detail endpoint, and writes the canonical
// genre names back. Idempotent — re-running skips already-filled rows.

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

async function fetchGenres(tmdbId, kind) {
  const path = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: {
      Authorization: `Bearer ${TMDB_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${path} -> ${res.status}`);
  }
  const data = await res.json();
  return (data.genres ?? []).map((g) => g.name).filter(Boolean);
}

async function main() {
  const { data: rows, error } = await supabase
    .from("titles")
    .select("id, name, kind, tmdb_id, genres")
    .not("tmdb_id", "is", null);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  const todo = (rows ?? []).filter(
    (r) => !r.genres || r.genres.length === 0
  );

  console.log(`${rows?.length ?? 0} TMDB-matched titles, ${todo.length} need genres`);

  let ok = 0;
  let fail = 0;
  for (const row of todo) {
    try {
      const genres = await fetchGenres(row.tmdb_id, row.kind);
      const { error: upErr } = await supabase
        .from("titles")
        .update({ genres })
        .eq("id", row.id);
      if (upErr) throw upErr;
      console.log(`  ${row.name} -> ${genres.join(", ") || "(none)"}`);
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
