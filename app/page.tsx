import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroBillboard } from "./HeroBillboard";
import { IntroAnimation } from "./components/IntroAnimation";

const FAMILY_SLIDES = [
  { src: "/family-2.jpg", position: "center 60%" },
  { src: "/family-1.jpg", position: "center 25%" },
  { src: "/family-3.jpg", position: "center 25%" },
  { src: "/family-4.jpg", position: "center 25%" },
  { src: "/family-5.jpg", position: "center 20%" },
  { src: "/family-6.jpg", position: "center 20%" },
  { src: "/family-7.jpg", position: "center 25%" },
  { src: "/family-8.jpg", position: "center" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const playIntro = welcome === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user!.id)
    .single();

  const { data: titles } = await supabase
    .from("titles")
    .select(
      "id, name, year, kind, overview, poster_url, backdrop_url, tmdb_id, created_at, duration_seconds, genres"
    )
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  const canUpload = profile?.role === "admin" || profile?.role === "uploader";
  const list = titles ?? [];

  const { data: history } = user
    ? await supabase
        .from("watch_history")
        .select("title_id, position_seconds, updated_at")
        .eq("profile_id", user.id)
        .eq("completed", false)
        .gt("position_seconds", 0)
        .is("episode_id", null)
        .order("updated_at", { ascending: false })
        .limit(10)
    : { data: null };

  const titleById = new Map(list.map((t) => [t.id, t]));
  const continueWatching = (history ?? [])
    .map((h) => {
      const t = titleById.get(h.title_id!);
      if (!t) return null;
      const pct =
        t.duration_seconds && t.duration_seconds > 0
          ? Math.min(100, (h.position_seconds / t.duration_seconds) * 100)
          : 0;
      return { title: t, positionSeconds: h.position_seconds, pct };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const famflixOriginals = list.filter((t) => t.tmdb_id == null);

  const byGenre = new Map<string, typeof list>();
  for (const t of list) {
    if (t.tmdb_id == null) continue;
    const primary = t.genres?.[0];
    if (!primary) continue;
    const bucket = byGenre.get(primary) ?? [];
    bucket.push(t);
    byGenre.set(primary, bucket);
  }
  const genreRows = Array.from(byGenre.entries())
    .filter(([, items]) => items.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  type Title = (typeof list)[number];
  const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const renderCard = (t: Title) => {
    const isNew =
      t.created_at &&
      Date.now() - new Date(t.created_at).getTime() < NEW_WINDOW_MS;
    return (
      <Link
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
          {isNew && (
            <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow">
              New
            </span>
          )}
        </div>
        <div className="mt-2 w-36 sm:w-44">
          <p className="truncate text-sm font-medium text-zinc-200">{t.name}</p>
          <p className="text-xs text-zinc-500">
            {t.year ?? ""} · {t.kind}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <main className="flex flex-1 flex-col">
      <IntroAnimation play={playIntro} />
      <HeroBillboard
        titles={list.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          kind: t.kind,
          overview: t.overview,
          backdrop_url: t.backdrop_url,
          tmdb_id: t.tmdb_id,
        }))}
        fallbackSlides={FAMILY_SLIDES}
        canUpload={canUpload}
      />

      {continueWatching.length > 0 && (
        <section className="-mt-16 px-6 pb-4 sm:px-12 sm:-mt-20 lg:px-20">
          <h2 className="mb-4 text-xl font-bold text-white">
            Continue Watching
          </h2>
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-4 sm:-mx-12 sm:px-12 lg:-mx-20 lg:px-20">
            {continueWatching.map(({ title: t, pct }) => (
              <Link
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
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 w-36 sm:w-44">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {t.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {Math.round(pct)}% watched
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section
        className={`${continueWatching.length > 0 ? "" : "-mt-16 sm:-mt-20"} px-6 pb-4 sm:px-12 lg:px-20`}
      >
        <h2 className="mb-4 text-xl font-bold text-white">Recently Added</h2>
        {list.length === 0 ? (
          <div className="rounded border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
            {canUpload ? (
              <>
                No titles yet.{" "}
                <Link href="/upload" className="text-white underline">
                  Upload one
                </Link>
                .
              </>
            ) : (
              "No titles yet. An admin needs to upload something."
            )}
          </div>
        ) : (
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-4 sm:-mx-12 sm:px-12 lg:-mx-20 lg:px-20">
            {list.map(renderCard)}
          </div>
        )}
      </section>

      {famflixOriginals.length > 0 && (
        <section className="px-6 pb-4 sm:px-12 lg:px-20">
          <h2 className="mb-4 text-xl font-bold text-white">
            <span className="text-accent">Famflix</span> Originals
          </h2>
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-4 sm:-mx-12 sm:px-12 lg:-mx-20 lg:px-20">
            {famflixOriginals.map(renderCard)}
          </div>
        </section>
      )}

      {genreRows.map(([genre, items]) => (
        <section key={genre} className="px-6 pb-4 sm:px-12 lg:px-20">
          <h2 className="mb-4 text-xl font-bold text-white">{genre}</h2>
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-4 sm:-mx-12 sm:px-12 lg:-mx-20 lg:px-20">
            {items.map(renderCard)}
          </div>
        </section>
      ))}

      <div className="pb-12" />
    </main>
  );
}
