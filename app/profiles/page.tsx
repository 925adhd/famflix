import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarUrlFor } from "@/lib/avatar";
import { DemoLink } from "@/app/components/DemoLink";

type ProfileCard = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  const demoMode = demo === "1";
  const homeHref = demoMode ? "/?welcome=1&demo=1" : "/?welcome=1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .order("created_at", { ascending: true });

  const all: ProfileCard[] = profiles ?? [];
  const me = all.find((p) => p.id === user.id);
  const others = all.filter((p) => p.id !== user.id);
  const ordered: ProfileCard[] = me ? [me, ...others] : others;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-black">
      <header className="flex items-center justify-between px-6 py-5 sm:px-12 sm:py-6">
        <DemoLink href="/" aria-label="Famflix">
          <Image
            src="/loogo.png"
            alt="Famflix"
            width={238}
            height={85}
            priority
            className="h-9 w-auto sm:h-11"
          />
        </DemoLink>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="text-sm text-zinc-400 transition hover:text-white sm:text-base"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <h1 className="mb-10 text-center text-3xl font-medium text-white sm:mb-14 sm:text-5xl">
          Who&apos;s watching?
        </h1>

        <ul className="flex flex-wrap justify-center gap-4 sm:gap-8">
          {ordered.map((p) => {
            const isMe = p.id === user.id;
            const tile = (
              <>
                <div
                  className="h-28 w-28 overflow-hidden rounded-md bg-zinc-800 ring-2 ring-transparent transition will-change-transform group-hover:ring-white sm:h-40 sm:w-40"
                  style={{
                    backgroundImage: `url(${avatarUrlFor(p)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "translateZ(0)",
                  }}
                />
                <span className="text-sm text-zinc-400 transition group-hover:text-white sm:text-base">
                  {p.display_name}
                </span>
              </>
            );

            return (
              <li key={p.id}>
                {isMe ? (
                  <DemoLink
                    href={homeHref}
                    className="group flex flex-col items-center gap-2 sm:gap-3"
                  >
                    {tile}
                  </DemoLink>
                ) : (
                  <div
                    aria-disabled="true"
                    className="group flex flex-col items-center gap-2 sm:gap-3"
                  >
                    {tile}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <DemoLink
          href="/profile?from=picker"
          className="mt-12 rounded border border-zinc-600 px-5 py-2 text-sm tracking-wide text-zinc-400 transition hover:border-white hover:text-white sm:mt-16 sm:px-7 sm:py-2.5 sm:text-base"
        >
          Manage Profile
        </DemoLink>
      </main>
    </div>
  );
}
