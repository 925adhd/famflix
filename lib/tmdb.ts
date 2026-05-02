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
};

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
    genres: mapGenreIds(first.genre_ids, kind),
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
