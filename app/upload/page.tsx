import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStorageUsage, formatBytes } from "@/lib/storage";
import { UploadForm } from "./UploadForm";

export default async function UploadPage() {
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

  if (!profile || (profile.role !== "admin" && profile.role !== "uploader")) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-black/60 p-8 text-center backdrop-blur">
          <h1 className="mb-2 text-xl font-semibold">Upload not available</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Ask an admin to give your account the uploader role.
          </p>
          <Link
            href="/"
            className="inline-block rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const usage = await getStorageUsage();
  const pct = Math.min(100, Math.round(usage.percentUsed));
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <div className="flex flex-1 justify-center px-6 py-4 sm:py-12">
      <div className="w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between sm:mb-6">
          <h1 className="text-xl font-semibold sm:text-2xl">Upload a title</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        <div className="mb-3 rounded border border-white/10 bg-white/5 p-3 sm:mb-6 sm:p-4">
          <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-zinc-300">Library storage</span>
            <span className="text-zinc-400">
              {formatBytes(usage.usedBytes)} / {formatBytes(usage.capBytes)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-white/10 sm:h-2">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500 sm:mt-2 sm:text-xs">
            {formatBytes(usage.remainingBytes)} remaining
          </p>
        </div>

        <UploadForm />
      </div>
    </div>
  );
}
