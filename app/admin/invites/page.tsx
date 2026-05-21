import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addInvite, removeInvite } from "./actions";
import { InvitesList } from "./InvitesList";
import { DemoLink } from "@/app/components/DemoLink";

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string; removed?: string }>;
}) {
  const { error, added, removed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-black/60 p-8 text-center backdrop-blur">
          <h1 className="mb-2 text-xl font-semibold">Admins only</h1>
          <DemoLink
            href="/"
            className="mt-4 inline-block rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Back home
          </DemoLink>
        </div>
      </div>
    );
  }

  const { data: invites } = await supabase
    .from("invited_emails")
    .select("email, added_at, used_at")
    .order("added_at", { ascending: false });

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invited emails</h1>
          <DemoLink href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </DemoLink>
        </div>

        <p className="mb-6 text-sm text-zinc-400">
          Only emails on this list can sign up. Share the{" "}
          <span className="font-mono text-zinc-200">/sign-up</span> link with
          family members after adding them here.
        </p>

        {error && (
          <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {added && (
          <p className="mb-4 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Invited {added}.
          </p>
        )}
        {removed && (
          <p className="mb-4 rounded border border-zinc-500/40 bg-zinc-500/10 px-3 py-2 text-sm text-zinc-300">
            Removed {removed}.
          </p>
        )}

        <form action={addInvite} className="mb-8 flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="cousin@example.com"
            className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Invite
          </button>
        </form>

        <InvitesList invites={invites ?? []} removeInvite={removeInvite} />
      </div>
    </div>
  );
}
