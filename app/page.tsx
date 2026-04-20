import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, name, year, kind, poster_url")
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  const canUpload = profile?.role === "admin" || profile?.role === "uploader";
  const list = titles ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-12 lg:px-20">
        <Link href="/" className="text-lg font-semibold tracking-wide text-accent">
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
          <span>
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

      <section className="relative flex min-h-[50vh] flex-col items-start justify-end gap-6 overflow-hidden px-6 pb-16 pt-16 sm:px-12 lg:px-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-black to-transparent" />
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Your family library.
        </h1>
        <p className="max-w-xl text-lg text-zinc-300">
          {list.length > 0
            ? `${list.length} title${list.length === 1 ? "" : "s"} ready to watch.`
            : "Nothing here yet. Upload the first one."}
        </p>
      </section>

      <section className="px-6 py-8 sm:px-12 lg:px-20">
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">
          Recently Added
        </h2>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {list.map((t) => (
              <Link
                key={t.id}
                href={`/title/${t.id}`}
                className="group flex flex-col gap-2"
              >
                <div
                  className="aspect-[2/3] w-full overflow-hidden rounded-md bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/5 transition group-hover:ring-white/30"
                  style={
                    t.poster_url
                      ? {
                          backgroundImage: `url(${t.poster_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div>
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
