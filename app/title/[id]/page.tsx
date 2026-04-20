import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicUrlFor } from "@/lib/r2";
import { refetchMetadata } from "@/app/upload/actions";

export default async function TitlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: title } = await supabase
    .from("titles")
    .select(
      "id, name, year, kind, overview, poster_url, backdrop_url, r2_object_key, duration_seconds, status"
    )
    .eq("id", id)
    .single();

  if (!title || !title.r2_object_key) notFound();

  const videoUrl = publicUrlFor(title.r2_object_key);

  async function fetchMetadata() {
    "use server";
    await refetchMetadata(id);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-12 lg:px-20">
        <Link href="/" className="text-lg font-semibold tracking-wide text-accent">
          FAMFLIX
        </Link>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Library
        </Link>
      </header>

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
        <div className="overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
            src={videoUrl}
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
              <div>
                <h1 className="text-3xl font-semibold">{title.name}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {title.year ?? ""} · {title.kind}
                  {title.duration_seconds
                    ? ` · ${Math.round(title.duration_seconds / 60)} min`
                    : ""}
                </p>
              </div>
              {!title.poster_url && (
                <form action={fetchMetadata}>
                  <button
                    type="submit"
                    className="rounded bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    Fetch metadata
                  </button>
                </form>
              )}
            </div>
            {title.overview && (
              <p className="mt-4 max-w-2xl text-zinc-300">{title.overview}</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
