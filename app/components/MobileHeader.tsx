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
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const initial = (profile?.display_name ?? user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-3 md:hidden">
      <Link href="/" className="text-lg font-black tracking-tight text-accent">
        FAMFLIX
      </Link>
      <Link
        href="/profile"
        aria-label="Profile"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10"
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
    </header>
  );
}
