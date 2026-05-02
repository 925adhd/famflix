"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSignedAvatarUpload,
  setAvatarUrl,
  setDefaultAvatar,
} from "./actions";

type DefaultChoice = { seed: string; url: string };

export function AvatarUploader({
  currentPreviewUrl,
  defaultChoices,
}: {
  currentPreviewUrl: string;
  defaultChoices: DefaultChoice[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>(currentPreviewUrl);

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

  async function pickDefault(choice: DefaultChoice) {
    setError(null);
    setBusy(true);
    setPreview(choice.url);
    const res = await setDefaultAvatar(choice.seed);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center gap-4 sm:gap-5">
        <div
          className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10 sm:h-24 sm:w-24"
          style={{
            backgroundImage: `url(${preview})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Upload your own"}
          </button>
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

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
          Or pick a default
        </p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12 sm:gap-3">
          {defaultChoices.map((c) => {
            const isSelected = preview === c.url;
            return (
              <button
                key={c.seed}
                type="button"
                onClick={() => pickDefault(c)}
                disabled={busy}
                aria-label={`Use ${c.seed} avatar`}
                aria-pressed={isSelected}
                className={`aspect-square overflow-hidden rounded-full bg-zinc-800 ring-2 transition disabled:opacity-50 ${
                  isSelected
                    ? "ring-white"
                    : "ring-transparent hover:ring-white/40"
                }`}
                style={{
                  backgroundImage: `url(${c.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
