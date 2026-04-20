import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavItem } from "./NavItem";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const canUpload = isAdmin || profile?.role === "uploader";
  const initial = (profile?.display_name ?? user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center gap-5 border-r border-white/5 bg-black/80 py-6 backdrop-blur md:flex">
      <Link
        href="/"
        className="mb-6 flex h-10 w-10 items-center justify-center rounded text-lg font-black text-accent"
        aria-label="Home"
      >
        F
      </Link>

      <NavItem
        href="/"
        label="Home"
        icon={
          <svg {...iconProps}>
            <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
          </svg>
        }
      />
      <NavItem
        href="/search"
        label="Search"
        icon={
          <svg {...iconProps}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />
      {canUpload && (
        <NavItem
          href="/upload"
          label="Upload"
          icon={
            <svg {...iconProps}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          }
        />
      )}
      {isAdmin && (
        <NavItem
          href="/admin/invites"
          label="Invites"
          icon={
            <svg {...iconProps}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />
      )}

      <div className="flex-1" />

      <Link
        href="/profile"
        title="Profile"
        aria-label="Profile"
        className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-sm font-semibold text-white ring-1 ring-white/10 hover:ring-white/40"
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
          title="Sign out"
          aria-label="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <svg {...iconProps}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
