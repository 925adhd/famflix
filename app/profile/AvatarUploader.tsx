"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSignedAvatarUpload, setAvatarUrl } from "./actions";

export function AvatarUploader({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(file));

    const signed = await createSignedAvatarUpload(file.type);
    if (!signed.ok) {
      setError(signed.error);
      setBusy(false);
      return;
    }

    const res = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    }).catch(() => null);

    if (!res || !res.ok) {
      setError("Upload failed. Try again.");
      setBusy(false);
      return;
    }

    const save = await setAvatarUrl(signed.publicUrl);
    if (!save.ok) {
      setError(save.error);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-5">
      <div
        className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-white/10"
        style={
          preview
            ? {
                backgroundImage: `url(${preview})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? "Uploading…" : preview ? "Change avatar" : "Upload avatar"}
        </button>
        <p className="text-xs text-zinc-500">JPG, PNG, or WebP · max 5 MB</p>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>
    </div>
  );
}
