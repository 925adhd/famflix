import { createClient } from "@/lib/supabase/server";
import { SearchInput } from "./SearchInput";
import { DemoLink } from "@/app/components/DemoLink";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();

  let titles: Array<{
    id: string;
    name: string;
    year: number | null;
    kind: string;
    poster_url: string | null;
  }> = [];

  if (query) {
    const { data } = await supabase
      .from("titles")
      .select("id, name, year, kind, poster_url")
      .eq("status", "ready")
      .ilike("name", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(60);
    titles = data ?? [];
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-10 sm:px-12 lg:px-20">
      <div className="w-full max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold">Search</h1>
        <SearchInput initial={query} />

        <div className="mt-8">
          {!query ? (
            <p className="text-sm text-zinc-500">
              Start typing to find a title.
            </p>
          ) : titles.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No titles match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-zinc-500">
                {titles.length} result{titles.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {titles.map((t) => (
                  <DemoLink
                    key={t.id}
                    href={`/title/${t.id}`}
                    className="group flex flex-col gap-2"
                  >
                    <div
                      className="aspect-[2/3] w-full overflow-hidden rounded bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/5 transition group-hover:ring-white/30"
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
                  </DemoLink>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
