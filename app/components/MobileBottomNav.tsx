import { createClient } from "@/lib/supabase/server";
import { BottomTab } from "./BottomTab";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

export async function MobileBottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const canUpload = isAdmin || profile?.role === "uploader";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-black/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <BottomTab
        href="/"
        label="Home"
        icon={
          <svg {...iconProps}>
            <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
          </svg>
        }
      />
      <BottomTab
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
        <BottomTab
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
        <BottomTab
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
      <BottomTab
        href="/profile"
        label="Me"
        icon={
          <svg {...iconProps}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        }
      />
    </nav>
  );
}
