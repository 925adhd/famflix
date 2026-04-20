import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Upload a title</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Back
          </Link>
        </div>

        <p className="mb-6 text-sm text-zinc-400">
          Upload an MP4 with H.264 video and AAC audio for best playback across
          devices. Browsers can&apos;t play .mkv or most exotic codecs — convert
          with HandBrake first (Fast 1080p30 preset).
        </p>

        <UploadForm />
      </div>
    </div>
  );
}
