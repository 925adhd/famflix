import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function MobileHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const canUpload = isAdmin || profile?.role === "uploader";
  const initial = (profile?.display_name ?? user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 py-3 md:hidden">
      <Link
        href="/"
        className="text-lg font-black tracking-tight text-accent"
      >
        FAMFLIX
      </Link>
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white hover:bg-white/20"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
        {canUpload && (
          <Link
            href="/upload"
            className="rounded bg-accent px-2 py-1 font-semibold text-white"
          >
            + Upload
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/invites"
            className="rounded bg-white/10 px-2 py-1 text-white"
          >
            Invites
          </Link>
        )}
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10"
          style={
            profile?.avatar_url
              ? {
                  backgroundImage: `url(${profile.avatar_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {!profile?.avatar_url && initial}
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="rounded bg-white/10 px-2 py-1 text-white"
          >
            Out
          </button>
        </form>
      </div>
    </header>
  );
}
