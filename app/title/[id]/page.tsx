import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicUrlFor } from "@/lib/r2";
import { refetchMetadata } from "@/app/upload/actions";
import {
  fetchRecommendations,
  fetchMovieCollectionId,
  fetchCollectionParts,
} from "@/lib/tmdb";
import { VideoPlayer } from "./VideoPlayer";
import { TitleNameEditor } from "./TitleNameEditor";
import { DemoLink } from "@/app/components/DemoLink";
import { ScrollableRow } from "@/app/components/ScrollableRow";

export default async function TitlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ meta?: string; message?: string; autoplay?: string }>;
}) {
  const { id } = await params;
  const { meta, message, autoplay } = await searchParams;
  const shouldAutoplay = autoplay === "1";
  const supabase = await createClient();

  const { data: title } = await supabase
    .from("titles")
    .select(
      "id, name, year, kind, overview, poster_url, backdrop_url, tmdb_id, r2_object_key, duration_seconds, status, uploaded_by, genres, credits_start_seconds, rating, tmdb_score"
    )
    .eq("id", id)
    .single();

  if (!title || !title.r2_object_key) notFound();

  const { data: others } = await supabase
    .from("titles")
    .select("id, name, year, kind, poster_url, genres, tmdb_id")
    .eq("status", "ready")
    .neq("id", id);

  const recommendedIds = title.tmdb_id
    ? await fetchRecommendations(
        title.tmdb_id,
        title.kind as "movie" | "show"
      ).catch(() => [])
    : [];

  const SIMILAR_LIMIT = 12;
  const othersList = others ?? [];
  type OtherTitle = (typeof othersList)[number];
  const byTmdbId = new Map<number, OtherTitle>();
  for (const t of othersList) {
    if (typeof t.tmdb_id === "number") byTmdbId.set(t.tmdb_id, t);
  }

  const similarTitles = recommendedIds
    .map((rid) => byTmdbId.get(rid))
    .filter((t): t is OtherTitle => Boolean(t))
    .slice(0, SIMILAR_LIMIT);

  let nextUp: { id: string; name: string; poster_url: string | null } | null =
    null;

  if (title.kind === "movie" && title.tmdb_id && title.year) {
    const collectionId = await fetchMovieCollectionId(title.tmdb_id).catch(
      () => null
    );
    if (collectionId) {
      const parts = await fetchCollectionParts(collectionId).catch(() => []);
      const nextPart = parts
        .filter((p) => p.year !== null && p.year > title.year!)
        .sort((a, b) => a.year! - b.year!)
        .find((p) => byTmdbId.has(p.id));
      if (nextPart) {
        const t = byTmdbId.get(nextPart.id);
        if (t) nextUp = { id: t.id, name: t.name, poster_url: t.poster_url };
      }
    }
  }

  if (!nextUp && similarTitles.length > 0) {
    const first = similarTitles[0];
    nextUp = { id: first.id, name: first.name, poster_url: first.poster_url };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const canEdit =
    !!user &&
    (title.uploaded_by === user.id || profile?.role === "admin");

  const { data: watch } = user
    ? await supabase
        .from("watch_history")
        .select("position_seconds")
        .eq("profile_id", user.id)
        .eq("title_id", id)
        .is("episode_id", null)
        .maybeSingle()
    : { data: null };

  const initialPositionSeconds = shouldAutoplay
    ? 0
    : (watch?.position_seconds ?? 0);

  const videoUrl = publicUrlFor(title.r2_object_key);

  async function fetchMetadata() {
    "use server";
    const result = await refetchMetadata(id);
    if (!result.ok) {
      redirect(`/title/${id}?meta=failed&message=${encodeURIComponent(result.error)}`);
    }
    redirect(`/title/${id}?meta=ok`);
  }

  return (
    <main className="flex flex-1 flex-col">
      {title.backdrop_url && (
        <div
          className="absolute inset-x-0 top-0 -z-10 h-[60vh] opacity-30"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent, #0b0b0f 90%), url(${title.backdrop_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-4 sm:px-12">
        {meta === "ok" && (
          <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Metadata refreshed from TMDB.
          </p>
        )}
        {meta === "failed" && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Couldn&apos;t fetch from TMDB: {message ?? "unknown error"}
          </p>
        )}

        <div className="overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
          <VideoPlayer
            src={videoUrl}
            titleId={id}
            initialPositionSeconds={initialPositionSeconds}
            nextUp={nextUp}
            autoPlay={shouldAutoplay}
            creditsStartSeconds={title.credits_start_seconds ?? null}
            canEdit={canEdit}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          {title.poster_url && (
            <div
              className="hidden aspect-[2/3] w-40 shrink-0 rounded-md bg-zinc-900 ring-1 ring-white/5 sm:block"
              style={{
                backgroundImage: `url(${title.poster_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <TitleNameEditor
                  titleId={title.id}
                  initialName={title.name}
                  canEdit={canEdit}
                />
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
                  {title.year && <span>{title.year}</span>}
                  <span>·</span>
                  <span>{title.kind}</span>
                  {title.duration_seconds && (
                    <>
                      <span>·</span>
                      <span>{Math.round(title.duration_seconds / 60)} min</span>
                    </>
                  )}
                  {title.rating && (
                    <>
                      <span>·</span>
                      <span className="rounded border border-white/20 px-1.5 py-0.5 text-xs font-semibold text-zinc-200">
                        {title.rating}
                      </span>
                    </>
                  )}
                  {title.tmdb_score !== null && title.tmdb_score !== undefined && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-zinc-200">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3.5 w-3.5 text-amber-400"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                        </svg>
                        {title.tmdb_score.toFixed(1)}
                      </span>
                    </>
                  )}
                </p>
              </div>
              {canEdit && (
                <form action={fetchMetadata}>
                  <button
                    type="submit"
                    aria-label={
                      title.tmdb_id ? "Refresh metadata" : "Fetch metadata"
                    }
                    title={
                      title.tmdb_id ? "Refresh metadata" : "Fetch metadata"
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                    </svg>
                  </button>
                </form>
              )}
            </div>
            {title.overview && (
              <p className="mt-4 max-w-2xl text-zinc-300">{title.overview}</p>
            )}
          </div>
        </div>

        {similarTitles.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold text-white">More Like This</h2>
            <ScrollableRow>
              {similarTitles.map((t) => (
                <DemoLink
                  key={t.id}
                  href={`/title/${t.id}`}
                  className="group relative shrink-0 transition-transform duration-300 hover:z-10 hover:scale-110"
                >
                  <div
                    className="relative aspect-[2/3] w-36 overflow-hidden rounded bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/5 transition group-hover:ring-white/50 sm:w-44"
                    style={
                      t.poster_url
                        ? {
                            backgroundImage: `url(${t.poster_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  >
                    {!t.poster_url && (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-400">
                        {t.name}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 w-36 sm:w-44">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {t.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t.year ?? ""} · {t.kind}
                    </p>
                  </div>
                </DemoLink>
              ))}
            </ScrollableRow>
          </div>
        )}
      </section>
    </main>
  );
}
