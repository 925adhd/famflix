import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroBillboard } from "./HeroBillboard";

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

export default async function Home() {
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
    .select("id, name, year, kind, overview, poster_url, backdrop_url")
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  const canUpload = profile?.role === "admin" || profile?.role === "uploader";
  const list = titles ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-6 py-4 backdrop-blur-[2px] sm:px-12 lg:px-20">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-accent"
          style={{ letterSpacing: "-0.02em" }}
        >
          FAMFLIX
        </Link>
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          {canUpload && (
            <Link
              href="/upload"
              className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              + Upload
            </Link>
          )}
          <span className="hidden sm:inline">
            Hi,{" "}
            <span className="text-white">
              {profile?.display_name ?? user?.email}
            </span>
          </span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <HeroBillboard
        titles={list.map((t) => ({
          id: t.id,
          name: t.name,
          year: t.year,
          kind: t.kind,
          overview: t.overview,
          backdrop_url: t.backdrop_url,
        }))}
        fallbackSlides={FAMILY_SLIDES}
        canUpload={canUpload}
      />

      <section className="-mt-16 px-6 pb-16 sm:px-12 sm:-mt-20 lg:px-20">
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
            {list.map((t) => (
              <Link
                key={t.id}
                href={`/title/${t.id}`}
                className="group relative shrink-0 transition-transform duration-300 hover:z-10 hover:scale-110"
              >
                <div
                  className="aspect-[2/3] w-36 overflow-hidden rounded bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/5 transition group-hover:ring-white/50 sm:w-44"
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
