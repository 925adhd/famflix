const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbMatch = {
  tmdbId: number;
  name: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

function authHeaders() {
  const token = process.env.TMDB_API_KEY;
  if (!token) throw new Error("TMDB_API_KEY not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function findBestMatch(
  name: string,
  kind: "movie" | "show",
  year: number | null
): Promise<TmdbMatch | null> {
  if (!process.env.TMDB_API_KEY) return null;

  const path = kind === "movie" ? "/search/movie" : "/search/tv";
  const params = new URLSearchParams({ query: name, include_adult: "false" });
  if (year) {
    params.set(kind === "movie" ? "primary_release_year" : "first_air_date_year", String(year));
  }

  const res = await fetch(`${TMDB_BASE}${path}?${params.toString()}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data: { results?: Array<Record<string, unknown>> } = await res.json();
  const first = data.results?.[0];
  if (!first) return null;

  const poster = first.poster_path as string | null;
  const backdrop = first.backdrop_path as string | null;

  const releaseDate =
    (first.release_date as string | undefined) ??
    (first.first_air_date as string | undefined) ??
    "";

  return {
    tmdbId: first.id as number,
    name:
      (first.title as string | undefined) ??
      (first.name as string | undefined) ??
      name,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    overview: (first.overview as string | null) ?? null,
    posterUrl: poster ? `${IMAGE_BASE}/w500${poster}` : null,
    backdropUrl: backdrop ? `${IMAGE_BASE}/w1280${backdrop}` : null,
  };
}
