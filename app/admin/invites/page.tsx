import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addInvite, removeInvite } from "./actions";

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
          <Link
            href="/"
            className="mt-4 inline-block rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Back home
          </Link>
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
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
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

        <div className="rounded border border-white/10 divide-y divide-white/5">
          {(invites ?? []).length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-500">
              No invites yet. Add an email above.
            </p>
          ) : (
            (invites ?? []).map((inv) => (
              <div
                key={inv.email}
                className="flex items-center justify-between p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-100">{inv.email}</p>
                  <p className="text-xs text-zinc-500">
                    {inv.used_at ? "Signed up" : "Pending"} ·{" "}
                    {new Date(inv.added_at).toLocaleDateString()}
                  </p>
                </div>
                <form action={removeInvite}>
                  <input type="hidden" name="email" value={inv.email} />
                  <button
                    type="submit"
                    className="rounded bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-red-500/20 hover:text-red-300"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
