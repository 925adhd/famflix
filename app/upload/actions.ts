"use server";

import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, publicUrlFor } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { findBestMatch } from "@/lib/tmdb";
import { getStorageUsage, formatBytes } from "@/lib/storage";
import { revalidatePath } from "next/cache";

type SignedUploadResult =
  | { ok: true; uploadUrl: string; objectKey: string; publicUrl: string }
  | { ok: false; error: string };

export async function createSignedUpload(
  filename: string,
  contentType: string,
  folder: "uploads" | "thumbnails" = "uploads",
  fileSizeBytes?: number
): Promise<SignedUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "uploader")) {
    return { ok: false, error: "You don't have permission to upload." };
  }

  if (folder === "uploads" && fileSizeBytes && fileSizeBytes > 0) {
    const usage = await getStorageUsage();
    if (fileSizeBytes > usage.remainingBytes) {
      return {
        ok: false,
        error: `Storage cap hit — ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.capBytes)} used. This file is ${formatBytes(fileSizeBytes)}; delete something first.`,
      };
    }
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `${folder}/${user.id}/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 60 }
  );

  return {
    ok: true,
    uploadUrl,
    objectKey,
    publicUrl: publicUrlFor(objectKey),
  };
}

type CreateTitleInput = {
  name: string;
  year: number | null;
  kind: "movie" | "show";
  overview: string | null;
  objectKey: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  fileSizeBytes: number | null;
};

export async function createTitle(input: CreateTitleInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const match = await findBestMatch(input.name, input.kind, input.year).catch(
    () => null
  );

  const { data, error } = await supabase
    .from("titles")
    .insert({
      name: input.name,
      year: input.year ?? match?.year ?? null,
      kind: input.kind,
      overview: input.overview ?? match?.overview ?? null,
      poster_url: match?.posterUrl ?? input.thumbnailUrl ?? null,
      backdrop_url: match?.backdropUrl ?? input.thumbnailUrl ?? null,
      tmdb_id: match?.tmdbId ?? null,
      genres: match?.genres?.length ? match.genres : null,
      tmdb_score: match?.voteAverage ?? null,
      rating: match?.rating ?? null,
      r2_object_key: input.objectKey,
      duration_seconds: input.durationSeconds,
      file_size_bytes: input.fileSizeBytes,
      uploaded_by: user.id,
      status: "ready",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, titleId: data.id };
}

export async function renameTitle(titleId: string, newName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const trimmed = newName.trim();
  if (!trimmed) return { ok: false as const, error: "Title can't be empty." };
  if (trimmed.length > 200)
    return { ok: false as const, error: "Title is too long." };

  const { data: existing } = await supabase
    .from("titles")
    .select("uploaded_by")
    .eq("id", titleId)
    .single();
  if (!existing) return { ok: false as const, error: "Title not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canEdit =
    existing.uploaded_by === user.id || profile?.role === "admin";
  if (!canEdit) return { ok: false as const, error: "Not allowed." };

  const { error } = await supabase
    .from("titles")
    .update({ name: trimmed })
    .eq("id", titleId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/title/${titleId}`);
  revalidatePath("/");
  return { ok: true as const, name: trimmed };
}

export async function markCreditsStart(
  titleId: string,
  seconds: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0)) {
    return { ok: false as const, error: "Invalid timestamp." };
  }

  const { data: existing } = await supabase
    .from("titles")
    .select("uploaded_by")
    .eq("id", titleId)
    .single();
  if (!existing) return { ok: false as const, error: "Title not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canEdit =
    existing.uploaded_by === user.id || profile?.role === "admin";
  if (!canEdit) return { ok: false as const, error: "Not allowed." };

  const value = seconds === null ? null : Math.round(seconds);
  const { error } = await supabase
    .from("titles")
    .update({ credits_start_seconds: value })
    .eq("id", titleId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/title/${titleId}`);
  return { ok: true as const, seconds: value };
}

export async function refetchMetadata(titleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("titles")
    .select("name, year, kind, uploaded_by")
    .eq("id", titleId)
    .single();
  if (!existing) return { ok: false as const, error: "Title not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canEdit =
    existing.uploaded_by === user.id || profile?.role === "admin";
  if (!canEdit) return { ok: false as const, error: "Not allowed." };

  let match;
  try {
    match = await findBestMatch(
      existing.name,
      existing.kind as "movie" | "show",
      existing.year
    );
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "TMDB lookup failed.",
    };
  }

  if (!match) {
    return {
      ok: false as const,
      error: `No TMDB result for "${existing.name}"${existing.year ? ` (${existing.year})` : ""}. Try a different year or check the spelling.`,
    };
  }

  const { error } = await supabase
    .from("titles")
    .update({
      overview: match.overview,
      poster_url: match.posterUrl,
      backdrop_url: match.backdropUrl,
      tmdb_id: match.tmdbId,
      genres: match.genres.length ? match.genres : null,
      tmdb_score: match.voteAverage,
      rating: match.rating,
      year: existing.year ?? match.year,
    })
    .eq("id", titleId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/title/${titleId}`);
  revalidatePath("/");
  return { ok: true as const };
}
