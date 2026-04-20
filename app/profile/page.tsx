import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateDisplayName } from "./actions";
import { AvatarUploader } from "./AvatarUploader";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 justify-center px-6 py-10 sm:px-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        {saved && (
          <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Saved.
          </p>
        )}
        {error && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mb-8 rounded border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Avatar
          </h2>
          <AvatarUploader currentUrl={profile?.avatar_url ?? null} />
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Details
          </h2>
          <form action={updateDisplayName} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Display name</span>
              <input
                type="text"
                name="display_name"
                defaultValue={profile?.display_name ?? ""}
                required
                className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Email</span>
              <input
                type="text"
                value={user.email ?? ""}
                disabled
                className="rounded border border-white/5 bg-white/[0.02] px-3 py-2 text-zinc-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Role</span>
              <input
                type="text"
                value={profile?.role ?? "viewer"}
                disabled
                className="rounded border border-white/5 bg-white/[0.02] px-3 py-2 text-zinc-500"
              />
            </label>
            <button
              type="submit"
              className="mt-2 w-fit rounded bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
