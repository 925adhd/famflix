const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

// Stable TMDB genre id -> name maps. Sourced from /genre/movie/list and
// /genre/tv/list. Embedded so we don't need an extra round-trip per upload.
const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

function mapGenreIds(ids: unknown, kind: "movie" | "show"): string[] {
  if (!Array.isArray(ids)) return [];
  const map = kind === "movie" ? MOVIE_GENRES : TV_GENRES;
  const names = ids
    .map((id) => (typeof id === "number" ? map[id] : undefined))
    .filter((n): n is string => Boolean(n));
  return Array.from(new Set(names));
}

export type TmdbMatch = {
  tmdbId: number;
  name: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  voteAverage: number | null;
  rating: string | null;
};

// Extracts the US certification from the appended release_dates or
// content_ratings payload that comes back from /movie/{id} or /tv/{id}.
function extractUsRating(
  detail: Record<string, unknown>,
  kind: "movie" | "show"
): string | null {
  if (kind === "movie") {
    const releaseDates = detail.release_dates as
      | { results?: Array<{ iso_3166_1?: string; release_dates?: Array<{ certification?: string }> }> }
      | undefined;
    const us = releaseDates?.results?.find((r) => r.iso_3166_1 === "US");
    const cert = us?.release_dates?.find(
      (rd) => typeof rd.certification === "string" && rd.certification.trim() !== ""
    )?.certification;
    return cert ? cert.trim() : null;
  } else {
    const contentRatings = detail.content_ratings as
      | { results?: Array<{ iso_3166_1?: string; rating?: string }> }
      | undefined;
    const us = contentRatings?.results?.find((r) => r.iso_3166_1 === "US");
    return us?.rating?.trim() || null;
  }
}

export class TmdbError extends Error {}

function authHeaders() {
  const token = process.env.TMDB_API_KEY?.trim();
  if (!token) {
    throw new TmdbError("TMDB_API_KEY is not set in this environment.");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "Famflix/1.0",
  };
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export async function findBestMatch(
  name: string,
  kind: "movie" | "show",
  year: number | null
): Promise<TmdbMatch | null> {
  const path = kind === "movie" ? "/search/movie" : "/search/tv";
  const params = new URLSearchParams({ query: name, include_adult: "false" });
  if (year) {
    params.set(
      kind === "movie" ? "primary_release_year" : "first_air_date_year",
      String(year)
    );
  }

  let res: Response;
  try {
    res = await fetchWithRetry(`${TMDB_BASE}${path}?${params.toString()}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
  } catch (err) {
    const parts: string[] = [];
    if (err instanceof Error) {
      parts.push(err.message);
      const cause = (err as { cause?: unknown }).cause;
      if (cause instanceof Error) {
        parts.push(cause.message);
      } else if (cause) {
        parts.push(String(cause));
      }
    } else {
      parts.push("unknown error");
    }
    throw new TmdbError(`TMDB network error: ${parts.join(" — ")}`);
  }

  if (res.status === 401) {
    throw new TmdbError(
      "TMDB rejected the API key (401). Make sure you pasted the v4 Read Access Token (starts with eyJ…), not the v3 key."
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TmdbError(`TMDB responded ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: { results?: Array<Record<string, unknown>> } = await res.json();
  const first = data.results?.[0];
  if (!first) return null;

  const tmdbId = first.id as number;
  const poster = first.poster_path as string | null;
  const backdrop = first.backdrop_path as string | null;

  const releaseDate =
    (first.release_date as string | undefined) ??
    (first.first_air_date as string | undefined) ??
    "";

  const voteAvg = first.vote_average;
  const voteAverage =
    typeof voteAvg === "number" && voteAvg > 0 ? voteAvg : null;

  let rating: string | null = null;
  try {
    const detailPath = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    const append =
      kind === "movie" ? "release_dates" : "content_ratings";
    const detailRes = await fetchWithRetry(
      `${TMDB_BASE}${detailPath}?append_to_response=${append}`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (detailRes.ok) {
      const detail = (await detailRes.json()) as Record<string, unknown>;
      rating = extractUsRating(detail, kind);
    }
  } catch {
    // Best-effort; leave rating null if the detail call fails.
  }

  return {
    tmdbId,
    name:
      (first.title as string | undefined) ??
      (first.name as string | undefined) ??
      name,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    overview: (first.overview as string | null) ?? null,
    posterUrl: poster ? `${IMAGE_BASE}/w500${poster}` : null,
    backdropUrl: backdrop ? `${IMAGE_BASE}/w1280${backdrop}` : null,
    genres: mapGenreIds(first.genre_ids, kind),
    voteAverage,
    rating,
  };
}

// Fetches a movie's collection (franchise) id, if any. Used to figure
// out the next sequel for autoplay. Returns null for movies not in a
// collection or for TV shows.
export async function fetchMovieCollectionId(
  tmdbId: number
): Promise<number | null> {
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}`, {
    headers: authHeaders(),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  const data: { belongs_to_collection?: { id?: unknown } | null } =
    await res.json();
  const c = data.belongs_to_collection;
  return c && typeof c.id === "number" ? c.id : null;
}

// Fetches every part of a TMDB collection. Returns the tmdb_id and
// release year for each movie so we can pick the next-by-year sequel.
export async function fetchCollectionParts(
  collectionId: number
): Promise<Array<{ id: number; year: number | null }>> {
  const res = await fetch(`${TMDB_BASE}/collection/${collectionId}`, {
    headers: authHeaders(),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return [];
  const data: { parts?: Array<{ id?: unknown; release_date?: unknown }> } =
    await res.json();
  return (data.parts ?? [])
    .map((p) => {
      const id = typeof p.id === "number" ? p.id : null;
      const date = typeof p.release_date === "string" ? p.release_date : "";
      const year = date ? Number(date.slice(0, 4)) || null : null;
      return id !== null ? { id, year } : null;
    })
    .filter((p): p is { id: number; year: number | null } => p !== null);
}

// Fetches TMDB's curated "recommendations" for a given title, returning
// the recommended TMDB IDs in TMDB's ranked order. Used to power the
// "More Like This" row by intersecting against our local library.
export async function fetchRecommendations(
  tmdbId: number,
  kind: "movie" | "show"
): Promise<number[]> {
  const path =
    kind === "movie"
      ? `/movie/${tmdbId}/recommendations`
      : `/tv/${tmdbId}/recommendations`;
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: authHeaders(),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) return [];

  const data: { results?: Array<{ id?: unknown }> } = await res.json();
  return (data.results ?? [])
    .map((r) => (typeof r.id === "number" ? r.id : null))
    .filter((id): id is number => id !== null);
}

// Fetches TMDB score + US content rating for an already-stored tmdb_id.
// Used by the backfill script.
export async function fetchScoreAndRatingByTmdbId(
  tmdbId: number,
  kind: "movie" | "show"
): Promise<{ voteAverage: number | null; rating: string | null }> {
  const path = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const append = kind === "movie" ? "release_dates" : "content_ratings";
  const res = await fetchWithRetry(
    `${TMDB_BASE}${path}?append_to_response=${append}`,
    { headers: authHeaders(), cache: "no-store" }
  );

  if (!res.ok) throw new TmdbError(`TMDB ${path} responded ${res.status}`);

  const detail = (await res.json()) as Record<string, unknown>;
  const voteAvg = detail.vote_average;
  return {
    voteAverage: typeof voteAvg === "number" && voteAvg > 0 ? voteAvg : null,
    rating: extractUsRating(detail, kind),
  };
}

// Fetches the full title detail so we can pull canonical genre names.
// Used by the backfill script for already-stored tmdb_ids.
export async function fetchGenresByTmdbId(
  tmdbId: number,
  kind: "movie" | "show"
): Promise<string[]> {
  const path = kind === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const res = await fetchWithRetry(`${TMDB_BASE}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new TmdbError(`TMDB ${path} responded ${res.status}`);
  }

  const data: { genres?: Array<{ name?: string }> } = await res.json();
  const names = (data.genres ?? [])
    .map((g) => g.name)
    .filter((n): n is string => Boolean(n));
  return Array.from(new Set(names));
}
