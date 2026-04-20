"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSignedUpload, createTitle } from "./actions";

type Status =
  | { phase: "idle" }
  | { phase: "uploading"; pct: number }
  | { phase: "saving" }
  | { phase: "error"; message: string };

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  async function readDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      v.src = url;
    });
  }

  async function extractFrame(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.crossOrigin = "anonymous";

      const cleanup = () => URL.revokeObjectURL(url);

      v.onloadedmetadata = () => {
        const seekTo = Number.isFinite(v.duration)
          ? Math.min(v.duration * 0.1, 10)
          : 1;
        v.currentTime = Math.max(seekTo, 0.1);
      };

      v.onseeked = () => {
        try {
          const max = 720;
          const ratio = Math.min(max / v.videoWidth, max / v.videoHeight, 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(v.videoWidth * ratio);
          canvas.height = Math.round(v.videoHeight * ratio);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            resolve(null);
            return;
          }
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            "image/jpeg",
            0.85
          );
        } catch {
          cleanup();
          resolve(null);
        }
      };

      v.onerror = () => {
        cleanup();
        resolve(null);
      };

      v.src = url;
    });
  }

  function uploadWithProgress(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setStatus({
            phase: "uploading",
            pct: Math.round((e.loaded / e.total) * 100),
          });
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.send(file);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus({ phase: "error", message: "Pick a video file first." });
      return;
    }

    const name = String(formData.get("name") ?? "").trim();
    const yearStr = String(formData.get("year") ?? "").trim();
    const kind = String(formData.get("kind") ?? "movie") as "movie" | "show";
    const overview = String(formData.get("overview") ?? "").trim();

    if (!name) {
      setStatus({ phase: "error", message: "Title is required." });
      return;
    }

    setStatus({ phase: "uploading", pct: 0 });

    const signed = await createSignedUpload(file.name, file.type || "video/mp4");
    if (!signed.ok) {
      setStatus({ phase: "error", message: signed.error });
      return;
    }

    try {
      await uploadWithProgress(signed.uploadUrl, file);
    } catch (err) {
      setStatus({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
      return;
    }

    setStatus({ phase: "saving" });
    const duration = await readDuration(file);

    let thumbnailUrl: string | null = null;
    const frame = await extractFrame(file).catch(() => null);
    if (frame) {
      const thumbName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      const signedThumb = await createSignedUpload(
        thumbName,
        "image/jpeg",
        "thumbnails"
      );
      if (signedThumb.ok) {
        const res = await fetch(signedThumb.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: frame,
        }).catch(() => null);
        if (res && res.ok) thumbnailUrl = signedThumb.publicUrl;
      }
    }

    const created = await createTitle({
      name,
      year: yearStr ? Number(yearStr) : null,
      kind,
      overview: overview || null,
      objectKey: signed.objectKey,
      durationSeconds: duration,
      thumbnailUrl,
    });

    if (!created.ok) {
      setStatus({ phase: "error", message: created.error });
      return;
    }

    router.push("/");
    router.refresh();
  }

  const busy = status.phase === "uploading" || status.phase === "saving";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Title</span>
        <input
          type="text"
          name="name"
          required
          disabled={busy}
          className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30 disabled:opacity-50"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Year</span>
          <input
            type="number"
            name="year"
            min={1900}
            max={2100}
            disabled={busy}
            className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-400">Kind</span>
          <select
            name="kind"
            disabled={busy}
            defaultValue="movie"
            className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30 disabled:opacity-50"
          >
            <option value="movie">Movie</option>
            <option value="show">TV Show</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Overview (optional)</span>
        <textarea
          name="overview"
          rows={3}
          disabled={busy}
          className="rounded border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/30 disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Video file (MP4 with H.264 + AAC)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          required
          disabled={busy}
          className="rounded border border-white/10 bg-white/5 px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-white disabled:opacity-50"
        />
      </label>

      {status.phase === "uploading" && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${status.pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">Uploading {status.pct}%…</p>
        </div>
      )}

      {status.phase === "saving" && (
        <p className="text-xs text-zinc-400">Saving to library…</p>
      )}

      {status.phase === "error" && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded bg-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Please wait…" : "Upload"}
      </button>
    </form>
  );
}
