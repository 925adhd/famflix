import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_AVATAR_SEEDS,
  avatarUrlFor,
  defaultAvatarUrl,
} from "@/lib/avatar";
import { updateDisplayName } from "./actions";
import { AvatarUploader } from "./AvatarUploader";
import { EmailField } from "./EmailField";

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
    <div className="flex flex-1 justify-center px-6 py-4 sm:px-12 sm:py-10">
      <div className="w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between sm:mb-6">
          <h1 className="text-xl font-semibold sm:text-2xl">Your profile</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        {saved && (
          <p className="mb-3 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 sm:mb-4">
            Saved.
          </p>
        )}
        {error && (
          <p className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:mb-4">
            {error}
          </p>
        )}

        <div className="mb-3 rounded border border-white/10 bg-white/5 p-3 sm:mb-8 sm:p-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 sm:mb-4 sm:text-sm">
            Avatar
          </h2>
          <AvatarUploader
            currentPreviewUrl={avatarUrlFor({
              id: user.id,
              avatar_url: profile?.avatar_url ?? null,
            })}
            defaultChoices={DEFAULT_AVATAR_SEEDS.map((seed) => ({
              seed,
              url: defaultAvatarUrl(seed),
            }))}
          />
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-3 sm:p-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 sm:mb-4 sm:text-sm">
            Details
          </h2>
          <form action={updateDisplayName} className="flex flex-col gap-2.5 sm:gap-4">
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
            <EmailField email={user.email ?? ""} />
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
              className="w-fit rounded bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:mt-2"
            >
              Save
            </button>
          </form>
        </div>

        <form action="/auth/sign-out" method="post" className="mt-4 sm:mt-8">
          <button
            type="submit"
            className="w-full rounded border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 sm:py-3"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
