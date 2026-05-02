import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarUrlFor } from "@/lib/avatar";

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

  const avatarSrc = avatarUrlFor({ id: user.id, avatar_url: profile?.avatar_url });

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-3 md:hidden">
      <Link href="/" aria-label="Famflix">
        <Image
          src="/loogo.png"
          alt="Famflix"
          width={238}
          height={85}
          priority
          className="h-7 w-auto"
        />
      </Link>
      <Link
        href="/profile"
        aria-label="Profile"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/10"
        style={{
          backgroundImage: `url(${avatarSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

    </header>
  );
}
